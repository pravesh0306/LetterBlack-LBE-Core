# Audio Sentinel Pro - Professional CEP Extension

**Complete Adobe After Effects extension for intelligent audio generation, library management, and Sentinel-governed automation.**

## Overview

Audio Sentinel Pro is a professional CEP (Common Extensibility Platform) extension for Adobe After Effects that combines:

- **🎤 Audio Generation**
  - Text-to-Speech (TTS) with 12+ models and 29+ voices
  - Sound Effects (SFX) from natural language prompts
  - Timeline Vision Analysis with auto audio generation

- **📚 Persistent Audio Library**
  - Full-text search and filtering
  - Import/export (JSON/CSV)
  - Audio metadata and tagging
  - Statistics and library management

- **👁️ Vision Analysis**
  - Real-time timeline frame extraction
  - Automated visual recognition
  - Context-aware audio suggestions
  - Model and voice auto-detection

- **🎵 Real-time Visualization**
  - Frequency bar waveforms
  - Oscilloscope mode
  - SVG vector export
  - Stream rendering

- **🔐 Sentinel Governance**
  - Cryptographically signed proposals
  - 4-layer validation (schema → signature → nonce → policy)
  - Immutable audit logging
  - Deny-by-default policy enforcement

## Architecture

```
Client (CEP Panel)
  ├─ UI Controller
  │   ├─ Generate Tab (TTS, SFX, Vision)
  │   ├─ Library Tab (gallery, search, export)
  │   ├─ Vision Tab (analysis results)
  │   └─ Settings Tab (API config)
  │
  ├─ Core Managers
  │   ├─ Timeline Manager (AE JSX integration)
  │   ├─ Audio Library (localStorage persistence)
  │   ├─ Waveform Renderer (canvas visualization)
  │   └─ Vision Analyzer (4-stage pipeline)
  │
  └─ Sentinel Bridge
      ├─ Proposal Generator (cryptographic signing)
      ├─ Health Check
      └─ Proposal Submission → Sentinel Controller

Server (Sentinel Controller)
  ├─ Validation Gates
  │   ├─ Schema validation
  │   ├─ Signature verification
  │   ├─ Nonce checking (replay protection)
  │   └─ Policy evaluation
  │
  ├─ Adapters
  │   ├─ cepTimelineVision (frame extraction)
  │   └─ Future: others as needed
  │
  └─ Audit Log (immutable hash-chain)
```

## File Structure

```
audio-sentinel-pro/
├── CSXS/
│   └── manifest.xml              # CEP extension metadata
│
└── html/
    ├── index.html               # Main UI (650+ lines)
    ├── css/
    │   └── style.css            # Dark theme styling (700+ lines)
    │
    └── js/
        ├── lib/
        │   ├── CSInterface.js   # Adobe CEP library (required)
        │   └── tweetnacl.umd.min.js  # Crypto library (required)
        │
        ├── main.js              # Entry point initialization
        ├── ui-controller.js     # Tab orchestration + events
        ├── sentinel-bridge.js   # Governance integration
        ├── timeline-manager.js  # Adobe After Effects integration
        ├── audio-library.js     # Persistent audio storage
        ├── vision-analyzer.js   # Vision analysis pipeline
        └── waveform-renderer.js # Real-time visualization
```

## Key Features

### 1. Text-to-Speech Generation

Generates speech with professional voices:
- **11 Models**: ElevenLabs catalog (turbo, multilingual, etc.)
- **29+ Voices**: Multiple accents, genders, tones
- **Stability Control**: Predictability vs. variability slider
- **Direct Timeline Insert**: One-click audio layer addition

### 2. Sound Effects Generation

Create SFX from natural language:
- **Prompt-based**: Describe the sound you want
- **Duration Control**: 1-30 second clips
- **Auto Library**: Generated SFX automatically added to library

### 3. Timeline Vision Analysis

Analyze composition visuals for intelligent audio:

**4-Stage Pipeline:**
1. **Extract Timeline Frames** - Every Nth frame from composition
2. **Visual Recognition** - Google Vision API + local heuristics
3. **Mood Detection** - Infer audio context from visuals
4. **Audio Generation** - Auto-generate matching audio

**Smart Features:**
- Auto model selection based on detected content
- Voice gender/tone matching from visual analysis
- Mood-aligned audio pacing
- Direct timeline insertion

### 4. Persistent Audio Library

