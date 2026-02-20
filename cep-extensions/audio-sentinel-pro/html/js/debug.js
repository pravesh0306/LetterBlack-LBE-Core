/**
 * Audio Sentinel Pro - Debug Console Tools
 * Access via: window.DEBUG or window.audioSentinelDebug
 * 
 * Examples:
 *   window.DEBUG.state()           // Show all app state
 *   window.DEBUG.health()          // Check system health
 *   window.DEBUG.logs()            // View logged messages
 *   window.DEBUG.test()            // Run diagnostics
 */

class DebugConsole {
    constructor() {
        this.logs = []
        this.startTime = Date.now()
        this.maxLogs = 500
        this.version = '1.0'
    }

    // ===== Core Utilities =====

    log(component, message, data = null) {
        const timestamp = new Date().toLocaleTimeString()
        const logEntry = {
            time: timestamp,
            component,
            message,
            data,
            timestamp: Date.now()
        }

        this.logs.push(logEntry)
        if (this.logs.length > this.maxLogs) {
            this.logs.shift()
        }

        const prefix = `%c[${timestamp}] [${component}]%c`
        const styles = ['color: #58a6ff; font-weight: bold;', 'color: inherit;']

        if (data !== null) {
            console.log(prefix, ...styles, message, data)
        } else {
            console.log(prefix, ...styles, message)
        }
    }

    // ===== State Inspection =====

    state() {
        console.log('%c=== APP STATE ===', 'color: #3fb950; font-weight: bold; font-size: 14px;')

        if (!window.appState) {
            console.warn('⚠️ App state not initialized yet')
            return
        }

        const state = window.appState
        console.table({
            'Sentinel Bridge': state.sentinelBridge ? '✓ Ready' : '✗ Missing',
            'Timeline Manager': state.timelineManager ? '✓ Ready' : '✗ Missing',
            'Audio Library': state.audioLibrary ? '✓ Ready' : '✗ Missing',
            'Waveform Renderer': state.waveformRenderer ? '✓ Ready' : '✗ Missing',
            'Vision Analyzer': state.visionAnalyzer ? '✓ Ready' : '✗ Missing',
            'UI Controller': state.uiController ? '✓ Ready' : '✗ Missing'
        })

        console.log('%cSettings:', 'color: #58a6ff; font-weight: bold;', state.settings)
        return state
    }

    health() {
        console.log('%c=== SYSTEM HEALTH ===', 'color: #3fb950; font-weight: bold; font-size: 14px;')

        const checks = {
            DOM: this.checkDOM(),
            CSInterface: this.checkCSInterface(),
            LocalStorage: this.checkLocalStorage(),
            Sentinel: this.checkSentinel(),
            UIController: this.checkUIController(),
            Managers: this.checkManagers()
        }

        console.table(checks)
        return checks
    }

    checkDOM() {
        try {
            const tabs = document.querySelectorAll('[data-tab]')
            const forms = document.querySelectorAll('input, textarea, select')
            return `✓ DOM Ready (${tabs.length} tabs, ${forms.length} inputs)`
        } catch (e) {
            return `✗ DOM Error: ${e.message}`
        }
    }

    checkCSInterface() {
        try {
            if (typeof CSInterface !== 'undefined') {
                return '✓ CSInterface Available'
            }
            return '✗ CSInterface Not Loaded'
        } catch (e) {
            return `✗ Error: ${e.message}`
        }
    }

    checkLocalStorage() {
        try {
            const test = '__audio_sentinel_test__'
            localStorage.setItem(test, 'test')
            localStorage.removeItem(test)
            const size = Object.keys(localStorage).length
            return `✓ LocalStorage OK (${size} items)`
        } catch (e) {
            return `✗ Error: ${e.message}`
        }
    }

    checkSentinel() {
        try {
            if (!window.appState?.sentinelBridge) {
                return '⚠ Sentinel Bridge not initialized'
            }
            return '✓ Sentinel Bridge Ready'
        } catch (e) {
            return `✗ Error: ${e.message}`
        }
    }

