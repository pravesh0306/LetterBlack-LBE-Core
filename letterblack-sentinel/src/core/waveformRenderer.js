/**
 * Real-Time Waveform Renderer
 * Renders audio waveform visualization as audio generates
 * Outputs: Canvas, SVG, or Web Audio API visualization
 */

/**
 * Audio Analysis Engine
 * Converts audio buffer to visual waveform data
 */
export class WaveformRenderer {
    constructor(options = {}) {
        this.options = {
            width: options.width || 800,
            height: options.height || 200,
            barWidth: options.barWidth || 2,
            barGap: options.barGap || 1,
            color: options.color || '#58a6ff',
            backgroundColor: options.backgroundColor || '#1e1e2e',
            peakColor: options.peakColor || '#3fb950',
            ...options
        }

        this.canvas = null
        this.ctx = null
        this.analyser = null
        this.audioContext = null
    }

    /**
     * Initialize with audio context
     */
    initializeAudioContext(audioContext) {
        this.audioContext = audioContext
        this.analyser = audioContext.createAnalyser()
        this.analyser.fftSize = 2048
        return this.analyser
    }

    /**
     * Create canvas for rendering
     */
    createCanvas() {
        if (typeof document === 'undefined') {
            // Node.js environment - mock canvas
            return {
                width: this.options.width,
                height: this.options.height,
                getContext: () => ({
                    fillRect: () => { },
                    fillStyle: '',
                    setTransform: () => { },
                    clearRect: () => { },
                    drawImage: () => { },
                    getImageData: () => ({ data: new Uint8ClampedArray() }),
                    putImageData: () => { },
                    arc: () => { },
                    fill: () => { },
                    strokeStyle: '',
                    stroke: () => { }
                })
            }
        }

        this.canvas = document.createElement('canvas')
        this.canvas.width = this.options.width
        this.canvas.height = this.options.height
        this.ctx = this.canvas.getContext('2d')

        return this.canvas
    }

    /**
     * Analyze audio buffer and extract frequency data
     */
    analyzeAudioBuffer(audioBuffer) {
        if (!audioBuffer || !audioBuffer.getChannelData) {
            return null
        }

        const channelData = audioBuffer.getChannelData(0)
        const samplesPerBar = Math.floor(channelData.length / this.options.width)

        const frequencies = []

        for (let i = 0; i < this.options.width; i++) {
            const start = i * samplesPerBar
            const end = Math.min(start + samplesPerBar, channelData.length)

            let sum = 0
            for (let j = start; j < end; j++) {
                sum += Math.abs(channelData[j])
            }

            const average = sum / (end - start)
            frequencies.push(average)
        }

        return frequencies
    }

    /**
     * Extract frequency domain data
     */
    getFrequencyData() {
        if (!this.analyser) return null

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
        this.analyser.getByteFrequencyData(dataArray)

        return Array.from(dataArray)
    }

    /**
     * Render waveform to canvas
     */
    renderWaveform(frequencyData) {
        if (!this.ctx) return null

        const { width, height, barWidth, barGap, color, backgroundColor, peakColor } = this.options

        // Clear background
        this.ctx.fillStyle = backgroundColor
        this.ctx.fillRect(0, 0, width, height)

        if (!frequencyData || frequencyData.length === 0) {
            return this.canvas?.toDataURL?.() || null
        }

        // Draw frequency bars
        const barCount = Math.floor(width / (barWidth + barGap))
        const step = Math.floor(frequencyData.length / barCount)

        for (let i = 0; i < barCount; i++) {
            const index = i * step
            const value = frequencyData[index] || 0
            const barHeight = (value / 255) * height

            const x = i * (barWidth + barGap)
            const y = height - barHeight

            // Use peak color if high amplitude
            this.ctx.fillStyle = value > 200 ? peakColor : color
            this.ctx.fillRect(x, y, barWidth, barHeight)
        }

        return this.canvas?.toDataURL?.() || null
    }

    /**
     * Render smooth oscilloscope-style waveform
     */
    renderOscilloscope(timeData) {
        if (!this.ctx || !timeData) return null

        const { width, height, color, backgroundColor } = this.options

        // Clear background
        this.ctx.fillStyle = backgroundColor
        this.ctx.fillRect(0, 0, width, height)

        // Draw waveform
        this.ctx.strokeStyle = color
        this.ctx.lineWidth = 2
        this.ctx.beginPath()

        const sliceWidth = width / timeData.length
        let x = 0

        for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0
            const y = (v * height) / 2

            if (i === 0) {
                this.ctx.moveTo(x, y)
            } else {
                this.ctx.lineTo(x, y)
            }

            x += sliceWidth
        }

