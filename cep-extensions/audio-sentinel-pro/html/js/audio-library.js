/**
 * Audio Library Manager
 * Manages saving, loading, and organizing generated audio
 */

class AudioLibrary {
    constructor() {
        this.storageKey = 'audioSentinel_library'
        this.library = this.loadLibrary()
    }

    /**
     * Load library from localStorage
     */
    loadLibrary() {
        try {
            const data = localStorage.getItem(this.storageKey)
            return data ? JSON.parse(data) : { items: [], metadata: {} }
        } catch (e) {
            console.error('Failed to load library:', e)
            return { items: [], metadata: {} }
        }
    }

    /**
     * Save library to localStorage
     */
    saveLibrary() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.library))
        } catch (e) {
            console.error('Failed to save library:', e)
        }
    }

    /**
     * Add audio to library
     */
    addAudio(audioData) {
        const item = {
            id: this.generateId(),
            name: audioData.name || `Audio ${Date.now()}`,
            type: audioData.type || 'tts', // tts, sfx, vision
            description: audioData.description || '',
            blob: audioData.blob,
            duration: audioData.duration,
            format: audioData.format || 'mp3',
            createdAt: new Date().toISOString(),
            metadata: audioData.metadata || {}
        }

        this.library.items.push(item)
        this.saveLibrary()

        return item
    }

    /**
     * Remove audio from library
     */
    removeAudio(id) {
        this.library.items = this.library.items.filter(item => item.id !== id)
        this.saveLibrary()
    }

    /**
     * Get audio by ID
     */
    getAudio(id) {
        return this.library.items.find(item => item.id === id)
    }

    /**
     * Get all audio
     */
    getAllAudio() {
        return this.library.items
    }

    /**
     * Search audio
     */
    searchAudio(query) {
        const q = query.toLowerCase()
        return this.library.items.filter(item =>
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.type.includes(q)
        )
    }

    /**
     * Filter by type
     */
    filterByType(type) {
        return this.library.items.filter(item => item.type === type)
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const items = this.library.items
        const totalDuration = items.reduce((sum, item) => sum + (item.duration || 0), 0)

        return {
            totalAudio: items.length,
            totalDuration,
            typeCounts: {
                tts: items.filter(i => i.type === 'tts').length,
                sfx: items.filter(i => i.type === 'sfx').length,
                vision: items.filter(i => i.type === 'vision').length
            },
            totalSize: this.estimateSize(),
            oldestDate: items.length > 0 ? items[0].createdAt : null,
            newestDate: items.length > 0 ? items[items.length - 1].createdAt : null
        }
    }

    /**
     * Estimate storage size in KB
     */
    estimateSize() {
        let size = 0
        this.library.items.forEach(item => {
            if (item.blob) {
                size += item.blob.length ? item.blob.length : JSON.stringify(item.blob).length
            }
        })
        return Math.round(size / 1024)
    }

    /**
     * Export audio as data URL
     */
    async exportAudioBlob(id) {
        const audio = this.getAudio(id)
        if (!audio || !audio.blob) {
            throw new Error('Audio not found')
        }

        // If blob is base64 string
        if (typeof audio.blob === 'string') {
            return `data:audio/${audio.format};base64,${audio.blob}`
        }

        // If blob is actual Blob object
        return URL.createObjectURL(audio.blob)
    }

    /**
     * Clear library
     */
    clearLibrary() {
        this.library = { items: [], metadata: {} }
        this.saveLibrary()
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Export library as JSON
     */
    exportAsJSON() {
        return JSON.stringify(this.library, null, 2)
    }

    /**
     * Export library as CSV (metadata only)
     */
    exportAsCSV() {
        const headers = ['ID', 'Name', 'Type', 'Duration', 'Format', 'Created']
        const rows = this.library.items.map(item => [
            item.id,
            item.name,
            item.type,
            item.duration.toFixed(2),
            item.format,
            new Date(item.createdAt).toLocaleString()
        ])

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        return csv
    }

    /**
     * Import library from JSON
     */
    importFromJSON(jsonString) {
        try {
            const imported = JSON.parse(jsonString)
            if (imported.items && Array.isArray(imported.items)) {
                this.library.items = [...this.library.items, ...imported.items]
                this.saveLibrary()
                return { success: true, imported: imported.items.length }
            }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }

    /**
     * Batch operations
     */
    getBatch(ids) {
        return ids.map(id => this.getAudio(id)).filter(Boolean)
    }

    removeBatch(ids) {
        ids.forEach(id => this.removeAudio(id))
    }

    /**
     * Organize library (add tags, categories, etc.)
     */
    tagAudio(id, tags = []) {
        const audio = this.getAudio(id)
        if (audio) {
            audio.tags = tags
            this.saveLibrary()
        }
    }

    /**
     * Get by tags
     */
    getByTags(tags) {
        return this.library.items.filter(item =>
            item.tags && item.tags.some(tag => tags.includes(tag))
        )
    }
}

export default AudioLibrary
