/**
 * Audio Sentinel Pro - Main Entry Point
 * Initializes all modules and sets up the CEP extension
 */

// ===== Debug Utility =====
window.DEBUG = true
window.debugLog = function (component, message, data = null) {
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[${timestamp}] [${component}]`

    if (data !== null) {
        console.log(`${prefix} ${message}`, data)
    } else {
        console.log(`${prefix} ${message}`)
    }
}

// Override console logging for better visibility
const originalLog = console.log
const originalError = console.error
const originalWarn = console.warn

console.log = function (...args) {
    originalLog(`%c[LOG]`, 'color: #58a6ff; font-weight: bold;', ...args)
}

console.error = function (...args) {
    originalError(`%c[ERROR]`, 'color: #f85149; font-weight: bold;', ...args)
}

console.warn = function (...args) {
    originalWarn(`%c[WARN]`, 'color: #d29922; font-weight: bold;', ...args)
}

// Catch all unhandled errors
window.addEventListener('error', (event) => {
    console.error('Unhandled Error:', event.error?.message || event.message)
    console.error('Stack:', event.error?.stack)
})

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason)
})

// Import modules - these would be ES6 imports in a bundled environment
// For now, they're loaded via script tags in index.html

/**
 * Initialize extension on panel load
 */
async function initializeExtension() {
    try {
        debugLog('Main', '🚀 Initializing Audio Sentinel Pro...')
        console.log('🔍 Debug mode enabled. Check console for detailed logs.')

        // ===== 1. Initialize CEP Bridge =====
        debugLog('Main', '→ Initializing CSInterface...')
        const csInterface = new CSInterface()
        debugLog('Main', '✓ CSInterface initialized')

        // Set panel size
        debugLog('Main', '→ Setting panel size to 600x900...')
        csInterface.resizeContent(600, 900)

        // Load settings
        debugLog('Main', '→ Loading settings from localStorage...')
        const settings = loadSettings()
        debugLog('Main', '✓ Settings loaded', { endpoint: settings.sentinelEndpoint })

        // ===== 2. Initialize Sentinel Bridge =====
        debugLog('Main', '→ Initializing Sentinel Bridge...')
        window.sentinelBridge = new SentinelBridge({
            endpoint: settings.sentinelEndpoint,
            requesterId: 'cep:ae-audio-sentinel-v1',
            sessionId: `session:ae-${Date.now()}`
        })
        debugLog('Main', '✓ Sentinel Bridge initialized')

        // ===== 3. Initialize Core Managers =====
        debugLog('Main', '→ Initializing core managers...')
        const timelineManager = new TimelineManager(csInterface)
        const audioLibrary = new AudioLibrary()
        const waveformRenderer = new WaveformRenderer()
        debugLog('Main', '✓ Core managers initialized')

        // ===== 4. Initialize Vision Analyzer =====
        debugLog('Main', '→ Initializing Vision Analyzer...')
        const visionAnalyzer = new VisionAnalyzer(window.sentinelBridge)
        debugLog('Main', '✓ Vision analyzer initialized')

        // ===== 5. Initialize UI Controller =====
        debugLog('Main', '→ Initializing UI Controller...')
        window.uiController = new UIController({
            csInterface,
            managers: {
                timeline: timelineManager,
                library: audioLibrary,
                sentinel: window.sentinelBridge,
                waveform: waveformRenderer
            },
            analyzer: visionAnalyzer
        })
        debugLog('Main', '✓ UI controller initialized')

        // ===== 6. Populate Dynamic UI Elements =====
        debugLog('Main', '→ Populating UI dropdowns...')
        await populateCompositionDropdowns(timelineManager)
        await populateVoiceModels(settings)
        await checkSentinelConnectivity()
        debugLog('Main', '✓ UI populated')

        // ===== 7. Initialize Preferences =====
        debugLog('Main', '→ Initializing preferences...')
        initializePreferences(settings)
        debugLog('Main', '✓ Preferences initialized')

        // ===== 8. Set up Auto-save =====
        debugLog('Main', '→ Setting up auto-save...')
        setUpAutoSave()
        debugLog('Main', '✓ Auto-save enabled (every 30s)')

        // ===== 9. Display welcome message =====
        displayWelcomeMessage()

        debugLog('Main', '🎉 Audio Sentinel Pro ready!')
        window.uiController.updateStatus('✓ Ready', 'success')

        // Make managers accessible globally for debugging
        window.appState = {
            sentinelBridge: window.sentinelBridge,
            timelineManager,
            audioLibrary,
            waveformRenderer,
            visionAnalyzer,
            uiController: window.uiController,
            csInterface,
            settings
        }

        debugLog('Main', '✓ Debug tools available: window.audioSentinelDebug.*')
        debugLog('Main', '✓ App state: window.appState')

    } catch (error) {
        console.error('[Main] ❌ Initialization failed:', error)
        console.error('Stack:', error.stack)

        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #f85149; font-family: monospace;">
                <h2>⚠️ Initialization Error</h2>
                <p>${error.message}</p>
                <p style="font-size: 12px; color: #999; margin-top: 20px;">Check browser console for details</p>
                <details style="text-align: left; margin-top: 20px;">
                    <summary>Stack Trace</summary>
                    <pre style="background: #1e1e2e; padding: 10px; border-radius: 4px; overflow: auto;">${error.stack}</pre>
                </details>
            </div>
        `
    }
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    const defaults = {
        sentinelEndpoint: 'http://localhost:3000',
        apiKey: '',
        autoInsertAudio: true,
        theme: 'dark'
    }

    try {
        const saved = localStorage.getItem('audioSentinelSettings')
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
    } catch (error) {
        console.warn('[Main] Failed to load settings, using defaults:', error)
        return defaults
    }
}