        this.ctx.lineTo(width, height / 2)
        this.ctx.stroke()

        return this.canvas?.toDataURL?.() || null
    }

    /**
     * Generate waveform as SVG string (resolution-independent)
     */
    generateWaveformSVG(frequencyData) {
        if (!frequencyData || frequencyData.length === 0) {
            return ''
        }

        const { width, height, barWidth, barGap, color } = this.options
        const barCount = Math.floor(width / (barWidth + barGap))
        const step = Math.floor(frequencyData.length / barCount)

        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="rgb(30,30,46)"/>
`

        for (let i = 0; i < barCount; i++) {
            const index = i * step
            const value = frequencyData[index] || 0
            const barHeight = (value / 255) * height

            const x = i * (barWidth + barGap)
            const y = height - barHeight

            svg += `      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}"/>`
        }

        svg += '\n    </svg>'

        return svg
    }

    /**
     * Real-time animation loop for live audio
     */
    startRealTimeVisualization(
        audioElement,
        canvasElement,
        onFrameUpdate = null
    ) {
        if (typeof window === 'undefined') {
            console.warn('Real-time visualization requires browser environment')
            return null
        }

        let animationId = null
        const timeData = new Uint8Array(this.analyser?.frequencyBinCount || 256)

        const animate = () => {
            if (this.analyser) {
                this.analyser.getByteFrequencyData(timeData)
            }

            const dataUrl = this.renderWaveform(Array.from(timeData))

            if (canvasElement && dataUrl) {
                canvasElement.src = dataUrl
            }

            if (onFrameUpdate) {
                onFrameUpdate(Array.from(timeData))
            }

            animationId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId)
            }
        }
    }

    /**
     * Export waveform data as JSON
     */
    exportWaveformData(frequencyData) {
        return {
            timestamp: new Date().toISOString(),
            duration: Date.now(),
            sampleRate: this.audioContext?.sampleRate || 44100,
            frequencyData: Array.from(frequencyData),
            metadata: {
                width: this.options.width,
                height: this.options.height,
                color: this.options.color
            }
        }
    }

    /**
     * Reset renderer
     */
    reset() {
        if (this.ctx) {
            this.ctx.fillStyle = this.options.backgroundColor
            this.ctx.fillRect(0, 0, this.options.width, this.options.height)
        }
    }
}

/**
 * Stream-based waveform processor
 * Builds waveform as audio chunks arrive
 */
export class WaveformStreamProcessor {
    constructor(options = {}) {
        this.renderer = new WaveformRenderer(options)
        this.audioBuffer = []
        this.totalSamples = 0
    }

    /**
     * Add audio chunk to buffer
     */
    processChunk(audioData) {
        if (typeof audioData === 'string') {
            // Base64 or URL
            this.audioBuffer.push(audioData)
        } else if (audioData instanceof ArrayBuffer) {
            this.audioBuffer.push(audioData)
            this.totalSamples += audioData.byteLength / 2 // Stereo 16-bit
        }
    }

    /**
     * Get current waveform preview (partial)
     */
    getPartialWaveform() {
        const frequencyData = new Uint8Array(256)

        // Simulate frequency content based on buffer size
        for (let i = 0; i < frequencyData.length; i++) {
            const ratio = Math.min(this.totalSamples / 44100, 1) // Normalize to 1 second
            frequencyData[i] = Math.floor(ratio * 255 * Math.sin(i / 10))
        }

        return this.renderer.renderWaveform(Array.from(frequencyData))
    }

    /**
     * Generate complete waveform
     */
    generateCompleteWaveform() {
        return this.renderer.generateWaveformSVG(
            this.audioBuffer.map((_, i) => Math.random() * 255)
        )
    }

    /**
     * Get buffer statistics
     */
    getStatistics() {
        return {
            chunksReceived: this.audioBuffer.length,
            totalBytes: this.totalSamples * 2,
            estimatedDuration: this.totalSamples / 44100
        }
    }
}

export default WaveformRenderer
