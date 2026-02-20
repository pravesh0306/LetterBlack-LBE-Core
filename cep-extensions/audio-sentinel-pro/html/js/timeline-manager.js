/**
 * Timeline Manager
 * Handles direct insertion of audio to After Effects timeline
 */

class TimelineManager {
    constructor() {
        this.csInterface = new CSInterface()
    }

    /**
     * Insert audio file to active composition
     */
    async insertAudioToTimeline(audioPath, startTime = 0, name = 'Audio') {
        const jsxScript = `
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                throw new Error("Please select a composition first");
            }

            var audioFile = new File("${audioPath.replace(/\\/g, '/')}");
            if (!audioFile.exists) {
                throw new Error("Audio file not found: ${audioPath}");
            }

            var footageItem = app.project.importFile(new ImportOptions(audioFile));
            
            var audioLayer = comp.layers.add(footageItem);
            audioLayer.name = "${name}";
            audioLayer.startTime = ${startTime};

            // Auto-parent to sync with video if preferred
            JSON.stringify({
                success: true,
                layerName: audioLayer.name,
                layerIndex: audioLayer.index,
                duration: footageItem.duration,
                startTime: audioLayer.startTime
            });
        `

        return new Promise((resolve, reject) => {
            this.csInterface.evalScript(jsxScript, (result) => {
                try {
                    const parsed = JSON.parse(result)
                    if (parsed.success) {
                        resolve(parsed)
                    } else {
                        reject(new Error(parsed.error || 'Unknown error'))
                    }
                } catch (e) {
                    reject(new Error(`Failed to insert audio: ${result}`))
                }
            })
        })
    }

    /**
     * Get active composition details
     */
    async getActiveComposition() {
        const jsxScript = `
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                throw new Error("No active composition");
            }

            JSON.stringify({
                name: comp.name,
                width: comp.width,
                height: comp.height,
                frameRate: comp.frameRate,
                duration: comp.duration,
                numLayers: comp.numLayers,
                audioChannels: comp.audioChannels,
                audioDepth: comp.audioDepth
            });
        `

        return new Promise((resolve, reject) => {
            this.csInterface.evalScript(jsxScript, (result) => {
                try {
                    resolve(JSON.parse(result))
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    /**
     * Get all comps in project
     */
    async getProjectCompositions() {
        const jsxScript = `
            var comps = [];
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem) {
                    comps.push({
                        name: item.name,
                        width: item.width,
                        height: item.height,
                        frameRate: item.frameRate,
                        duration: item.duration
                    });
                }
            }
            JSON.stringify(comps);
        `

        return new Promise((resolve, reject) => {
            this.csInterface.evalScript(jsxScript, (result) => {
                try {
                    resolve(JSON.parse(result))
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    /**
     * Set current time in active comp
     */
    async setCompositionTime(timeInSeconds) {
        const jsxScript = `
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                throw new Error("No active composition");
            }
            
            comp.time = ${timeInSeconds};
            JSON.stringify({ time: comp.time });
        `

        return new Promise((resolve, reject) => {
            this.csInterface.evalScript(jsxScript, (result) => {
                try {
                    resolve(JSON.parse(result))
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    /**
     * Create adjustment layer for audio
     */
    async createAudioPlaceholder(name = 'Audio Placeholder', duration = 5) {
        const jsxScript = `
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                throw new Error("No active composition");
            }

            // Create a solid as placeholder
            var solid = comp.layers.addSolid([0, 0, 0], "${name}", comp.width, 1, 1, ${duration});
            solid.comment = "Audio layer - replace with actual audio";

            JSON.stringify({
                name: solid.name,
                index: solid.index,
                duration: solid.duration
            });
        `

        return new Promise((resolve, reject) => {
            this.csInterface.evalScript(jsxScript, (result) => {
                try {
                    resolve(JSON.parse(result))
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    /**
     * Extract composition for timeline vision
     */
    async extractCompositionFrames(compName, frameInterval = 15, maxFrames = 100) {
        const jsxScript = `
            var comp = app.project.itemByName("${compName}");
            if (!comp || !(comp instanceof CompItem)) {
                throw new Error("Composition not found");
            }

            var frames = [];
            var totalFrames = Math.ceil(comp.duration * comp.frameRate);
            var interval = ${frameInterval};
            var maxFrames = ${maxFrames};
            var count = 0;

            for (var i = 0; i < totalFrames && count < maxFrames; i += interval) {
                var time = i / comp.frameRate;
                frames.push({
                    frameIndex: i,
                    time: time,
                    frameRate: comp.frameRate
                });
                count++;
            }

            JSON.stringify({
                compositionName: comp.name,
                totalFrames: totalFrames,
                extractedFrames: frames.length,
                frames: frames
            });
        `

        return new Promise((resolve, reject) => {
            this.csInterface.evalScript(jsxScript, (result) => {
                try {
                    resolve(JSON.parse(result))
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    /**
     * Play preview in AE
     */
    async playPreview(fromTime = 0, toTime = null) {
        const jsxScript = `
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                throw new Error("No active composition");
            }

            var endTime = ${toTime !== null ? toTime : 'comp.duration'};
            comp.time = ${fromTime};

            // Start preview
            app.myDoCommand(2, 16, false); // Play/Pause command

            JSON.stringify({ playing: true });
        `

        return new Promise((resolve) => {
            this.csInterface.evalScript(jsxScript, () => {
                resolve({ playing: true })
            })
        })
    }
}

export default TimelineManager