    checkUIController() {
        try {
            if (!window.appState?.uiController) {
                return '⚠ UI Controller not initialized'
            }
            return '✓ UI Controller Ready'
        } catch (e) {
            return `✗ Error: ${e.message}`
        }
    }

    checkManagers() {
        try {
            const managers = ['timelineManager', 'audioLibrary', 'waveformRenderer', 'visionAnalyzer']
            const ready = managers.filter(m => window.appState?.[m]).length
            return `${ready}/${managers.length} managers ready`
        } catch (e) {
            return `✗ Error: ${e.message}`
        }
    }

    // ===== Feature Testing =====

    test() {
        console.log('%c=== RUNNING DIAGNOSTICS ===', 'color: #d29922; font-weight: bold; font-size: 14px;')

        const results = {
            'DOM Loaded': document.readyState === 'complete' ? '✓' : '✗',
            'CSInterface': typeof CSInterface !== 'undefined' ? '✓' : '✗',
            'TweetNaCl': typeof nacl !== 'undefined' ? '✓' : '✗',
            'Web Audio': typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined' ? '✓' : '✗',
            'Canvas Available': typeof Canvas !== 'undefined' || document.createElement('canvas').getContext ? '✓' : '✗'
        }

        console.table(results)

        // Test proposal signing
        try {
            console.log('%cTesting proposal generation...', 'color: #58a6ff;')
            if (window.appState?.sentinelBridge) {
                const proposal = window.appState.sentinelBridge.createAudioGenerationProposal({
                    type: 'tts',
                    text: 'test'
                })
                console.log('✓ Proposal generated:', proposal.id)
            }
        } catch (e) {
            console.error('✗ Proposal generation failed:', e.message)
        }

        // Test library
        try {
            console.log('%cTesting audio library...', 'color: #58a6ff;')
            if (window.appState?.audioLibrary) {
                const items = window.appState.audioLibrary.getAllItems()
                console.log(`✓ Library accessible (${items.length} items)`)
            }
        } catch (e) {
            console.error('✗ Library test failed:', e.message)
        }
    }

    // ===== Data Inspection =====

    library() {
        if (!window.appState?.audioLibrary) {
            console.warn('⚠️ Audio library not initialized')
            return
        }

        const items = window.appState.audioLibrary.getAllItems()
        const stats = window.appState.audioLibrary.getStatistics()

        console.log('%c=== AUDIO LIBRARY ===', 'color: #3fb950; font-weight: bold; font-size: 14px;')
        console.table(stats)
        console.log('%cItems:', 'color: #58a6ff; font-weight: bold;')
        console.table(items.map(i => ({
            name: i.name,
            type: i.type,
            duration: i.duration.toFixed(2) + 's',
            created: new Date(i.createdAt).toLocaleString()
        })))

        return items
    }

    settings() {
        const settings = JSON.parse(localStorage.getItem('audioSentinelSettings') || '{}')
        console.log('%c=== SETTINGS ===', 'color: #3fb950; font-weight: bold; font-size: 14px;')
        console.table(settings)
        return settings
    }

    logs(limit = 20) {
        console.log('%c=== DEBUG LOGS ===', 'color: #3fb950; font-weight: bold; font-size: 14px;')

        const recentLogs = this.logs.slice(-limit)
        console.table(recentLogs.map(l => ({
            time: l.time,
            component: l.component,
            message: l.message,
            hasData: l.data ? '✓' : '✗'
        })))

        return recentLogs
    }

    vision() {
        if (!window.appState?.visionAnalyzer) {
            console.warn('⚠️ Vision analyzer not initialized')
            return
        }

        const analysis = window.appState.visionAnalyzer.getLastAnalysis()

        if (!analysis) {
            console.log('ℹ️ No vision analysis yet. Run "Analyze Vision" in the extension first.')
            return
        }

        console.log('%c=== VISION ANALYSIS ===', 'color: #3fb950; font-weight: bold; font-size: 14px;')
        console.log('Audio Profile:', analysis.audioProfile)
        console.log('Dominant Labels:', analysis.dominantLabels)
        console.log('Detected Objects:', analysis.detectedObjects)

        return analysis
    }

