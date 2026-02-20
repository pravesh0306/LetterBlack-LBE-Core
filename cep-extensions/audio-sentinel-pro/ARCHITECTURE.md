# Audio Sentinel Pro - Architecture & Development Guide

**Understanding the module structure and how to extend the system**

## Overview

Audio Sentinel Pro is built on a **modular architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (HTML/CSS)                │
├─────────────────────────────────────────────────────────────┤
│                   UI Controller (Event Handler)              │
├─────────────────────────────────────────────────────────────┤
│  Timeline Manager │ Audio Library │ Waveform Renderer   │ Vision Analyzer │
├─────────────────────────────────────────────────────────────┤
│                    Sentinel Bridge (Governance)             │
├─────────────────────────────────────────────────────────────┤
│        Sentinel Controller (4-Layer Validation + Audit)     │
├─────────────────────────────────────────────────────────────┤
│     ElevenLabs API    │    Google Vision API    │   AE JSX   │
└─────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### 1. `main.js` - Entry Point

**Purpose:** Extension initialization and lifecycle management

**Responsibilities:**
- Load settings from localStorage
- Initialize all managers in correct order
- Populate UI dropdowns (compositions, voices, models)
- Register event handlers
- Set up auto-save interval
- Handle panel unload cleanup
- Create global `window.appState` for debugging

**Key Functions:**
```javascript
initializeExtension()           // Main init
loadSettings()                  // Get user preferences
populateCompositionDropdowns()  // AE compositions
populateVoiceModels()          // ElevenLabs voices
checkSentinelConnectivity()    // Health check
setupAutoSave()                // Periodic persistence
```

**Initialization Order (Critical!):**
```
1. CSInterface → 2. Settings → 3. SentinelBridge → 4. Managers → 
5. Vision Analyzer → 6. UIController → 7. Populate UI → 8. Status
```

**Why Order Matters:**
- UIController needs managers to exist before wiring events
- SentinelBridge must be ready before vision analyzer
- Dropdowns populate after managers exist
- Status updates happen at end

### 2. `ui-controller.js` - Event Orchestration

**Purpose:** Manage all user interactions and state flow

**Responsibilities:**
- Tab switching and visibility
- Button event handlers
- Form input validation
- Progress indicators
- Status messages
- State management
- Library UI population

**Key Methods:**

```javascript
// Tab Management
switchTab(tabName)              // Show/hide tabs
setProcessing(bool)             // Lock UI during operation
updateStatus(msg, type)         // Update status bar

// Generation
handleGenerate()                // TTS generation
handleGenerateSFX()             // SFX generation
handleVisionGenerate()          // Vision-based audio

// Library
populateLibraryView()           // Render library grid
handleLibrarySearch(query)      // Full-text search
handleFilterBy(type)            // Filter TTS|SFX|Vision
playLibraryAudio(id)            // Play preview
insertLibraryAudio(id)          // Add to timeline
deleteLibraryAudio(id)          // Remove from library

// Vision
handleAnalyzeVision()           // Analyze composition
handleViewVisionReport()        // Show analysis modal

// Settings
handleSaveSettings()            // Persist preferences
handleTestConnection()          // Test Sentinel connectivity
```

**Event Wiring Pattern:**
```javascript
document.getElementById('myButton')?.addEventListener('click', () => {
    this.handleMyFeature()
})
```

**Processing State:**
```javascript
this.setProcessing(true)     // Disable UI, show spinner
try {
    const result = await this.sentinelBridge.executeProposal(...)
} finally {
    this.setProcessing(false) // Re-enable UI
}
```

### 3. `timeline-manager.js` - Adobe After Effects Integration

**Purpose:** Bridge between CEP panel and AE native functionality

**Responsibilities:**
- Insert audio layers to compositions
- Extract timeline frames for vision analysis
- Get composition metadata
- Execute JSX scripts safely
- Handle AE errors

**Key Methods:**

```javascript
// Composition Access
getProjectCompositions()        // List all compositions
getActiveComposition()          // Get current composition
getCompositionInfo(name)        // Get metadata (width, height, fps)

// Timeline Operations
insertAudioToTimeline(blob, startTime, name)  // Add audio layer
extractCompositionFrames(name, interval)      // Sample frames
playPreview(audioBlob)          // Preview audio in AE

// JSX Execution
safeCEPEvalScript(code)        // Execute with timeout protection
```

