/**
 * Sentinel Bridge
 * Connects CEP extension to Sentinel governance engine
 * Handles proposal creation, signing, and execution
 */

class SentinelBridge {
    constructor(controllerEndpoint = 'http://localhost:3000') {
        this.endpoint = controllerEndpoint
        this.requesterId = 'agent:ae-vision-cep-v1'
        this.sessionId = `session:cep-${Date.now()}`
        this.timeout = 30000 // 30 seconds
    }

    /**
     * Generate unsigned proposal for timeline vision
     */
    createTimelineVisionProposal(compositionName, frameInterval = 15) {
        const timestamp = Math.floor(Date.now() / 1000)
        const nonce = this.generateNonce()

        return {
            id: 'EXTRACT_TIMELINE_FRAMES',
            commandId: this.generateCommandId(),
            requesterId: this.requesterId,
            sessionId: this.sessionId,
            timestamp,
            nonce,
            requires: ['cepTimelineVision:extract'],
            risk: 'MEDIUM',
            payload: {
                adapter: 'cepTimelineVision',
                compositionName,
                frameInterval,
                outputDir: 'data'
            }
        }
    }

    /**
     * Create proposal for vision analysis
     */
    createVisionAnalysisProposal(frameData) {
        const timestamp = Math.floor(Date.now() / 1000)
        const nonce = this.generateNonce()

        return {
            id: 'ANALYZE_VISION',
            commandId: this.generateCommandId(),
            requesterId: this.requesterId,
            sessionId: this.sessionId,
            timestamp,
            nonce,
            requires: ['visionAnalysis:analyze'],
            risk: 'LOW',
            payload: {
                operation: 'visionAnalysis',
                frames: frameData
            }
        }
    }

    /**
     * Create proposal for model auto-detection
     */
    createModelDetectionProposal(visionAnalysis) {
        const timestamp = Math.floor(Date.now() / 1000)
        const nonce = this.generateNonce()

        return {
            id: 'DETECT_OPTIMAL_MODEL',
            commandId: this.generateCommandId(),
            requesterId: this.requesterId,
            sessionId: this.sessionId,
            timestamp,
            nonce,
            requires: ['modelAutoDetection:detect'],
            risk: 'LOW',
            payload: {
                operation: 'autoDetectOptimalConfig',
                visionAnalysis
            }
        }
    }

    /**
     * Create proposal for audio generation
     */
    createAudioGenerationProposal(visionAnalysis, modelConfig, audioSettings = {}) {
        const timestamp = Math.floor(Date.now() / 1000)
        const nonce = this.generateNonce()

        return {
            id: 'GENERATE_AUDIO_FROM_VISION',
            commandId: this.generateCommandId(),
            requesterId: this.requesterId,
            sessionId: this.sessionId,
            timestamp,
            nonce,
            requires: ['elevenLabsAudio:generateFromVision'],
            risk: 'MEDIUM',
            payload: {
                adapter: 'elevenLabsAudio',
                operation: 'generateFromVisionAnalysis',
                visionAnalysis,
                modelConfig,
                audioSettings
            }
        }
    }

    /**
     * Sign proposal for submission to controller
     * (Requires Ed25519 key - typically handled server-side)
     */
    async signProposal(proposal, privateKeyBase64) {
        if (!window.nacl) {
            throw new Error('TweetNaCl.js not loaded for cryptographic signing')
        }

        try {
            const secretKey = nacl.util.decodeBase64(privateKeyBase64)

            // Clone without signature
            const unsigned = { ...proposal }
            delete unsigned.signature

            // Canonicalize JSON
            const msg = JSON.stringify(unsigned, Object.keys(unsigned).sort())
            const msgBytes = nacl.util.decodeUTF8(msg)

            // Sign
            const sig = nacl.sign.detached(msgBytes, secretKey)

            return {
                ...proposal,
                signature: {
                    alg: 'ed25519',
                    keyId: this.requesterId,
                    sig: nacl.util.encodeBase64(sig)
                }
            }
        } catch (error) {
            throw new Error(`Failed to sign proposal: ${error.message}`)
        }
    }

    /**
     * Submit proposal to Sentinel Controller
     */
    async submitProposal(proposal) {
        try {
            const response = await fetch(`${this.endpoint}/v1/controller/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(proposal),
                timeout: this.timeout
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(`Controller error: ${error.reason || error.message}`)
            }

            return await response.json()
        } catch (error) {
            throw new Error(`Failed to contact Sentinel Controller: ${error.message}`)
        }
    }

    /**
     * Execute proposal on controller
     */
    async executeProposal(proposal) {
        try {
            const response = await fetch(`${this.endpoint}/v1/controller/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(proposal),
                timeout: this.timeout
            })

            const result = await response.json()
            return result
        } catch (error) {
            throw new Error(`Failed to execute proposal: ${error.message}`)
        }
    }

    /**
     * Get audit log entry for command
     */
    async getAuditEntry(commandId) {
        try {
            const response = await fetch(`${this.endpoint}/v1/audit/${commandId}`)
            return await response.json()
        } catch (error) {
            console.warn(`Failed to retrieve audit entry: ${error.message}`)
            return null
        }
    }

    /**
     * Verify audit log integrity
     */
    async verifyAuditIntegrity() {
        try {
            const response = await fetch(`${this.endpoint}/v1/audit/verify`)
            return await response.json()
        } catch (error) {
            console.warn(`Audit verification not available: ${error.message}`)
            return { verified: false }
        }
    }

    /**
     * Health check - verify controller is accessible
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.endpoint}/health`)
            const data = await response.json()
            return { ok: response.ok, data }
        } catch (error) {
            return { ok: false, error: error.message }
        }
    }

    /**
     * Poll for proposal results
     */
    async pollResults(commandId, maxAttempts = 30, delayMs = 1000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const entry = await this.getAuditEntry(commandId)
            if (entry && entry.status !== 'pending') {
                return entry
            }
            await this.delay(delayMs)
        }
        throw new Error(`Timeout waiting for proposal ${commandId}`)
    }

    /**
     * Utility: Generate nonce
     */
    generateNonce() {
        const bytes = new Uint8Array(32)
        crypto.getRandomValues(bytes)
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    }

    /**
     * Utility: Generate command ID
     */
    generateCommandId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Utility: Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Set request requester ID
     */
    setRequesterId(id) {
        this.requesterId = id
    }

    /**
     * Set session ID
     */
    setSessionId(id) {
        this.sessionId = id
    }

    /**
     * Set controller endpoint (useful for custom deployments)
     */
    setEndpoint(endpoint) {
        this.endpoint = endpoint
    }
}

export default SentinelBridge
