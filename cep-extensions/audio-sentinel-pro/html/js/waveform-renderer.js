/**
 * Waveform Renderer
 * Real-time waveform visualization for CEP extension
 */

class CEPWaveformRenderer {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null
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

        if (this.canvas) {
            this.canvas.width = this.options.width
            this.canvas.height = this.options.height
        }
    }

    /**
     * Render waveform from frequency data
     */
    renderWaveform(frequencyData) {
        if (!this.ctx || !frequencyData || frequencyData.length === 0) {
            return
        }

        const { width, height, barWidth, barGap, color, backgroundColor, peakColor } = this.options

        // Clear background
        this.ctx.fillStyle = backgroundColor
        this.ctx.fillRect(0, 0, width, height)

        // Calculate bars
        const barCount = Math.floor(width / (barWidth + barGap))
        const step = Math.floor(frequencyData.length / barCount)

        // Draw bars
        for (let i = 0; i < barCount; i++) {
            const index = i * step
            const value = frequencyData[index] || 0
            const barHeight = (value / 255) * height

            const x = i * (barWidth + barGap)
            const y = height - barHeight

            // Use peak color for high amplitude
            this.ctx.fillStyle = value > 200 ? peakColor : color
            this.ctx.fillRect(x, y, barWidth, barHeight)
        }
    }

    /**
     * Render oscilloscope style waveform
     */
    renderOscilloscope(timeData) {
        if (!this.ctx || !timeData) {
            return
        }

        const { width, height, color, backgroundColor } = this.options

        // Clear
        this.ctx.fillStyle = backgroundColor
        this.ctx.fillRect(0, 0, width, height)

        // Draw waveform
        this.ctx.strokeStyle = color
        this.ctx.lineWidth = 1.5
        this.ctx.beginPath()

        const sliceWidth = width / timeData.length

        for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128
            const y = (v * height) / 2

            if (i === 0) {
                this.ctx.moveTo(0, y)
            } else {
                this.ctx.lineTo(i * sliceWidth, y)
            }
        }

        this.ctx.lineTo(width, height / 2)
        this.ctx.stroke()
    }

    /**
     * Render from audio blob
     */
    async renderFromBlob(blob) {
        try {
            // Convert blob to audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const arrayBuffer = await blob.arrayBuffer()
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

            // Get channel data
            const rawData = audioBuffer.getChannelData(0)

            // Downsample for visualization
            const blockSize = Math.floor(rawData.length / this.options.width)
            const filteredData = []

            for (let i = 0; i < this.options.width; i++) {
                let sum = 0
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(rawData[i * blockSize + j])
                }
                filteredData.push(sum / blockSize)
            }

            // Normalize
            const max = Math.max(...filteredData)
            const normalized = filteredData.map(v => (v / max) * 255)

            this.renderWaveform(normalized)

            return {
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels
            }
        } catch (error) {
            console.error('Failed to render waveform from blob:', error)
        }
    }

    /**
     * Animate waveform
     */
    animateWaveform(data, duration = 2000) {
        const startTime = Date.now()
        const dataLength = data.length

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Slice data based on progress
            const currentLength = Math.floor(dataLength * progress)
            const currentData = data.slice(0, currentLength)

            this.renderWaveform(currentData)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        animate()
    }

    /**
     * Clear canvas
     */
    clear() {
        if (!this.ctx) return

        this.ctx.fillStyle = this.options.backgroundColor
        this.ctx.fillRect(0, 0, this.options.width, this.options.height)
    }

    /**
     * Add frequency spectrum visualization
     */
    renderSpectrum(frequencyData, style = 'bars') {
        if (style === 'bars') {
            this.renderWaveform(frequencyData)
        } else if (style === 'wave') {
            this.renderOscilloscope(frequencyData)
        }
    }

    /**
     * Export canvas as image
     */
    exportAsImage(format = 'png') {
        if (!this.canvas) return null

        if (format === 'png') {
            return this.canvas.toDataURL('image/png')
        } else if (format === 'jpeg') {
            return this.canvas.toDataURL('image/jpeg', 0.9)
        }
        return null
    }

    /**
     * Get waveform as SVG
     */
    getSVG(frequencyData) {
        if (!frequencyData || frequencyData.length === 0) {
            return ''
        }

        const { width, height, color } = this.options
        const barCount = Math.floor(width / (this.options.barWidth + this.options.barGap))
        const step = Math.floor(frequencyData.length / barCount)

        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${width}" height="${height}" fill="${this.options.backgroundColor}"/>
        `

        for (let i = 0; i < barCount; i++) {
            const index = i * step
            const value = frequencyData[index] || 0
            const barHeight = (value / 255) * height
            const x = i * (this.options.barWidth + this.options.barGap)
            const y = height - barHeight

            svg += `<rect x="${x}" y="${y}" width="${this.options.barWidth}" height="${barHeight}" fill="${color}"/>`
        }

        svg += '</svg>'
        return svg
    }
}

export default CEPWaveformRenderer
