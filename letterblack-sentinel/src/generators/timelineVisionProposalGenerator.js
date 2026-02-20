import crypto from 'crypto'
import canonicalize from 'json-canonicalize'
import * as nacl from 'tweetnacl'
import { readFileSync } from 'fs'

/**
 * Timeline Vision Audio Generation Proposal Generator
 * Creates cryptographically signed proposals for vision-based audio generation
 */

/**
 * Generate deterministic nonce (never reused)
 */
function generateNonce() {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * Load private key for signing
 */
function loadPrivateKey(keyPath) {
    try {
        const keyData = readFileSync(keyPath, 'utf-8')
        const keyJson = JSON.parse(keyData)
        return Buffer.from(keyJson.secretKey, 'base64')
    } catch (error) {
        throw new Error(`Failed to load private key: ${error.message}`)
    }
}

/**
 * Sign proposal with Ed25519
 */
function signProposal(proposal, secretKey) {
    // Clone and remove existing signature
    const unsigned = { ...proposal }
    delete unsigned.signature

    // Canonicalize to RFC 8785 JSON
    const msg = canonicalize(unsigned)

    // Sign with Ed25519
    const msgBytes = Buffer.from(msg, 'utf8')
    const sig = nacl.sign.detached(new Uint8Array(msgBytes), new Uint8Array(secretKey))

    // Return with signature attached
    return {
        ...proposal,
        signature: {
            alg: 'ed25519',
            keyId: proposal.requesterId,
            sig: Buffer.from(sig).toString('base64')
        }
    }
}

/**
 * Generate proposal for timeline frame extraction
 */
export function generateTimelineExtractionProposal(
    options = {},
    secretKey = null
) {
    const {
        compositionName = 'Main Composition',
        frameInterval = 15,
        requesterId = 'agent:ae-timeline-vision-v1',
        sessionId = `session:timeline-${Date.now()}`,
        outputDir = null
    } = options

    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = generateNonce()

    const proposal = {
        id: 'EXTRACT_TIMELINE_FRAMES',
        commandId: crypto.randomUUID(),
        requesterId,
        sessionId,
        timestamp,
        nonce,
        requires: ['cepTimelineVision:extract'],
        risk: 'MEDIUM',
        payload: {
            adapter: 'cepTimelineVision',
            compositionName,
            frameInterval,
            ...(outputDir && { outputDir })
        }
    }

    // Sign if key provided
    if (secretKey) {
        return signProposal(proposal, secretKey)
    }

    return proposal
}

/**
 * Generate proposal for vision analysis
 */
export function generateVisionAnalysisProposal(
    frameData = [],
    options = {},
    secretKey = null
) {
    const {
        requesterId = 'agent:vision-analyzer-v1',
        sessionId = `session:vision-${Date.now()}`,
        googleApiKey = null
    } = options

    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = generateNonce()

    const proposal = {
        id: 'ANALYZE_VISION',
        commandId: crypto.randomUUID(),
        requesterId,
        sessionId,
        timestamp,
        nonce,
        requires: ['visionAnalysis:analyze'],
        risk: 'LOW',
        payload: {
            operation: 'visionAnalysis',
            frames: frameData,
            ...(googleApiKey && { googleApiKey })
        }
    }

    if (secretKey) {
        return signProposal(proposal, secretKey)
    }

    return proposal
}

/**
 * Generate proposal for model auto-detection
 */
export function generateModelDetectionProposal(
    visionAnalysis = null,
    options = {},
    secretKey = null
) {
    const {
        requesterId = 'agent:model-selector-v1',
        sessionId = `session:models-${Date.now()}`,
        elevenlabsApiKey = null,
        userPreferences = {}
    } = options

    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = generateNonce()

    const proposal = {
        id: 'DETECT_OPTIMAL_MODEL',
        commandId: crypto.randomUUID(),
        requesterId,
        sessionId,
        timestamp,
        nonce,
        requires: ['modelAutoDetection:detect'],
        risk: 'LOW',
        payload: {
            operation: 'autoDetectOptimalConfig',
            visionAnalysis,
            userPreferences,
            ...(elevenlabsApiKey && { elevenlabsApiKey })
        }
    }

    if (secretKey) {
        return signProposal(proposal, secretKey)
    }

    return proposal
}

/**
 * Generate proposal for audio generation
 */
export function generateAudioGenerationProposal(
    visionAnalysis = null,
    modelConfig = null,
    options = {},
    secretKey = null
) {
    const {
        requesterId = 'agent:audio-generator-v1',
        sessionId = `session:audio-${Date.now()}`,
        elevenlabsApiKey = null,
        audioSettings = {}
    } = options

    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = generateNonce()

    const proposal = {
        id: 'GENERATE_AUDIO_FROM_VISION',
        commandId: crypto.randomUUID(),
        requesterId,
        sessionId,
        timestamp,
        nonce,
        requires: ['elevenLabsAudio:generateFromVision'],
        risk: 'MEDIUM',
        payload: {
            adapter: 'elevenLabsAudio',
            operation: 'generateFromVisionAnalysis',
            visionAnalysis,
            modelConfig,
            audioSettings,
            ...(elevenlabsApiKey && { elevenlabsApiKey })
        }
    }

    if (secretKey) {
        return signProposal(proposal, secretKey)
    }

    return proposal
}

/**
 * Generate complete timeline vision pipeline proposal
 * Orchestrates: extraction → analysis → model selection → generation
 */
export function generateTimelineVisionPipelineProposal(
    compositionName = 'Main Composition',
    options = {},
    secretKey = null
) {
    const {
        requesterId = 'agent:timeline-vision-pipeline-v1',
        sessionId = `session:pipeline-${Date.now()}`,
        frameInterval = 15,
        elevenlabsApiKey = null,
        googleApiKey = null,
        outputDir = null
    } = options

    const baseSessionId = sessionId
    const timestamp = Math.floor(Date.now() / 1000)

    // Create sequence of proposals
    const proposals = [
        generateTimelineExtractionProposal(
            {
                compositionName,
                frameInterval,
                requesterId: `${requesterId}:extractor`,
                sessionId: baseSessionId,
                outputDir
            },
            secretKey
        ),

        generateVisionAnalysisProposal(
            [], // Will be filled with extracted frames
            {
                requesterId: `${requesterId}:analyzer`,
                sessionId: baseSessionId,
                googleApiKey
            },
            secretKey
        ),

        generateModelDetectionProposal(
            null, // Will be filled with vision results
            {
                requesterId: `${requesterId}:selector`,
                sessionId: baseSessionId,
                elevenlabsApiKey
            },
            secretKey
        ),

        generateAudioGenerationProposal(
            null, // From previous
            null, // From previous
            {
                requesterId: `${requesterId}:generator`,
                sessionId: baseSessionId,
                elevenlabsApiKey
            },
            secretKey
        )
    ]

    return {
        pipelineId: crypto.randomUUID(),
        name: 'Timeline Vision to Audio Pipeline',
        sessionId: baseSessionId,
        compositionName,
        stages: [
            'EXTRACT_TIMELINE_FRAMES',
            'ANALYZE_VISION',
            'DETECT_OPTIMAL_MODEL',
            'GENERATE_AUDIO_FROM_VISION'
        ],
        proposals,
        createdAt: new Date(timestamp * 1000).toISOString(),
        status: 'ready'
    }
}

/**
 * Batch proposal generator for testing
 */
export function generateProposalBatch(count = 5, baseOptions = {}) {
    const proposals = []

    for (let i = 0; i < count; i++) {
        proposals.push(
            generateTimelineExtractionProposal({
                compositionName: `Comp_${i + 1}`,
                frameInterval: 15,
                requesterId: `agent:extractor-${i + 1}-v1`,
                ...baseOptions
            })
        )
    }

    return proposals
}

export {
    generateNonce,
    loadPrivateKey,
    signProposal
}
