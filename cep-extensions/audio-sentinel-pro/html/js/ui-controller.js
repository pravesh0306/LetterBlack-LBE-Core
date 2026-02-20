/**
 * UI Controller Module
 * Orchestrates tab switching, event handling, and state management
 */

class UIController {
    constructor(config) {
        this.config = config
        this.currentTab = 'generate'
        this.isProcessing = false
        this.csInterface = config.csInterface
        this.managers = config.managers // { timeline, library, sentinel, waveform }
        this.analyzer = config.analyzer

        this.initializeEventListeners()
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab))
        })

        // Generate Tab
        document.getElementById('generateBtn')?.addEventListener('click', () => this.handleGenerate())
        document.getElementById('generateSFXBtn')?.addEventListener('click', () => this.handleGenerateSFX())
        document.getElementById('visionGenerateBtn')?.addEventListener('click', () => this.handleVisionGenerate())

        // Library Tab
        document.getElementById('searchLibraryInput')?.addEventListener('input', (e) => this.handleLibrarySearch(e.target.value))
        document.getElementById('filterTypeSelect')?.addEventListener('change', (e) => this.handleFilterBy(e.target.value))
        document.getElementById('exportLibraryBtn')?.addEventListener('click', () => this.handleExportLibrary())
        document.getElementById('clearLibraryBtn')?.addEventListener('click', () => this.handleClearLibrary())

        // Vision Tab
        document.getElementById('analyzeVisionBtn')?.addEventListener('click', () => this.handleAnalyzeVision())
        document.getElementById('visionViewReportBtn')?.addEventListener('click', () => this.handleViewVisionReport())

        // Settings Tab
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => this.handleSaveSettings())
        document.getElementById('testConnectionBtn')?.addEventListener('click', () => this.handleTestConnection())

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                this.toggleVisionAdvanced()
            }
        })
    }

    /**
     * Switch active tab
     */
    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(el => {
            el.style.display = 'none'
            el.classList.remove('active')
        })

        // Remove active class from buttons
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.classList.remove('active')
        })

        // Show selected tab
        const tabContent = document.getElementById(`${tabName}-tab`)
        if (tabContent) {
            tabContent.style.display = 'block'
            tabContent.classList.add('active')
        }

        // Mark button as active
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active')

        this.currentTab = tabName

        // Tab-specific initialization
        if (tabName === 'library') {
            this.populateLibraryView()
        } else if (tabName === 'vision') {
            this.populateVisionView()
        }
    }

    /**
     * Handle text-to-speech generation
     */
    async handleGenerate() {
        const text = document.getElementById('ttsTextInput')?.value
        const model = document.getElementById('modelSelect')?.value
        const voice = document.getElementById('voiceSelect')?.value
        const stability = document.getElementById('stabilitySlider')?.value || 0.5

        if (!text) {
            this.updateStatus('Please enter text to generate', 'error')
            return
        }

        this.setProcessing(true)
        this.updateStatus('Generating audio...', 'info')

        try {
            // Create generation proposal
            const proposal = this.managers.sentinel.createAudioGenerationProposal({
                type: 'tts',
                text,
                model,
                voice,
                stability: parseFloat(stability)
            })

            // Execute
            const result = await this.managers.sentinel.executeProposal(proposal)

            if (!result.ok) {
                throw new Error(result.message)
            }

            // Store in library
            const audioBlob = new Blob(
                [new Uint8Array(result.output.audioData)],
                { type: 'audio/mpeg' }
            )

            const libraryItem = this.managers.library.addAudio({
                name: `TTS - ${text.substring(0, 30)}`,
                type: 'tts',
                blob: audioBlob,
                duration: result.output.duration || 0,
                metadata: { model, voice, stability }
            })

            // Render waveform
            const canvas = document.getElementById('waveformCanvas')
            if (canvas) {
                this.managers.waveform.renderFromBlob(audioBlob, canvas)
            }

            this.updateStatus(`Generated: ${libraryItem.name}`, 'success')
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error')
            console.error('[Generate]', error)
        } finally {
            this.setProcessing(false)
        }
    }

    /**
     * Handle sound effects generation
     */
    async handleGenerateSFX() {
        const prompt = document.getElementById('sfxPromptInput')?.value
        const duration = document.getElementById('sfxDurationInput')?.value || 5

        if (!prompt) {
            this.updateStatus('Please enter SFX prompt', 'error')
            return
        }

        this.setProcessing(true)
        this.updateStatus('Generating SFX...', 'info')

        try {
            const proposal = this.managers.sentinel.createAudioGenerationProposal({
                type: 'sfx',
                prompt,
                duration: parseFloat(duration)
            })

            const result = await this.managers.sentinel.executeProposal(proposal)

            if (!result.ok) {
                throw new Error(result.message)
            }

            const audioBlob = new Blob(
                [new Uint8Array(result.output.audioData)],
                { type: 'audio/mpeg' }
            )

            const libraryItem = this.managers.library.addAudio({
                name: `SFX - ${prompt.substring(0, 30)}`,
                type: 'sfx',
                blob: audioBlob,
                duration: result.output.duration || parseFloat(duration),
                metadata: { prompt }
            })

            const canvas = document.getElementById('waveformCanvas')
            if (canvas) {
                this.managers.waveform.renderFromBlob(audioBlob, canvas)
            }

            this.updateStatus(`Generated: ${libraryItem.name}`, 'success')
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error')
            console.error('[GenerateSFX]', error)
        } finally {
            this.setProcessing(false)
        }
    }

    /**
     * Handle vision-based generation
     */
    async handleVisionGenerate() {
        const composition = document.getElementById('visionCompSelect')?.value

        if (!composition) {
            this.updateStatus('Please select a composition', 'error')
            return
        }

        this.setProcessing(true)
        this.updateStatus('Analyzing vision...', 'info')

        try {
            // Analyze timeline
            const analysis = await this.analyzer.analyzeTimeline(composition)

            // Get suggestions
            const suggestions = this.analyzer.getAudioSuggestions(analysis)
            const voiceContext = this.analyzer.suggestVoiceContext(analysis)
            const modelContext = this.analyzer.suggestModelContext(analysis)

            this.updateStatus('Detected: ' + suggestions.dominantLabels.join(', '), 'info')

            // Auto-generate based on suggestions
            const ttsProposal = this.managers.sentinel.createAudioGenerationProposal({
                type: 'tts',
                text: `${suggestions.mood} ${suggestions.pacing} audio`,
                model: modelContext.useCase,
                voice: voiceContext.gender || 'default',
                stability: 0.5
            })

            const result = await this.managers.sentinel.executeProposal(ttsProposal)

            if (!result.ok) {
                throw new Error(result.message)
            }

            const audioBlob = new Blob(
                [new Uint8Array(result.output.audioData)],
                { type: 'audio/mpeg' }
            )

            // Insert to timeline
            const insertResult = await this.managers.timeline.insertAudioToTimeline(
                audioBlob,
                0,
                `Vision-Generated - ${composition}`
            )

            this.managers.library.addAudio({
                name: `Vision - ${composition}`,
                type: 'vision',
                blob: audioBlob,
                duration: result.output.duration || 0,
                metadata: { composition, suggestions }
            })

            const canvas = document.getElementById('waveformCanvas')
            if (canvas) {
                this.managers.waveform.renderFromBlob(audioBlob, canvas)
            }

            this.updateStatus('Vision audio generated and inserted to timeline', 'success')
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error')
            console.error('[VisionGenerate]', error)
        } finally {
            this.setProcessing(false)
        }
    }

    /**
     * Populate library view
     */
    populateLibraryView() {
        const items = this.managers.library.getAllItems()
        const grid = document.getElementById('libraryGrid')

        if (!grid) return

        grid.innerHTML = ''

        if (items.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No audio in library</div>'
            return
        }

        items.forEach(item => {
            const card = document.createElement('div')
            card.className = 'library-card'
            card.innerHTML = `
                <div class="library-card-header">
                    <span class="tag tag-${item.type}">${item.type}</span>
                </div>
                <div class="library-card-body">
                    <h4>${item.name}</h4>
                    <p>${item.duration.toFixed(2)}s</p>
                    <div style="margin-top: 10px; font-size: 11px; color: #999;">
                        ${new Date(item.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <div class="library-card-actions">
                    <button onclick="window.uiController.playLibraryAudio('${item.id}')">Play</button>
                    <button onclick="window.uiController.insertLibraryAudio('${item.id}')">Insert</button>
                    <button onclick="window.uiController.deleteLibraryAudio('${item.id}')">Delete</button>
                </div>
            `
            grid.appendChild(card)
        })

        // Update stats
        const stats = this.managers.library.getStatistics()
        document.getElementById('librarystatsOutput')!.innerHTML = `
            <p><strong>Total Items:</strong> ${stats.totalItems}</p>
            <p><strong>Total Duration:</strong> ${stats.totalDuration.toFixed(2)}s</p>
            <p><strong>TTS:</strong> ${stats.byType.tts} | <strong>SFX:</strong> ${stats.byType.sfx} | <strong>Vision:</strong> ${stats.byType.vision}</p>
        `
    }

    /**
     * Handle library search
     */
    handleLibrarySearch(query) {
        const results = this.managers.library.searchAudio(query)
        const grid = document.getElementById('libraryGrid')

        if (!grid) return

        grid.innerHTML = ''

        if (results.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No results found</div>'
            return
        }

        results.forEach(item => {
            const card = document.createElement('div')
            card.className = 'library-card'
            card.innerHTML = `
                <div class="library-card-header">
                    <span class="tag tag-${item.type}">${item.type}</span>
                </div>
                <div class="library-card-body">
                    <h4>${item.name}</h4>
                    <p>${item.duration.toFixed(2)}s</p>
                </div>
                <div class="library-card-actions">
                    <button onclick="window.uiController.playLibraryAudio('${item.id}')">Play</button>
                    <button onclick="window.uiController.insertLibraryAudio('${item.id}')">Insert</button>
                    <button onclick="window.uiController.deleteLibraryAudio('${item.id}')">Delete</button>
                </div>
            `
            grid.appendChild(card)
        })
    }

    /**
     * Handle library filter
     */
    handleFilterBy(type) {
        if (type === 'all') {
            this.populateLibraryView()
            return
        }

        const items = this.managers.library.filterByType(type)
        const grid = document.getElementById('libraryGrid')

        if (!grid) return

        grid.innerHTML = ''

        items.forEach(item => {
            const card = document.createElement('div')
            card.className = 'library-card'
            card.innerHTML = `
                <div class="library-card-header">
                    <span class="tag tag-${item.type}">${item.type}</span>
                </div>
                <div class="library-card-body">
                    <h4>${item.name}</h4>
                    <p>${item.duration.toFixed(2)}s</p>
                </div>
                <div class="library-card-actions">
                    <button onclick="window.uiController.playLibraryAudio('${item.id}')">Play</button>
                    <button onclick="window.uiController.insertLibraryAudio('${item.id}')">Insert</button>
                    <button onclick="window.uiController.deleteLibraryAudio('${item.id}')">Delete</button>
                </div>
            `
            grid.appendChild(card)
        })
    }

    /**
     * Play audio from library
     */
    playLibraryAudio(audioId) {
        const item = this.managers.library.getAudio(audioId)
        if (item && item.blob) {
            const url = URL.createObjectURL(item.blob)
            const audio = new Audio(url)
            audio.play()
        }
    }

    /**
     * Insert audio from library to timeline
     */
    async insertLibraryAudio(audioId) {
        const item = this.managers.library.getAudio(audioId)
        if (!item || !item.blob) return

        this.setProcessing(true)
        this.updateStatus('Inserting to timeline...', 'info')

        try {
            await this.managers.timeline.insertAudioToTimeline(item.blob, 0, item.name)
            this.updateStatus(`Inserted: ${item.name}`, 'success')
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error')
        } finally {
            this.setProcessing(false)
        }
    }

    /**
     * Delete audio from library
     */
    deleteLibraryAudio(audioId) {
        if (confirm('Delete this audio?')) {
            this.managers.library.deleteAudio(audioId)
            this.populateLibraryView()
            this.updateStatus('Deleted', 'info')
        }
    }

    /**
     * Handle export library
     */
    handleExportLibrary() {
        const format = document.getElementById('exportFormatSelect')?.value || 'json'
        const data = format === 'json'
            ? this.managers.library.exportAsJSON()
            : this.managers.library.exportAsCSV()

        const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audio-library-${Date.now()}.${format === 'json' ? 'json' : 'csv'}`
        a.click()

        this.updateStatus('Exported', 'success')
    }

    /**
     * Handle clear library
     */
    handleClearLibrary() {
        if (confirm('Clear all audio from library? This cannot be undone.')) {
            this.managers.library.clear()
            this.populateLibraryView()
            this.updateStatus('Library cleared', 'info')
        }
    }

    /**
     * Populate vision view
     */
    populateVisionView() {
        const analysis = this.analyzer.getLastAnalysis()

        if (!analysis) {
            document.getElementById('visionResultsOutput')!.innerHTML = 'No analysis yet. Run "Analyze Vision" to get started.'
            return
        }

        const report = this.analyzer.getAnalysisReport(analysis)
        document.getElementById('visionResultsOutput')!.innerHTML = `<pre>${report}</pre>`
    }

    /**
     * Handle analyze vision
     */
    async handleAnalyzeVision() {
        const composition = document.getElementById('analyzeCompSelect')?.value

        if (!composition) {
            this.updateStatus('Please select a composition', 'error')
            return
        }

        this.setProcessing(true)
        this.updateStatus('Analyzing timeline...', 'info')

        try {
            const analysis = await this.analyzer.analyzeTimeline(composition)
            this.populateVisionView()
            this.updateStatus('Analysis complete', 'success')
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error')
            console.error('[AnalyzeVision]', error)
        } finally {
            this.setProcessing(false)
        }
    }

    /**
     * Handle view vision report
     */
    handleViewVisionReport() {
        const analysis = this.analyzer.getLastAnalysis()

        if (!analysis) {
            this.updateStatus('No analysis available', 'error')
            return
        }

        const report = this.analyzer.getAnalysisReport(analysis)
        const modal = document.createElement('div')
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `
        modal.innerHTML = `
            <div style="background: #2d2d2d; padding: 20px; max-width: 600px; border-radius: 8px; max-height: 80vh; overflow: auto;">
                <pre style="margin: 0; white-space: pre-wrap;">${report}</pre>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 20px; padding: 8px 16px;">Close</button>
            </div>
        `
        document.body.appendChild(modal)
    }

    /**
     * Handle save settings
     */
    handleSaveSettings() {
        const settings = {
            apiKey: document.getElementById('apiKeyInput')?.value,
            sentinelEndpoint: document.getElementById('sentinelEndpointInput')?.value,
            autoInsertAudio: (document.getElementById('autoInsertCheckbox') as HTMLInputElement)?.checked,
            theme: (document.getElementById('themeSelect') as HTMLSelectElement)?.value
        }

        localStorage.setItem('audioSentinelSettings', JSON.stringify(settings))
        this.updateStatus('Settings saved', 'success')
    }

    /**
     * Handle test connection
     */
    async handleTestConnection() {
        this.updateStatus('Testing connection...', 'info')

        try {
            const health = await this.managers.sentinel.healthCheck()

            if (health.ok) {
                this.updateStatus('✓ Sentinel: Connected | ✓ Controller: OK', 'success')
            } else {
                this.updateStatus('✗ Connection failed', 'error')
            }
        } catch (error) {
            this.updateStatus(`✗ Error: ${error.message}`, 'error')
        }
    }

    /**
     * Toggle vision advanced mode
     */
    toggleVisionAdvanced() {
        const advanced = document.getElementById('visionAdvancedOptions')
        if (advanced) {
            advanced.style.display = advanced.style.display === 'none' ? 'block' : 'none'
        }
    }

    /**
     * Update status bar
     */
    updateStatus(message, type = 'info') {
        const status = document.getElementById('statusMessage')

        if (status) {
            status.textContent = message
            status.className = `status-${type}`
        }

        console.log(`[Status] ${type}: ${message}`)
    }

    /**
     * Set processing state
     */
    setProcessing(processing) {
        this.isProcessing = processing

        // Disable/enable buttons
        document.querySelectorAll('button:not([data-tab])').forEach((btn: any) => {
            btn.disabled = processing
            btn.style.opacity = processing ? '0.5' : '1'
            btn.style.cursor = processing ? 'not-allowed' : 'pointer'
        })

        // Show/hide spinner
        const spinner = document.getElementById('processingSpinner')
        if (spinner) {
            spinner.style.display = processing ? 'block' : 'none'
        }
    }
}

export default UIController