/**
 * Populate composition dropdowns
 */
async function populateCompositionDropdowns(timelineManager) {
    try {
        const compositions = timelineManager.getProjectCompositions()

        const selects = [
            'visionCompSelect',
            'analyzeCompSelect',
            'defaultCompSelect'
        ]

        selects.forEach(selectId => {
            const select = document.getElementById(selectId)
            if (select) {
                select.innerHTML = '<option value="">-- Select Composition --</option>'
                compositions.forEach(comp => {
                    const option = document.createElement('option')
                    option.value = comp.name
                    option.textContent = comp.name
                    select.appendChild(option)
                })
            }
        })

        console.log(`[Main] Populated ${compositions.length} compositions`)
    } catch (error) {
        console.warn('[Main] Failed to populate compositions:', error)
    }
}

/**
 * Populate voice/model dropdowns
 */
async function populateVoiceModels(settings) {
    try {
        // Fetch ElevenLabs voices if API key is available
        if (settings.apiKey) {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: { 'xi-api-key': settings.apiKey }
            })

            if (response.ok) {
                const data = await response.json()
                const voiceSelect = document.getElementById('voiceSelect')

                if (voiceSelect && data.voices) {
                    voiceSelect.innerHTML = ''
                    data.voices.forEach(voice => {
                        const option = document.createElement('option')
                        option.value = voice.voice_id
                        option.textContent = `${voice.name} (${voice.labels?.accent || 'neutral'})`
                        voiceSelect.appendChild(option)
                    })

                    console.log(`[Main] Populated ${data.voices.length} voices`)
                }
            }
        }

        // Populate models
        const models = ['eleven_turbo_v2', 'eleven_monolingual_v1', 'english_gpt4', 'multilingual']
        const modelSelect = document.getElementById('modelSelect')

        if (modelSelect) {
            modelSelect.innerHTML = ''
            models.forEach(model => {
                const option = document.createElement('option')
                option.value = model
                option.textContent = model
                modelSelect.appendChild(option)
            })
        }

        console.log('[Main] Model dropdowns populated')
    } catch (error) {
        console.warn('[Main] Failed to populate voice/model dropdowns:', error)
    }
}

/**
 * Check Sentinel connectivity
 */
async function checkSentinelConnectivity() {
    try {
        const health = await window.sentinelBridge.healthCheck()

        if (health.ok) {
            updateConnectionIndicator('sentinel', true)
        } else {
            updateConnectionIndicator('sentinel', false)
        }
    } catch (error) {
        console.warn('[Main] Sentinel not available:', error)
        updateConnectionIndicator('sentinel', false)
    }
}