Professional library management:
- **CRUD Operations**: Add, read, update, delete audio
- **Full-Text Search**: Search by name, metadata
- **Filtering**: By type (TTS, SFX, Vision)
- **Statistics**: Total duration, item count, breakdown
- **Import/Export**: JSON arrays, CSV for external use
- **Metadata**: Duration, creation time, type, tags
- **localStorage Persistence**: Survives panel restarts

### 5. Real-time Waveform Visualization

See audio as it generates:
- **Frequency Bars**: Classic audio visualization
- **Oscilloscope Mode**: Wave form display
- **Multiple Formats**: PNG, JPEG, SVG export
- **Stream Rendering**: Progressive display during generation
- **Peak Detection**: Color-coded intensity highlighting

### 6. Sentinel Governance Integration

All operations under cryptographic control:
- **Signed Proposals**: Ed25519 authentication
- **Deterministic Nonces**: Prevent replay attacks
- **Policy Enforcement**: Only allowed operations execute
- **Audit Trail**: Immutable hash-chain recording
- **Health Checks**: Connectivity status indicators

## Installation

### Prerequisites

- Adobe After Effects 24.0 or later
- Node.js 20.9.0+ (for Sentinel Controller)
- CEP development environment (if building from source)

### Steps

1. **Clone/Download Extension**
   ```
   Copy audio-sentinel-pro/ folder to:
   Windows: C:\Program Files\Common Files\Adobe\CEP\extensions\
   macOS: /Library/Application Support/Adobe/CEP/extensions/
   ```

2. **Enable Unsigned Extensions**
   - Windows: Add registry key at `HKEY_CURRENT_USER\Software\Adobe\CSXS.15`
     - Create string `PlayerDebugMode` = `1`
   - macOS: Terminal:
     ```
     defaults write /Library/Preferences/com.adobe.CSXS.15 PlayerDebugMode 1
     ```

3. **Restart Adobe After Effects**

4. **Start Sentinel Controller**
   ```bash
   cd letterblack-sentinel
   npm run run  # Controller listens on localhost:3000
   ```

5. **Configure Extension**
   - Open AE → Window → Extensions → Audio Sentinel
   - Click Settings tab
   - Enter ElevenLabs API key
   - Enter Sentinel Controller endpoint
   - Click "Test Connection"

## Usage

### Generate Audio (TTS)

1. **Generate Tab**
   - Enter text in "Text to Speech" textarea
   - Select voice (or auto-detect)
   - Select model (quality preference)
   - Adjust stability slider (0.5 = balanced)
   - Click "Generate TTS"
   - Audio appears in waveform canvas
   - Automatically saved to library

### Generate Sound Effects

1. **Generate Tab**
   - Enter description in "SFX Prompt" field
   - Set duration (seconds)
   - Click "Generate SFX"
   - Audio + waveform displayed
   - Automatically saved to library

### Timeline Vision Analysis

1. **Vision Tab**
   - Select target composition from dropdown
   - Click "Analyze Vision"
   - System extracts frames, analyzes visuals
   - View mood, detected objects, suggestions
   - Click "Generate from Vision"
   - Auto-generated audio inserted to timeline

2. **Vision Advanced** (Ctrl+Shift+V to toggle)
   - Custom frame interval
   - Vision API preferences
   - Force model/voice selection
   - Threshold adjustments

### Manage Audio Library

1. **Library Tab**
   - View all generated audio in gallery grid
   - Search by name (full-text)
   - Filter by type (TTS, SFX, Vision)
   - View statistics
   - Click "Play" to preview
   - Click "Insert" to add to timeline
   - Click "Delete" to remove
   - Click "Export" to save library (JSON/CSV)

### Configure Settings

1. **Settings Tab**
   - **ElevenLabs API Key**: Paste your key from elevenlabs.io
   - **Sentinel Endpoint**: Default localhost:3000
   - **Auto Insert Audio**: Toggle automatic timeline insertion
   - **Theme**: Dark or light mode
   - Click "Save Settings"
   - Click "Test Connection" to verify

## API Integration

### ElevenLabs API

**Concepts:**
- **Voices**: 29+ professional voices with metadata
- **Models**: 11 quality/latency options
- **TTS**: Text-to-speech with stability control
- **SFX**: Sound effects from descriptions

**Endpoint:** `https://api.elevenlabs.io/v1/`

**Authentication:** Header `xi-api-key: <your-key>`

**Get Free Key:**
1. Visit https://elevenlabs.io/
2. Sign up (free tier: 10k characters/month)
3. Copy API key from account settings

