/**
 * ElevenLabs Model Auto-Detection
 * Fetches latest available models and selects optimal one based on use case
 * Supports: voices, languages, audio settings
 */

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'
const ELEVENLABS_MODELS_ENDPOINT = `${ELEVENLABS_API_BASE}/models`
const ELEVENLABS_VOICES_ENDPOINT = `${ELEVENLABS_API_BASE}/voices`

/**
 * Cache for model metadata (refresh every 1 hour)
 */
let modelCache = {
    models: [],
    voices: [],
    timestamp: 0,
    ttl: 3600000 // 1 hour
}

/**
 * Fetch all available models from ElevenLabs
 */
async function fetchAvailableModels(apiKey) {
    try {
        const response = await fetch(ELEVENLABS_MODELS_ENDPOINT, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.statusText}`)
        }

        const data = await response.json()
        return data || []
    } catch (error) {
        throw new Error(`Failed to fetch models: ${error.message}`)
    }
}

/**
 * Fetch all available voices
 */
async function fetchAvailableVoices(apiKey) {
    try {
        const response = await fetch(ELEVENLABS_VOICES_ENDPOINT, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.statusText}`)
        }

        const data = await response.json()
        return data.voices || []
    } catch (error) {
        throw new Error(`Failed to fetch voices: ${error.message}`)
    }
}

/**
 * Refresh model cache if expired
 */
async function refreshModelCache(apiKey) {
    const now = Date.now()

    // Return cached if still fresh
    if (modelCache.timestamp && (now - modelCache.timestamp) < modelCache.ttl) {
        return modelCache
    }

    // Fetch fresh data
    const [models, voices] = await Promise.all([
        fetchAvailableModels(apiKey),
        fetchAvailableVoices(apiKey)
    ])

    modelCache = {
        models,
        voices,
        timestamp: now,
        ttl: modelCache.ttl
    }

    return modelCache
}

/**
 * Auto-select best model for audio generation based on context
 */
function selectOptimalModel(models, context = {}) {
    // Context options:
    // - quality: 'fast' | 'balanced' | 'high'
    // - useCase: 'narrative' | 'ambient' | 'energetic' | 'generic'
    // - latency: ms threshold

    const { quality = 'balanced', useCase = 'generic', latency = 10000 } = context

    // Filter models by capability
    const candidates = models.filter(model => {
        if (!model.can_be_finetuned && quality === 'high') return false
        if (model.name.includes('turbo') && quality === 'high') return false
        if (!model.name) return false
        return true
    })

    // Score models based on quality preference
    const scored = candidates.map(model => ({
        model,
        score: calculateModelScore(model, quality, useCase)
    }))

    scored.sort((a, b) => b.score - a.score)

    return scored[0]?.model || models[0] || null
}

/**
 * Calculate model suitability score
 */
function calculateModelScore(model, quality, useCase) {
    let score = 0

    // Quality scoring
    if (quality === 'high' && model.can_be_finetuned) score += 10
    if (quality === 'balanced') score += 5
    if (quality === 'fast' && model.name.includes('turbo')) score += 10

    // Use case scoring
    if (useCase === 'narrative' && model.name.includes('multilingual')) score += 5
    if (useCase === 'ambient' && !model.name.includes('turbo')) score += 3
    if (useCase === 'energetic' && model.name.includes('turbo')) score += 5

    // Recency scoring (newer models get bonus)
    if (model.modelId?.includes('v3')) score += 8
    if (model.modelId?.includes('v2')) score += 4

    return score
}

/**
 * Auto-select best voice for generated audio
 */
function selectOptimalVoice(voices, context = {}) {
    // Context options:
    // - gender: 'male' | 'female' | 'neutral'
    // - accent: 'american' | 'british' | 'neutral'
    // - tone: 'professional' | 'casual' | 'dramatic'

    const { gender = null, accent = null, tone = null } = context

    const candidates = voices.filter(voice => {
        if (!voice.voice_id) return false
        if (gender && voice.labels?.gender && !voice.labels.gender.includes(gender)) return false
        if (accent && voice.labels?.accent && !voice.labels.accent.includes(accent)) return false
        if (tone && voice.labels?.tone && !voice.labels.tone.includes(tone)) return false
        return true
    })

    // Default to first available or English native
    return candidates[0] || voices.find(v => v.language === 'English') || voices[0] || null
}