**Audio Insertion Flow:**
```javascript
// 1. Convert blob to base64
const base64 = await blobToBase64(audioBlob)

// 2. Execute JSX to import and add layer
const jsx = `
    var comp = app.project.activeItem;
    var audioFile = new File("/tmp/audio.mp3");
    audioFile.write(base64Data);
    
    var layer = comp.layers.add(audioFile);
    layer.startTime = ${startTime};
    layer.audioEnabled = true;
`

// 3. Return layer info
return { success: true, layerName, duration }
```

**Error Handling:**
- Timeout protection (30 seconds default)
- JSX syntax errors caught
- Missing composition errors handled
- File permission errors recoverable

### 4. `audio-library.js` - Persistent Storage

**Purpose:** Manage user's generated audio collection

**Responsibilities:**
- Store audio blobs with metadata
- Full-text search capability
- Filtering and sorting
- Statistics calculation
- Import/export functionality
- localStorage persistence

**Key Methods:**

```javascript
// CRUD
addAudio(audioData)             // Store audio
getAudio(id)                    // Retrieve by ID
getAllItems()                   // Get all items
deleteAudio(id)                 // Remove audio
updateAudio(id, updates)        // Modify metadata

// Search & Filter
searchAudio(query)              // Full-text search
filterByType(type)              // TTS|SFX|Vision filter

// Statistics
getStatistics()                 // Get counts, durations, breakdown

// Import/Export
exportAsJSON()                  // Array format
exportAsCSV()                   // Spreadsheet format
importFromJSON(data)            // Bulk import

// Metadata
tagAudio(id, tags)              // Add tags to audio
getAudioMetadata(id)            // Get all metadata
```

**Data Structure:**
```javascript
{
    id: "uuid-unique-id",
    name: "TTS - Hello world",
    type: "tts|sfx|vision",
    blob: Blob,                // Audio file
    duration: 3.5,             // Seconds
    createdAt: "2026-02-20T...",
    metadata: {
        model: "eleven_turbo_v2",
        voice: "Rachel",
        stability: 0.5,
        // Type-specific metadata
    },
    tags: ["demo", "test"]
}
```

**Storage:**
```javascript
// Stored in localStorage
localStorage['audioLibrary'] = JSON.stringify({
    version: 1,
    items: [/* array of audio items */],
    lastUpdated: timestamp
})
```

**Important:**
- Blobs are serialized as base64 during save
- localStorage limit ~5-10 MB (may need upgrade for large collections)
- Auto-save every 30 seconds from main.js
- User can export for backup

### 5. `sentinel-bridge.js` - Governance Integration

**Purpose:** Create and execute cryptographically signed proposals

**Responsibilities:**
- Generate Ed25519 signatures
- Create proposal envelopes
- Submit to Sentinel Controller
- Handle 4-layer validation responses
- Poll for results
- Manage health checks

**Key Methods:**

```javascript
// Proposal Creation
createTimelineVisionProposal(...)      // Extract frames
createVisionAnalysisProposal(...)      // Analyze frames
createModelDetectionProposal(...)      // Select model/voice
createAudioGenerationProposal(...)     // Generate audio
createCustomProposal(...)              // Generic proposal

// Execution
signProposal(proposal)                 // Ed25519 sign
submitProposal(proposal)               // Send to controller
executeProposal(proposal)              // Sign + submit + wait
healthCheck()                          // Controller status
```

**Proposal Generation:**
```javascript
// 1. Create unsigned proposal
const proposal = {
    id: 'EXTRACT_TIMELINE_FRAMES',
    commandId: generateUUID(),
    requesterId: 'cep:ae-audio-sentinel-v1',
    timestamp: Math.floor(Date.now() / 1000),
    nonce: generateNonce64Hex(),
    requires: ['cepTimelineVision:extract'],
    payload: { /* operation-specific */ }
}

// 2. Sign with Ed25519
const signed = this.signProposal(proposal)

// 3. Submit to http://localhost:3000/run
const result = await this.executeProposal(signed)
```

