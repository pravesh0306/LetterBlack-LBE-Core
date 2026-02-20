/**
 * Vision Analyzer Module
 * Integrates with Sentinel's vision analysis
 */

class VisionAnalyzer {
    constructor(sentinelBridge) {
        this.sentinel = sentinelBridge
        this.lastAnalysis = null
    }

    /**
     * Analyze timeline vision via Sentinel
     */
    async analyzeTimeline(compositionName, frameInterval = 15) {
        try {
            // Create extraction proposal
            const extractionProposal = this.sentinel.createTimelineVisionProposal(
                compositionName,
                frameInterval
            )

            console.log(`[Vision] Creating timeline extraction proposal...`)

            // Submit and execute extraction
            const extractionResult = await this.sentinel.executeProposal(extractionProposal)

            if (!extractionResult.ok) {
                throw new Error(`Extraction failed: ${extractionResult.message}`)
            }

            console.log(`[Vision] Extracted ${extractionResult.output.framesExtracted} frames`)

            // Create vision analysis proposal
            const analysisProposal = this.sentinel.createVisionAnalysisProposal(
                extractionResult.output.samples
            )

            console.log(`[Vision] Analyzing frames...`)

            // Execute analysis
            const analysisResult = await this.sentinel.executeProposal(analysisProposal)

            if (!analysisResult.ok) {
                throw new Error(`Analysis failed: ${analysisResult.message}`)
            }

            this.lastAnalysis = analysisResult.output.consolidated

            console.log(`[Vision] Analysis complete`)

            return this.lastAnalysis
        } catch (error) {
            console.error('[Vision] Error:', error.message)
            throw error
        }
    }

    /**
     * Get audio generation suggestions from analysis
     */
    getAudioSuggestions(analysis = null) {
        const data = analysis || this.lastAnalysis

        if (!data) {
            return {
                mood: 'neutral',
                pacing: 'moderate',
                intensity: 'medium',
                suggestions: []
            }
        }

        return {
            mood: data.audioProfile?.mood || 'neutral',
            pacing: data.audioProfile?.pacing || 'moderate',
            intensity: data.audioProfile?.intensity || 'medium',
            suggestions: data.audioProfile?.suggestions || [],
            dominantLabels: data.dominantLabels?.map(l => l.label) || [],
            detectedObjects: data.detectedObjects?.map(o => o.object) || []
        }
    }

    /**
     * Suggest voice based on analysis
     */
    suggestVoiceContext(analysis = null) {
        const data = analysis || this.lastAnalysis

        if (!data) {
            return { gender: null, accent: 'neutral', tone: 'professional' }
        }

        const suggestions = data.audioProfile?.suggestions || []
        const mood = data.audioProfile?.mood || 'neutral'

        const voiceContext = {
            gender: null,
            accent: 'neutral',
            tone: 'professional'
        }

        // Infer gender from labels
        if (suggestions.includes('people')) {
            voiceContext.tone = 'conversational'
        }
        if (suggestions.includes('action') || suggestions.includes('dynamic')) {
            voiceContext.tone = 'energetic'
        }
        if (mood === 'ambient') {
            voiceContext.tone = 'calm'
        }

        return voiceContext
    }

    /**
     * Suggest model based on analysis
     */
    suggestModelContext(analysis = null) {
        const data = analysis || this.lastAnalysis

        if (!data) {
            return { quality: 'balanced', useCase: 'generic' }
        }

        const suggestions = data.audioProfile?.suggestions || []
        const intensity = data.audioProfile?.intensity || 'medium'

        const modelContext = {
            quality: 'balanced',
            useCase: 'generic'
        }

        if (suggestions.includes('music') || suggestions.includes('audio')) {
            modelContext.quality = 'high'
        }
        if (suggestions.includes('action') || intensity === 'high') {
            modelContext.useCase = 'energetic'
        }
        if (suggestions.includes('nature') || suggestions.includes('landscape')) {
            modelContext.useCase = 'ambient'
        }
        if (suggestions.includes('people') || suggestions.includes('face')) {
            modelContext.useCase = 'narrative'
        }

        return modelContext
    }

    /**
     * Get formatted analysis report
     */
    getAnalysisReport(analysis = null) {
        const data = analysis || this.lastAnalysis

        if (!data) {
            return 'No analysis available'
        }

        const report = [
            `Vision Analysis Report`,
            `=`.repeat(40),
            ``,
            `Audio Profile:`,
            `  Mood: ${data.audioProfile?.mood || 'N/A'}`,
            `  Pacing: ${data.audioProfile?.pacing || 'N/A'}`,
            `  Intensity: ${data.audioProfile?.intensity || 'N/A'}`,
            ``,
            `Dominant Labels: ${data.dominantLabels?.map(l => l.label).join(', ') || 'None'}`,
            `Detected Objects: ${data.detectedObjects?.map(o => o.object).join(', ') || 'None'}`,
            ``,
            `Suggestions: ${data.audioProfile?.suggestions?.join(', ') || 'None'}`
        ].join('\n')

        return report
    }

    /**
     * Get last analysis
     */
    getLastAnalysis() {
        return this.lastAnalysis
    }

    /**
     * Clear cached analysis
     */
    clearAnalysis() {
        this.lastAnalysis = null
    }
}

export default VisionAnalyzer