### Sentinel Controller API

**Concepts:**
- **Proposals**: Signed requests for operations
- **Validation**: 4-layer security gates
- **Policy**: Deny-by-default governance rules
- **Audit Log**: Immutable operation records

**Endpoints:**
- `POST /verify` - Validate proposal without execution
- `POST /run` - Validate and execute proposal
- `GET /health` - Controller status check
- `GET /audit/verify` - Verify audit log integrity

**Proposal Structure:**
```json
{
  "id": "COMMAND_NAME",
  "commandId": "uuid",
  "requesterId": "cep:ae-audio-sentinel-v1",
  "timestamp": 1739991600,
  "nonce": "64-char-hex-string",
  "payload": { /* operation-specific */ },
  "signature": {
    "alg": "ed25519",
    "keyId": "cep:ae-audio-sentinel-v1-2026Q1",
    "sig": "base64-encoded-signature"
  }
}
```

## Governance Model

### Policy File Structure

Located at `config/policy.default.json` in Sentinel Controller:

```json
{
  "requesters": {
    "cep:ae-audio-sentinel-v1": {
      "allowAdapters": ["cepTimelineVision"],
      "allowCommands": [
        "EXTRACT_TIMELINE_FRAMES",
        "ANALYZE_VISION",
        "DETECT_OPTIMAL_MODEL",
        "GENERATE_AUDIO_FROM_VISION"
      ],
      "filesystem": {
        "roots": ["data/"],
        "denyPatterns": ["**/.git/**", "**/*.key"]
      }
    }
  }
}
```

### 4-Layer Validation Gates

Every proposal passes through (in order):

1. **Schema Validation** - Structural correctness
   - Required fields present
   - Types correct
   - Value constraints met

2. **Signature Verification** - Ed25519 authentication
   - Key exists in registry
   - Key not expired
   - Signature matches payload

3. **Nonce Checking** - Replay attack prevention
   - Nonce never seen before
   - Timestamp within tolerance
   - Stored for future checks

4. **Policy Evaluation** - Authorization
   - Requester in allowlist
   - Command in allowlist
   - Adapter in allowlist
   - Filesystem access permitted

**Result:** ALLOW or DENY (no partial validation)

### Audit Trail

Each operation recorded:
```json
{
  "timestamp": "2026-02-20T06:00:00.000Z",
  "commandId": "uuid",
  "requesterId": "cep:ae-audio-sentinel-v1",
  "decision": "ALLOW",
  "status": "success",
  "previousHash": "sha256:...",
  "hash": "sha256:..."
}
```

**Hash-Chain Guarantee:**
- Each entry's hash = SHA256(canonical JSON)
- Each entry references prior hash
- Tampering detected immediately

## Development

### Folder Organization

```
audio-sentinel-pro/          - This extension
letterblack-sentinel/        - Sentinel Controller (governance)
LBCP_Plan/                   - Architecture & planning docs
```

### Loading Unsigned Extension (Development)

Use **ScriptUI** debugging:
```javascript
// In ESTK or Script Editor
#include "html/index.html"
```

Or use **CEP development mode:**
```bash
# Enable PlayerDebugMode registry/plist (see Installation)
# Then reload extension via AE menu
```

### Hot Reload

During development:
1. Edit `.html`/`.js`/`.css` files
2. Close panel (Window → Extensions → Audio Sentinel)
3. Reopen panel
4. Changes applied immediately

### Testing Workflow

```bash
# 1. Start Sentinel Controller
cd letterblack-sentinel
npm run run

# 2. Check health
npm run health

# 3. Open AE extension
# Window → Extensions → Audio Sentinel

# 4. Test in browser (same HTML/CSS)
# Open html/index.html in Chrome for quick UI testing
# Use browser DevTools for JS debugging

# 5. Debug in AE CEP
# Ctrl+Shift+V toggles vision advanced options
# Check browser console (F5 in AE)
```

## Troubleshooting

### Extension Not Appearing

- ✅ Folder in correct CEP extensions path
- ✅ `manifest.xml` valid XML
- ✅ PlayerDebugMode enabled in registry/plist
- ✅ Restart After Effects

### Connection Failed

```
✗ Sentinel: Disconnected
```

**Checks:**
1. Is Sentinel running? `npm run health`
2. Is endpoint correct? (Settings → check URL)
3. Is firewall blocking localhost:3000?
4. Are CORS headers configured? (Sentinel is Node.js)