**Response Structure:**
```javascript
{
    commandId: "uuid",
    decision: "ALLOW|DENY",
    reason: "ALLOW|POLICY_DENIED|SIGNATURE_INVALID|...",
    checks: {
        schema: true|false,
        signature: true|false,
        nonce: true|false,
        policy: true|false
    },
    output: { /* operation results */ }
}
```

**Error Handling:**
```javascript
// Distinguish validation failures from execution errors
if (!result.ok) {
    const reason = result.reason  // POLICY_DENIED, SIGNATURE_INVALID, etc.
    throw new ValidationError(reason)
} else if (result.output.status === 'error') {
    const error = result.output.error  // Execution error
    throw new ExecutionError(error)
}
```

### 6. `vision-analyzer.js` - Visual Recognition Pipeline

**Purpose:** Analyze timeline frames and suggest audio

**Responsibilities:**
- Orchestrate 4-stage extraction/analysis
- Consolidate vision results
- Generate audio suggestions
- Match voices/models to visuals
- Format analysis reports

**Key Methods:**

```javascript
// Main Pipeline
analyzeTimeline(compositionName, frameInterval)  // Full 4-stage pipeline

// Results Processing
getAudioSuggestions(analysis)           // Mood, pacing, intensity
suggestVoiceContext(analysis)           // Gender, accent, tone
suggestModelContext(analysis)           // Quality, use case
getAnalysisReport(analysis)             // Formatted report
getLastAnalysis()                       // Cached result
clearAnalysis()                         // Reset cache
```

**4-Stage Pipeline:**

```javascript
// Stage 1: Extract Frames
const extractionProposal = this.sentinel.createTimelineVisionProposal(comp)
const extraction = await this.sentinel.executeProposal(extractionProposal)
// Returns: { framesExtracted: N, samples: [ { file, timestamp } ] }

// Stage 2: Analyze Frames
const analysisProposal = this.sentinel.createVisionAnalysisProposal(extraction.samples)
const analysis = await this.sentinel.executeProposal(analysisProposal)
// Returns: { consolidated: { audioProfile, dominantLabels, detectedObjects } }

// Stage 3: Detect Model (Implicit in client)
const voiceContext = this.suggestVoiceContext(analysis)
const modelContext = this.suggestModelContext(analysis)

// Stage 4: Generate Audio
const ttsProposal = this.sentinel.createAudioGenerationProposal({
    type: 'tts',
    text: suggestions,
    model: modelContext.useCase,
    voice: voiceContext.gender
})
```

**Analysis Result Structure:**
```javascript
{
    audioProfile: {
        mood: 'ambient|energetic|calm|...',
        pacing: 'fast|moderate|slow',
        intensity: 'low|medium|high',
        suggestions: ['music', 'action', 'people', ...]
    },
    dominantLabels: [
        { label: 'nature', confidence: 0.95 },
        { label: 'outdoor', confidence: 0.89 }
    ],
    detectedObjects: [
        { object: 'tree', confidence: 0.92 },
        { object: 'person', confidence: 0.87 }
    ]
}
```

### 7. `waveform-renderer.js` - Visualization Engine

**Purpose:** Display real-time audio waveforms

**Responsibilities:**
- Canvas-based waveform rendering
- Frequency bar visualization
- Oscilloscope mode
- Audio blob processing
- Export to image formats
- Stream rendering (progressive)

**Key Methods:**

```javascript
// Rendering
renderWaveform(audioBlob, canvas, options)       // Frequency bars
renderOscilloscope(audioBlob, canvas, options)   // Wave form
renderFromBlob(blob, canvas)                     // Auto-detect mode
animateWaveform(canvas, updateFunction)          // Progressive

// Export
exportAsImage(format)                            // PNG|JPEG
getSVG()                                         // Vector format
```

**Waveform Rendering Flow:**
```javascript
// 1. Decode audio blob
const audioContext = new (window.AudioContext || window.webkitAudioContext)()
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

// 2. Extract frequency data
const analyser = audioContext.createAnalyser()
analyser.fftSize = 2048
const dataArray = new Uint8Array(analyser.frequencyBinCount)

// 3. Draw on canvas
const canvas = document.getElementById('waveformCanvas')
const ctx = canvas.getContext('2d')
ctx.fillStyle = 'rgb(58, 181, 255)'  // ElevenLabs blue
for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height
    ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth, barHeight)
}
```