/**
 * Update connection indicator
 */
function updateConnectionIndicator(service, isConnected) {
    const indicator = document.getElementById(`${service}Indicator`)

    if (indicator) {
        indicator.style.backgroundColor = isConnected ? '#3fb950' : '#f85149'
        indicator.title = isConnected ? `${service} connected` : `${service} disconnected`
    }

    console.log(`[Main] ${service}: ${isConnected ? '✓ Connected' : '✗ Disconnected'}`)
}

/**
 * Initialize preferences UI
 */
function initializePreferences(settings) {
    const apiKeyInput = document.getElementById('apiKeyInput')
    const endpointInput = document.getElementById('sentinelEndpointInput')
    const autoInsertCheckbox = document.getElementById('autoInsertCheckbox')
    const themeSelect = document.getElementById('themeSelect')

    if (apiKeyInput) apiKeyInput.value = settings.apiKey
    if (endpointInput) endpointInput.value = settings.sentinelEndpoint
    if (autoInsertCheckbox) autoInsertCheckbox.checked = settings.autoInsertAudio
    if (themeSelect) themeSelect.value = settings.theme

    // Apply theme
    if (settings.theme === 'light') {
        document.body.classList.add('light-theme')
    }
}

/**
 * Set up auto-save for library
 */
function setUpAutoSave() {
    // Save library every 30 seconds
    setInterval(() => {
        try {
            window.appState.audioLibrary.saveLibrary()
            console.log('[Main] Library auto-saved')
        } catch (error) {
            console.warn('[Main] Auto-save failed:', error)
        }
    }, 30000)
}

/**
 * Display welcome message
 */
function displayWelcomeMessage() {
    const statusBar = document.getElementById('statusMessage')

    if (statusBar) {
        const messages = [
            'Welcome to Audio Sentinel Pro!',
            'Generate TTS with models and voices',
            'Create SFX with natural language',
            'Analyze timeline visually and auto-generate audio',
            'Maintain persistent audio library',
            'All operations governed by Sentinel'
        ]

        let index = 0

        const rotateMessage = () => {
            if (statusBar) {
                statusBar.textContent = messages[index]
                statusBar.className = 'status-info'
                index = (index + 1) % messages.length
            }
        }

        rotateMessage()
        setInterval(rotateMessage, 5000)
    }
}

/**
 * Handle panel unload - cleanup
 */
function onPanelUnload() {
    console.log('[Main] Panel unloading, saving state...')

    // Save library
    if (window.appState?.audioLibrary) {
        window.appState.audioLibrary.saveLibrary()
    }

    // Save settings
    if (window.uiController) {
        window.uiController.handleSaveSettings()
    }

    console.log('[Main] State saved')
}

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension)
} else {
    initializeExtension()
}

// Handle panel unload
window.addEventListener('beforeunload', onPanelUnload)

// ===== Global error handler =====
window.addEventListener('error', (event) => {
    console.error('[Main] Unhandled error:', event.error)

    if (window.uiController) {
        window.uiController.updateStatus(`Error: ${event.error?.message}`, 'error')
    }
})

// ===== Make key functions accessible globally for debugging =====
window.audioSentinelDebug = {
    reload: () => location.reload(),
    clearLibrary: () => {
        if (confirm('Clear all audio?')) {
            localStorage.removeItem('audioLibrary')
            location.reload()
        }
    },
    clearSettings: () => {
        if (confirm('Clear all settings?')) {
            localStorage.removeItem('audioSentinelSettings')
            location.reload()
        }
    },
    getState: () => window.appState,
    getLibrary: () => window.appState?.audioLibrary?.getAllItems(),
    getSentinelStatus: async () => {
        const health = await window.appState?.sentinelBridge?.healthCheck()
        console.table(health)
        return health
    },
    viewLastAnalysis: () => {
        const analysis = window.appState?.visionAnalyzer?.getLastAnalysis()
        console.table(analysis)
        return analysis
    }
}

console.log('[Main] Audio Sentinel Pro debug tools available: window.audioSentinelDebug.*')
