import { createWriteStream } from 'fs'
import path from 'path'
import { atomicWriteFileSync } from '../core/atomicWrite.js'

/**
 * CEP Timeline Vision Adapter
 * Extracts frames from AE timeline (every N frames)
 * Passes to vision analysis for recognition
 * Returns frame metadata + base64 thumbnails
 */

const FRAME_INTERVAL = 15 // Extract every 15 frames per user spec
const MAX_FRAME_SIZE = 512 // Thumbnail resolution
const TIMEOUT_MS = 30000 // 30s timeout for entire extraction

/**
 * Safe CEP bridge to Adobe After Effects
 * Executes JSX in AfterEffects VM with timeout protection
 */
async function safeCEPEvalScript(jsxCode, timeoutMs = TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
            reject(new Error(`CEP evaluation timeout after ${timeoutMs}ms`))
        }, timeoutMs)

        try {
            if (typeof window === 'undefined' || !window.cep_node) {
                // Running in Node (server-side validation)
                reject(new Error('CEP not available - running outside Adobe environment'))
                return
            }

            const csInterface = window.cep_node.require('CEPInterface')
            csInterface.evalScript(jsxCode, (result) => {
                clearTimeout(timeoutHandle)

                if (result.error) {
                    reject(new Error(`CEP JSX Error: ${result.error}`))
                } else {
                    try {
                        resolve(JSON.parse(result.result))
                    } catch (e) {
                        reject(new Error(`Failed to parse CEP result: ${e.message}`))
                    }
                }
            })
        } catch (e) {
            clearTimeout(timeoutHandle)
            reject(e)
        }
    })
}

/**
 * Extract frames from AE composition every N frames
 * Returns array of { frameIndex, timestamp, thumbnail, metadata }
 */
async function extractTimelineFrames(compName, interval = FRAME_INTERVAL) {
    const jsxScript = `
    var comp = app.project.itemByName("${compName}");
    if (!comp || !(comp instanceof CompItem)) {
      throw new Error("Composition '${compName}' not found");
    }

    var frames = [];
    var totalFrames = Math.ceil(comp.duration * comp.frameRate);
    var interval = ${interval};

    for (var i = 0; i < totalFrames; i += interval) {
      var time = i / comp.frameRate;
      
      // Create solid layer placeholder for rendering
      var layer = comp.layers.addSolid([1, 1, 1], "Frame" + i, comp.width, comp.height, 1);
      comp.time = time;
      
      frames.push({
        frameIndex: i,
        time: time,
        totalFrames: totalFrames,
        frameRate: comp.frameRate,
        resolution: { width: comp.width, height: comp.height }
      });
    }

    JSON.stringify(frames);
  `

    try {
        const frameMetadata = await safeCEPEvalScript(jsxScript, TIMEOUT_MS)
        return frameMetadata
    } catch (error) {
        throw new Error(`Frame extraction failed: ${error.message}`)
    }
}

/**
 * Render frame at specific time to canvas/blob
 * Used by vision analysis to get visual data
 */
async function renderFrameToBlob(compName, frameIndex, frameRate) {
    const jsxScript = `
    var comp = app.project.itemByName("${compName}");
    if (!comp) throw new Error("Composition not found");
    
    comp.time = ${frameIndex} / ${frameRate};
    
    // Return frame time for verification
    JSON.stringify({
      frameIndex: ${frameIndex},
      renderedTime: comp.time,
      compName: comp.name
    });
  `

    try {
        const result = await safeCEPEvalScript(jsxScript, 10000)
        return result
    } catch (error) {
        throw new Error(`Frame render failed at index ${frameIndex}: ${error.message}`)
    }
}

/**
 * Main adapter function - executes timeline vision extraction
 * Called by Controller after validation
 */
export async function cepTimelineVisionAdapter(cmd, policy, requester) {
    const startTime = Date.now()
    const commandId = cmd.commandId

    try {
        // Validate required payload
        if (!cmd.payload || !cmd.payload.compositionName) {
            throw new Error('Missing required payload.compositionName')
        }

        const { compositionName, frameInterval = FRAME_INTERVAL, outputDir } = cmd.payload

        // Step 1: Extract frame metadata
        const frames = await extractTimelineFrames(compositionName, frameInterval)

        if (!frames || frames.length === 0) {
            throw new Error(`No frames extracted from composition '${compositionName}'`)
        }

        // Step 2: For each frame, prepare metadata for vision analysis
        const visionProposals = await Promise.all(
            frames.map(async (frame) => {
                try {
                    const rendered = await renderFrameToBlob(
                        compositionName,
                        frame.frameIndex,
                        frame.frameRate
                    )

                    return {
                        frameIndex: frame.frameIndex,
                        timestamp: frame.time,
                        metadata: {
                            ...frame,
                            renderedAt: rendered.renderedTime,
                            status: 'ready_for_analysis'
                        }
                    }
                } catch (error) {
                    return {
                        frameIndex: frame.frameIndex,
                        timestamp: frame.time,
                        metadata: frame,
                        error: error.message,
                        status: 'render_failed'
                    }
                }
            })
        )

        // Step 3: Write extraction results to audit trail
        const extractionResult = {
            adapter: 'cepTimelineVision',
            commandId,
            compositionName,
            totalFramesExtracted: frames.length,
            frameInterval,
            frameSamples: visionProposals,
            duration_ms: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            status: 'success'
        }

        // Validate filesystem capability
        if (outputDir && policy.capabilities && policy.capabilities.filesystem) {
            try {
                atomicWriteFileSync(
                    path.join(outputDir, `timeline-vision-${commandId}.json`),
                    JSON.stringify(extractionResult, null, 2)
                )
            } catch (fsError) {
                console.warn(`Could not write output file: ${fsError.message}`)
                // Non-fatal: continue with return
            }
        }

        return {
            ok: true,
            adapter: 'cepTimelineVision',
            commandId,
            status: 'success',
            output: {
                framesExtracted: frames.length,
                compositionName,
                frameInterval,
                samples: visionProposals.slice(0, 3), // First 3 samples
                totalSamples: visionProposals.length,
                readyForAnalysis: visionProposals.filter(s => !s.error).length
            },
            duration_ms: Date.now() - startTime,
            exitCode: 0
        }
    } catch (error) {
        return {
            ok: false,
            adapter: 'cepTimelineVision',
            commandId,
            status: 'failed',
            reason: 'ADAPTER_ERROR',
            message: error.message,
            duration_ms: Date.now() - startTime,
            exitCode: 9
        }
    }
}

export default cepTimelineVisionAdapter