## Data Flow Examples

### Complete TTS Generation Flow

```
User Input
  ↓ [textarea: "Hello world"]
  ↓
UIController.handleGenerate()
  ↓
Get form values (text, voice, model, stability)
  ↓
Create Proposal
  ↓ [SentinelBridge.createAudioGenerationProposal()]
  ↓ { type: 'tts', text, model, voice, stability }
  ↓
Sign Proposal
  ↓ [Ed25519 signature added]
  ↓
Execute Proposal
  ↓ [POST http://localhost:3000/run]
  ↓
Sentinel Controller (4-Layer Validation)
  ✓ Schema check
  ✓ Signature check
  ✓ Nonce check
  ✓ Policy check
  ↓
Execute Adapter (cepTimelineVision or similar)
  ↓ [Call ElevenLabs API with model/voice]
  ↓
Return Audio Data
  ↓ [Blob, duration, metadata]
  ↓
Audit Log Entry (Hash-chain)
  ↓
Back to Client
  ↓
Create Blob from audio data
  ↓
Add to Library
  ↓ [AudioLibrary.addAudio()]
  ↓
Render Waveform
  ↓ [WaveformRenderer.renderFromBlob()]
  ↓
Update Status ("Generated: TTS - Hello world")
  ↓
Save to localStorage (auto-save)
```

### Timeline Vision Analysis Flow

```
User Input
  ↓ [Select composition, click "Analyze Vision"]
  ↓
UIController.handleAnalyzeVision()
  ↓
VisionAnalyzer.analyzeTimeline(compositionName)
  ↓
Stage 1: Extract Frames
  ↓ [SentinelBridge.createTimelineVisionProposal()]
  ↓ [POST to Controller → cepTimelineVision adapter]
  ↓ [CSInterface → JSX → getFrames() every N frames]
  ↓
Sentinel Returns Frames
  ↓ [{ framesExtracted: 50, samples: [...] }]
  ↓
Stage 2: Analyze Vision
  ↓ [SentinelBridge.createVisionAnalysisProposal()]
  ↓ [POST to Controller]
  ↓ [Calls Google Vision API + local heuristics]
  ↓
Sentinel Returns Analysis
  ↓ [{ consolidated: { audioProfile, labels, objects } }]
  ↓
Cache Analysis
  ↓ [VisionAnalyzer.lastAnalysis = result]
  ↓
UI Displays Report
  ↓ [Populate visionResultsOutput with formatted text]
  ↓
User Clicks "Generate from Vision"
  ↓
UIController.handleVisionGenerate()
  ↓
Get Suggestions
  ↓ [VisionAnalyzer.getAudioSuggestions()]
  ↓ [Extract mood, pacing, dominant labels]
  ↓
Generate Audio
  ↓ [SentinelBridge.createAudioGenerationProposal()]
  ↓ [POST to Controller → ElevenLabs API]
  ↓
Timeline Insert
  ↓ [TimelineManager.insertAudioToTimeline()]
  ↓ [CSInterface → JSX → add layer to timeline]
  ↓
Add to Library + Render Waveform
  ↓
Success Status
```

## Extension Points

### Adding a New Generation Type

**Example: Add "Ambient Sound" generation**

**1. Create Handler in UIController:**
```javascript
// In ui-controller.js initializeEventListeners()
document.getElementById('generateAmbientBtn')?.addEventListener('click', () => {
    this.handleGenerateAmbient()
})

// Add handler method
async handleGenerateAmbient() {
    const duration = document.getElementById('ambientDurationInput')?.value || 10
    
    this.setProcessing(true)
    try {
        const proposal = this.managers.sentinel.createAudioGenerationProposal({
            type: 'ambient',
            duration: parseFloat(duration),
            style: document.getElementById('ambientStyleSelect')?.value || 'forest'
        })
        
        const result = await this.managers.sentinel.executeProposal(proposal)
        // Rest of handler...
    } finally {
        this.setProcessing(false)
    }
}
```