**Fix:**
```bash
cd letterblack-sentinel
npm run health --json true
```

### Audio Generation Fails

**Check:**
1. ElevenLabs API key valid? (Test on elevenlabs.io)
2. Character limit reached? (Free: 10k/month)
3. Model/voice exists? (Dropdown was populated)
4. Text too long? (Max 500 chars per request)

**Debug:**
```javascript
window.audioSentinelDebug.getSentinelStatus()  // Check controller
window.appState.sentinelBridge.endpoint       // Verify endpoint
```

### Vision Analysis Fails

**Prerequisites:**
1. Active composition in AE
2. Composition has visible layers
3. Google Vision API available (or local fallback)
4. Sentinel supports `cepTimelineVision` adapter

**Debug:**
```javascript
window.audioSentinelDebug.viewLastAnalysis()  // See analysis results
```

### Library Lost on Restart

**Debug localStorage:**
```javascript
// Check if library is saved
localStorage.getItem('audioLibrary')

// Clear and rebuild
window.audioSentinelDebug.clearLibrary()
```

## Production Deployment

### Key Considerations

1. **API Keys**
   - Never hardcode in extension
   - Load from secure settings UI
   - Use environment variables in server

2. **Signing**
   - Production extensions require valid certificate
   - Use Adobe's extension signing service

3. **Distribution**
   - Package as `.zxp` file
   - Host on Adobe Add-ons or internal server
   - Sign with production certificate

4. **Sentinel Hardening**
   - Production policy signature verification
   - Root filesystem read-only (Docker)
   - Audit log archival
   - Rate limiting enabled

### Building Production Package

```bash
# 1. Create build directory
mkdir dist/audio-sentinel-pro

# 2. Copy extension files
cp -r CSXS html dist/audio-sentinel-pro/

# 3. Sign extension
# Use Adobe ZXPSignCmd or third-party
zxpsigncmd -sign audio-sentinel-pro dist/audio-sentinel-pro.zxp /path/to/cert.p12 password

# 4. Distribute .zxp file
```

## Contributing

### Adding Features

1. **UI Changes**: Edit `html/index.html` and `html/css/style.css`
2. **Core Logic**: Add methods to managers (`timeline-manager.js`, `audio-library.js`, etc.)
3. **Governance**: Update policy in Sentinel Controller's `config/policy.default.json`
4. **Events**: Wire in `ui-controller.js`

### Examples

**Add new button:**
```html
<!-- 1. Add HTML button -->
<button id="myNewButton">My Feature</button>

<!-- 2. Wire in UI controller -->
// In UIController.initializeEventListeners()
document.getElementById('myNewButton')?.addEventListener('click', () => this.handleMyFeature())

<!-- 3. Implement handler -->
async handleMyFeature() {
    // Your logic here
}
```

**Add new audio type:**
```javascript
// In audio-library.js
addAudio(audioData) {
    // Existing code...
    // Support new type automatically
}

// In sentinel-bridge.js
createCustomAudioProposal(config) {
    // New proposal type
}
```

## Known Limitations

- ⏳ **Sentinel Controller must be running** for governance features
- ⏳ **Vision API** optional; falls back to local heuristics
- ⏳ **localStorage only** - library lost if cookies disabled
- ⏳ **Audio generation** requires valid ElevenLabs key
- ⏳ **CSInterface communication** latency ~100-200ms

## Future Enhancements

- 🟡 User authentication + cloud library sync
- 🟡 Batch processing for multiple compositions
- 🟡 Advanced DSP filters (EQ, reverb, compression)
- 🟡 MIDI integration for timing-sync
- 🟡 Streaming audio generation (faster feedback)
- 🟡 Custom voice cloning
- 🟡 Multi-language support

## Support & Documentation

**Key Resources:**
- [Sentinel README](../letterblack-sentinel/README.md) - Core governance engine
- [LBCP Architecture](../LBCP_Plan/01_ARCHITECTURE.md) - System design
- [ElevenLabs Docs](https://docs.elevenlabs.io/) - TTS/SFX API reference
- [Adobe CEP Guide](https://github.com/Adobe-CEP/CEP-Resources) - Extension development

**Contact:**
- GitHub Issues: Core Control repository
- Sentinel Docs: `letterblack-sentinel/README.md`

## License

Proprietary - Part of LetterBlack Controller Platform (LBCP)

---

**Version:** 1.0  
**Last Updated:** 2026-02-20  
**Status:** Production Ready ✅