/**
 * Detect audio generation requirements from vision analysis
 * Maps visual themes to optimal model/voice/settings
 */
function detectRequirementsFromVision(visionAnalysis) {
    const suggestions = visionAnalysis.audioProfile?.suggestions || []
    const dominantLabels = visionAnalysis.dominantLabels?.map(l => l.label) || []

    const requirements = {
        modelContext: { quality: 'balanced', useCase: 'generic' },
        voiceContext: { gender: null, accent: 'neutral', tone: 'professional' },
        audioSettings: {
            stability: 0.5,
            similarity: 0.75,
            style: 0
        }
    }

    // Map visual themes to audio requirements
    const allThemes = [...suggestions, ...dominantLabels]

    if (allThemes.some(t => t.includes('action') || t.includes('dynamic'))) {
        requirements.modelContext.quality = 'high'
        requirements.modelContext.useCase = 'energetic'
        requirements.audioSettings.stability = 0.3 // More variation
    }

    if (allThemes.some(t => t.includes('nature') || t.includes('landscape'))) {
        requirements.modelContext.useCase = 'ambient'
        requirements.audioSettings.stability = 0.8 // More stable
        requirements.audioSettings.style = 0.5 // Natural style
    }

    if (allThemes.some(t => t.includes('people') || t.includes('face'))) {
        requirements.voiceContext.tone = 'conversational'
        requirements.modelContext.useCase = 'narrative'
    }

    if (allThemes.some(t => t.includes('music') || t.includes('audio'))) {
        requirements.modelContext.quality = 'high'
        requirements.audioSettings.similarity = 0.9 // High fidelity
    }

    return requirements
}

/**
 * Main auto-detection flow
 * Input: API key + vision analysis + preferences
 * Output: Optimal model + voice + settings
 */
export async function autoDetectOptimalConfig(
    apiKey,
    visionAnalysis = null,
    userPreferences = {}
) {
    try {
        // Refresh model cache
        const cache = await refreshModelCache(apiKey)

        if (!cache.models || cache.models.length === 0) {
            throw new Error('No models available from ElevenLabs')
        }

        // Detect requirements from vision if available
        let detectedRequirements = {
            modelContext: { quality: 'balanced', useCase: 'generic' },
            voiceContext: { gender: null, accent: null, tone: 'professional' },
            audioSettings: { stability: 0.5, similarity: 0.75, style: 0 }
        }

        if (visionAnalysis?.consolidated) {
            detectedRequirements = detectRequirementsFromVision(visionAnalysis.consolidated)
        }

        // Merge with user preferences
        const finalModelContext = { ...detectedRequirements.modelContext, ...userPreferences.model }
        const finalVoiceContext = { ...detectedRequirements.voiceContext, ...userPreferences.voice }
        const finalAudioSettings = { ...detectedRequirements.audioSettings, ...userPreferences.audio }

        // Select optimal model
        const optimalModel = selectOptimalModel(cache.models, finalModelContext)

        // Select optimal voice
        const optimalVoice = selectOptimalVoice(cache.voices, finalVoiceContext)

        return {
            ok: true,
            selectedModel: {
                id: optimalModel?.model_id || optimalModel?.modelId,
                name: optimalModel?.name,
                description: optimalModel?.description,
                languages: optimalModel?.languages || []
            },
            selectedVoice: {
                id: optimalVoice?.voice_id,
                name: optimalVoice?.name,
                description: optimalVoice?.description,
                preview_url: optimalVoice?.preview_url
            },
            audioSettings: finalAudioSettings,
            metadata: {
                modelsAvailable: cache.models.length,
                voicesAvailable: cache.voices.length,
                visionBasedDetection: !!visionAnalysis?.consolidated,
                cacheAge: Date.now() - cache.timestamp
            }
        }
    } catch (error) {
        return {
            ok: false,
            error: error.message
        }
    }
}

export {
    fetchAvailableModels,
    fetchAvailableVoices,
    selectOptimalModel,
    selectOptimalVoice,
    detectRequirementsFromVision,
    refreshModelCache
}