**2. Add UI Elements to HTML:**
```html
<div class="form-group">
    <label>Ambient Style</label>
    <select id="ambientStyleSelect">
        <option>forest</option>
        <option>ocean</option>
        <option>thunderstorm</option>
        <option>space</option>
    </select>
</div>
<input type="range" id="ambientDurationInput" min="1" max="60" value="10" />
<button id="generateAmbientBtn">Generate Ambient</button>
```

**3. Add Policy Rule to Sentinel:**
```json
{
    "requesters": {
        "cep:ae-audio-sentinel-v1": {
            "allowCommands": [
                "GENERATE_AUDIO_FROM_VISION",
                "GENERATE_AMBIENT_SOUND"  // ← Add this
            ]
        }
    }
}
```

**4. Sign Policy:**
```bash
cd letterblack-sentinel
npm run policy:sign
```

### Adding a New Library Filter

**Example: Add "favorites" filter**

```javascript
// In audio-library.js
filterByFavorites() {
    return this.library.items.filter(item => item.metadata?.favorite === true)
}

// In ui-controller.js initializeEventListeners()
document.getElementById('filterFavoritesBtn')?.addEventListener('click', () => {
    this.handleFilterFavorites()
})

// Add handler
handleFilterFavorites() {
    const items = this.managers.library.filterByFavorites()
    // Render grid with filtered items
}
```

### Adding Vision Analysis Step

**Example: Add custom preprocessing**

```javascript
// In vision-analyzer.js
async analyzeTimeline(compositionName, frameInterval = 15) {
    // ... existing extraction code ...
    
    // Add preprocessing step
    const preprocessed = await this.preprocessFrames(extraction.output.samples)
    
    // Use preprocessed frames for analysis
    const analysisProposal = this.sentinel.createVisionAnalysisProposal(preprocessed)
    // ... rest of code ...
}

async preprocessFrames(frames) {
    // Custom frame processing
    return frames.map(frame => ({
        ...frame,
        processed: true,
        customMetadata: {}
    }))
}
```

## Testing & Debugging

### Using Debug Tools

```javascript
// In browser console (F12)
window.audioSentinelDebug.getState()          // Full app state
window.audioSentinelDebug.getLibrary()        // All audio items
window.audioSentinelDebug.getSentinelStatus() // Controller health
window.audioSentinelDebug.viewLastAnalysis()  // Vision results
window.audioSentinelDebug.reload()            // Reload panel
```

### Logging

```javascript
// Each module logs with prefixes
console.log('[Main] Starting initialization...')
console.log('[Vision] Analyzing timeline...')
console.log('[Generate] Creating proposal...')

// Filter logs in console:
// Type in search: "[Vision]" to see only vision logs
```

### Unit Testing

```bash
# Add Jest for testing (future)
npm install --save-dev jest @testing-library/dom

# Test structure
test('TTS generation creates proposal', () => {
    const bridge = new SentinelBridge(config)
    const proposal = bridge.createAudioGenerationProposal({
        type: 'tts',
        text: 'test'
    })
    expect(proposal.id).toBe('GENERATE_AUDIO_FROM_VISION')
})
```

## Performance Considerations

### Optimizations

1. **Lazy Loading**
   - Load dropdowns only when tab opened
   - Cache composition list
   - Debounce search input

2. **Efficient DOM**
   - Use event delegation for library cards
   - Remove old DOM nodes before rendering
   - Use CSS animations instead of JS

3. **Network**
   - Buffer proposals locally before submit
   - Cache vision analysis results
   - Use short polling timeout (10s max)

## Security

### Key Principles

1. **Never expose API keys in code** - Load from settings UI only
2. **Validate all proposals** - SentinelBridge handles signing
3. **Honor policy denial** - Don't bypass validation failures
4. **Audit trail** - Review Sentinel audit logs for compliance

## Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|-----------|
| localStorage for library | Simple, no backend required | Limited to ~5-10 MB |
| CSInterface for AE calls | Official Adobe API, stable | ~100-200ms latency |
| Ed25519 signatures | Industry standard, fast | Requires TweetNaCl |
| Governance-first | Security by default | Extra latency (~500ms per operation) |
| Event-driven UI | Responsive, testable | More code plumbing |

---

**Next: Read [README.md](./README.md) for user-facing documentation**