    // ===== Actions =====

    async testSentinel() {
        console.log('%cTesting Sentinel connection...', 'color: #58a6ff; font-weight: bold;')

        if (!window.appState?.sentinelBridge) {
            console.error('✗ Sentinel bridge not available')
            return
        }

        try {
            const health = await window.appState.sentinelBridge.healthCheck()
            console.log('✓ Sentinel Health:', health)
            return health
        } catch (e) {
            console.error('✗ Sentinel connection failed:', e.message)
            return null
        }
    }

    clear() {
        this.logs = []
        console.clear()
        console.log('%c✓ Logs cleared', 'color: #3fb950; font-weight: bold;')
    }

    help() {
        console.log('%c=== AUDIO SENTINEL DEBUG CONSOLE ===', 'color: #58a6ff; font-weight: bold; font-size: 14px;')
        console.log(`%cVersion: ${this.version}`, 'color: #999;')
        console.log('')
        console.log('%cCore Commands:', 'color: #58a6ff; font-weight: bold;')
        console.log('  DEBUG.state()          - Show app state')
        console.log('  DEBUG.health()         - Check system health')
        console.log('  DEBUG.test()           - Run diagnostics')
        console.log('  DEBUG.logs(limit)      - View debug logs (default 20)')
        console.log('')
        console.log('%cData Inspection:', 'color: #58a6ff; font-weight: bold;')
        console.log('  DEBUG.library()        - Inspect audio library')
        console.log('  DEBUG.settings()       - View settings')
        console.log('  DEBUG.vision()         - View last vision analysis')
        console.log('')
        console.log('%cActions:', 'color: #58a6ff; font-weight: bold;')
        console.log('  DEBUG.testSentinel()   - Test Sentinel connection')
        console.log('  DEBUG.clear()          - Clear logs')
        console.log('')
        console.log('%cGlobal Access:', 'color: #58a6ff; font-weight: bold;')
        console.log('  window.appState        - Full app state object')
        console.log('  window.DEBUG           - This debug console')
        console.log('  window.debugLog()      - Log helper function')
    }

    info() {
        console.log('%c' + '='.repeat(50), 'color: #3fb950; font-weight: bold;')
        console.log('%c Audio Sentinel Pro - Debug Console v' + this.version, 'color: #3fb950; font-weight: bold; font-size: 14px;')
        console.log('%c' + '='.repeat(50), 'color: #3fb950; font-weight: bold;')
        console.log('')
        console.log('Uptime: ' + this.getUptime())
        console.log('Logs in memory: ' + this.logs.length + '/' + this.maxLogs)
        console.log('')
        console.log('Type: %cDEBUG.help()', 'color: #58a6ff; font-weight: bold;')
        console.log('For a list of all available commands.')
        console.log('')
    }

    getUptime() {
        const elapsed = Date.now() - this.startTime
        const minutes = Math.floor(elapsed / 60000)
        const seconds = Math.floor((elapsed % 60000) / 1000)
        return `${minutes}m ${seconds}s`
    }
}

// Initialize debug console
window.DEBUG = new DebugConsole()
window.audioSentinelDebug = window.DEBUG

// Welcome message
console.log('%c╔════════════════════════════════════════╗', 'color: #3fb950;')
console.log('%c║  Audio Sentinel Pro Debug Console      ║', 'color: #3fb950; font-weight: bold; font-size: 14px;')
console.log('%c╚════════════════════════════════════════╝', 'color: #3fb950;')
console.log('Type %cDEBUG.help()%c for available commands', 'color: #58a6ff; font-weight: bold;', 'color: inherit;')

export default DebugConsole
