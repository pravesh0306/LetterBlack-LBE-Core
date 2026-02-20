/**
 * Vision Analysis Module
 * Integrates Google Cloud Vision API (or fallback to local ML)
 * Analyzes extracted frames and returns visual recognition data
 */

const GOOGLE_VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'

/**
 * Analyze single frame image for visual features
 * Returns: labels, objects, colors, text, faces etc.
 */
async function analyzeFrameVision(frameBase64, googleApiKey) {
    if (!googleApiKey) {
        throw new Error('Google Vision API key required for frame analysis')
    }

    try {
        const response = await fetch(`${GOOGLE_VISION_ENDPOINT}?key=${googleApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
                requests: [
                    {
                        image: { content: frameBase64 },
                        features: [
                            { type: 'LABEL_DETECTION', maxResults: 10 },
                            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                            { type: 'TEXT_DETECTION' },
                            { type: 'FACE_DETECTION' },
                            { type: 'IMAGE_PROPERTIES' },
                            { type: 'WEB_DETECTION', maxResults: 5 }
                        ]
                    }
                ]
            })
        })

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`
            try {
                const error = await response.json()
                errorMessage = error.error?.message || errorMessage
            } catch {
                // Ignore parse errors and keep the status-based message.
            }
            throw new Error(`Vision API error: ${errorMessage}`)
        }

        const result = await response.json()
        return result.responses[0] || {}
    } catch (error) {
        throw new Error(`Frame vision analysis failed: ${error.message}`)
    }
}

/**
 * Fallback local visual analysis (no API key needed)
 * Uses basic heuristics for scene detection
 */
function analyzeFrameLocal(frameMetadata) {
    // Heuristic-based analysis without external API
    const analysis = {
        localAnalysis: true,
        sceneType: inferSceneType(frameMetadata),
        audioSuggest: [],
        confidence: 'low'
    }

    // Map frame characteristics to audio suggestions
    if (frameMetadata.brightness > 0.7) {
        analysis.audioSuggest.push('bright', 'energetic', 'uplifting')
    }
    if (frameMetadata.colorSaturation > 0.8) {
        analysis.audioSuggest.push('vibrant', 'excited', 'dynamic')
    }
    if (frameMetadata.hasText) {
        analysis.audioSuggest.push('narrative', 'emphasis', 'attention')
    }

    return analysis
}

/**
 * Infer scene type from basic frame properties
 */
function inferSceneType(metadata) {
    const types = []

    if (metadata.resolution?.height > 2000) types.push('cinematic')
    if (metadata.resolution?.width > metadata.resolution?.height) types.push('landscape')

    return types.length > 0 ? types : ['generic']
}

/**
 * Consolidate vision analysis across multiple frames
 * Returns overall scene description + audio preferences
 */
function consolidateVisionAnalysis(frameAnalyses) {
    const consolidated = {
        totalFramesAnalyzed: frameAnalyses.length,
        dominantLabels: [],
        detectedObjects: [],
        audioProfile: {
            mood: 'neutral',
            pacing: 'moderate',
            intensity: 'medium',
            suggestions: []
        },
        timeline: []
    }

    const labelFreq = {}
    const objectFreq = {}
    const audioThemes = new Set()

    // Aggregate labels and objects
    frameAnalyses.forEach((analysis, idx) => {
        if (analysis.labelAnnotations) {
            analysis.labelAnnotations.forEach(label => {
                labelFreq[label.description] = (labelFreq[label.description] || 0) + 1
                audioThemes.add(label.description)
            })
        }

        if (analysis.localAnnotations?.audioSuggest) {
            analysis.localAnnotations.audioSuggest.forEach(sug => {
                audioThemes.add(sug)
            })
        }

        if (analysis.objectAnnotations) {
            analysis.objectAnnotations.forEach(obj => {
                objectFreq[obj.name] = (objectFreq[obj.name] || 0) + 1
            })
        }

        consolidated.timeline.push({
            frameIndex: analysis.frameIndex,
            timestamp: analysis.timestamp,
            detectedElements: Object.keys(analysis).filter(k => analysis[k])
        })
    })

    // Sort by frequency
    consolidated.dominantLabels = Object.entries(labelFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({ label, frequency: count }))

    consolidated.detectedObjects = Object.entries(objectFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([object, count]) => ({ object, frequency: count }))

    // Infer audio mood from themes
    if (audioThemes.has('people') || audioThemes.has('face')) {
        consolidated.audioProfile.mood = 'conversational'
    }
    if (audioThemes.has('action') || audioThemes.has('dynamic')) {
        consolidated.audioProfile.intensity = 'high'
        consolidated.audioProfile.pacing = 'fast'
    }
    if (audioThemes.has('nature') || audioThemes.has('landscape')) {
        consolidated.audioProfile.mood = 'ambient'
    }

    consolidated.audioProfile.suggestions = Array.from(audioThemes).slice(0, 5)

    return consolidated
}

/**
 * Main vision analysis flow
 * Input: Frame metadata from CEP adapter
 * Output: Vision analysis results + audio generation suggestions
 */
export async function analyzeTimelineVision(
    frames,
    googleApiKey = null,
    requester = null
) {
    const analysisResults = []

    try {
        // Analyze each frame
        for (const frame of frames) {
            try {
                let analysis = {
                    frameIndex: frame.frameIndex,
                    timestamp: frame.timestamp
                }

                if (frame.error) {
                    analysis.status = 'skipped'
                    analysis.reason = frame.error
                    analysisResults.push(analysis)
                    continue
                }

                // Try Google Vision API if key available
                if (googleApiKey && frame.base64) {
                    try {
                        const visionData = await analyzeFrameVision(frame.base64, googleApiKey)
                        analysis = {
                            ...analysis,
                            ...visionData,
                            apiUsed: 'google_vision'
                        }
                    } catch (googleError) {
                        // Fall back to local analysis
                        console.warn(`Google Vision failed for frame ${frame.frameIndex}, using local analysis`)
                        analysis.localAnalysis = analyzeFrameLocal(frame.metadata)
                        analysis.apiUsed = 'local_fallback'
                    }
                } else {
                    // Local analysis fallback
                    analysis.localAnalysis = analyzeFrameLocal(frame.metadata)
                    analysis.apiUsed = 'local_only'
                }

                analysis.status = 'analyzed'
                analysisResults.push(analysis)
            } catch (frameError) {
                analysisResults.push({
                    frameIndex: frame.frameIndex,
                    status: 'error',
                    error: frameError.message
                })
            }
        }

        // Consolidate all frame analyses
        const consolidated = consolidateVisionAnalysis(analysisResults)

        return {
            ok: true,
            frameAnalyses: analysisResults,
            consolidated,
            totalAnalyzed: analysisResults.filter(a => a.status === 'analyzed').length,
            totalFrames: frames.length
        }
    } catch (error) {
        return {
            ok: false,
            error: error.message,
            frameAnalyses: analysisResults
        }
    }
}

export { analyzeFrameVision, analyzeFrameLocal, consolidateVisionAnalysis }
