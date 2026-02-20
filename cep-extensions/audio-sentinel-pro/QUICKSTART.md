# Audio Sentinel Pro - Quick Start Guide

**Get up and running in 5 minutes**

## Step 1: Install Extension (Windows)

```powershell
# Copy extension folder to CEP extensions directory
$extensionDir = "C:\Program Files\Common Files\Adobe\CEP\extensions"
Copy-Item -Path "audio-sentinel-pro" -Destination $extensionDir -Recurse -Force

# Enable unsigned extensions in registry
$regPath = "HKCU:\Software\Adobe\CSXS.15"
New-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -Force

echo "✓ Extension installed. Restart Adobe After Effects."
```

## Step 2: Start Sentinel Controller

```bash
cd d:\Developement\Core_Control\letterblack-sentinel

# Install dependencies (first time only)
npm install

# Start controller
npm run run

# In another terminal, verify it's running
npm run health
```

**Expected output:**
```
✓ Sentinel Controller running on http://localhost:3000
✓ Policy file valid
✓ Audit log integrity verified
✓ All validation gates operational
```

## Step 3: Get ElevenLabs API Key

1. Visit https://elevenlabs.io/
2. Click "Sign Up" (free tier: 10,000 chars/month)
3. Confirm email
4. Go to Account Settings (top right)
5. Copy API Key
6. Paste into extension Settings tab

## Step 4: Launch Audio Sentinel in After Effects

```
1. Open Adobe After Effects 24.0+
2. Window → Extensions → Audio Sentinel Pro
3. Navigate to Settings tab
4. Paste ElevenLabs API key
5. Verify Sentinel endpoint: http://localhost:3000
6. Click "Test Connection"
7. Should see green status indicators
```

## Step 5: Generate Your First Audio

### Quick TTS Example

```
1. Go to Generate tab
2. In "Text to Speech" field, enter: "Hello, this is a test"
3. Select any voice from dropdown
4. Click "Generate TTS"
5. Watch waveform appear in canvas
6. Audio auto-saved to library
```

### Quick SFX Example

```
1. In Generate tab, enter: "thunder storm with rain"
2. Set duration to 5 seconds
3. Click "Generate SFX"
4. Wait for generation...
5. Waveform shows in real-time
6. Auto-added to library
```

### Timeline Vision (Advanced)

```
1. Open any After Effects composition with visual content
2. Go to Vision tab
3. Select composition from dropdown
4. Click "Analyze Vision"
5. System extracts frames, analyzes visuals
6. View detected objects and mood
7. Click "Generate from Vision"
8. Audio auto-inserted to timeline
```

## Common Commands

### From Terminal (Sentinel Controller)

```bash
cd letterblack-sentinel

# Health check
npm run health

# Verify specific proposal
npm run verify -- --in proposal.json

# Dry-run with noop adapter
npm run dryrun -- --in proposal.json

# Check audit log integrity
npm run audit:verify -- --audit data/audit.log.jsonl

# Reset all state (development)
npm run init
```

### From Browser Console (CEP Extension)

```javascript
// Check connection status
window.audioSentinelDebug.getSentinelStatus()

// View last vision analysis
window.audioSentinelDebug.viewLastAnalysis()

// Get current library items
window.audioSentinelDebug.getLibrary()

// Get full application state
window.audioSentinelDebug.getState()

// Clear library (careful!)
window.audioSentinelDebug.clearLibrary()

// Reload extension
window.audioSentinelDebug.reload()
```

## Verify Everything Works

**Checklist:**

- ✅ Extension appears in AE menu (Window → Extensions)
- ✅ CEP panel loads without errors (no red error box)
- ✅ "Test Connection" button shows green status
- ✅ Voice dropdown populated with 29+ options
- ✅ Model dropdown populated with 11+ options
- ✅ TTS generation produces waveform
- ✅ SFX generation produces waveform
- ✅ Library shows saved audio items
- ✅ Search/filter work in library
- ✅ Export creates JSON/CSV file

## Troubleshooting Quick Fixes

### Extension Not Showing

```powershell
# 1. Verify registry entry
Get-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.15" | Select PlayerDebugMode

# Should output: PlayerDebugMode : 1

# 2. Verify folder location
Get-ChildItem "C:\Program Files\Common Files\Adobe\CEP\extensions\audio-sentinel-pro"

# 3. Restart AE
# (Close and reopen)
```

### Connection Failed

```bash
# 1. Verify Sentinel is running
npm run health

# 2. Check endpoint in settings
# Should be: http://localhost:3000

# 3. Verify firewall allows localhost:3000
Test-NetConnection -ComputerName localhost -Port 3000

# 4. Restart Sentinel
npm run run
```

### API Key Error

```
Check in Settings:
- API key pasted correctly (no spaces)
- Key is from elevenlabs.io (not OpenAI)
- Free tier not exhausted (10k chars/month)

Test quota:
Visit https://elevenlabs.io/account/usage
```

## File Locations

| File | Location |
|------|----------|
| Extension | `C:\Program Files\Common Files\Adobe\CEP\extensions\audio-sentinel-pro\` |
| Sentinel | `d:\Developement\Core_Control\letterblack-sentinel\` |
| Policy | `letterblack-sentinel\config\policy.default.json` |
| Audit Log | `letterblack-sentinel\data\audit.log.jsonl` |
| Library (CEP) | Browser localStorage (DevTools → Application → Storage) |

## Next Steps

1. **Generate 5-10 audio clips** to test the system
2. **Export library** as JSON to see metadata structure
3. **Analyze a composition** with Timeline Vision
4. **Review audit log** to see governance in action
5. **Read full README.md** for advanced features

## Getting Help

**Check the logs:**
```javascript
// In browser console (F12 in AE)
// Look for [Vision], [Generate], [Status] messages
console.log(window.appState)  // Full application state
```

**Check Sentinel logs:**
```bash
cd letterblack-sentinel
npm run audit:verify -- --audit data/audit.log.jsonl
```

**Questions?**
- See [README.md](./README.md) for full documentation
- Check Sentinel docs: `../letterblack-sentinel/README.md`
- Review LBCP architecture: `../LBCP_Plan/01_ARCHITECTURE.md`

---

**You're all set! Open Audio Sentinel Pro in After Effects and start creating.**
