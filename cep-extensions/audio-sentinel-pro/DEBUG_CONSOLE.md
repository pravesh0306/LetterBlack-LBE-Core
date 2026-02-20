# Audio Sentinel Pro - Debug Console Guide

**Browser Console Debug Tools - Quick Reference**

---

## How to Access

1. **Open Extension** in Adobe After Effects
2. **Right-click anywhere** → "Inspect" → **Console tab**
3. Type commands below to debug

---

## Main Commands

### 🔍 `DEBUG.help()`
Shows all available commands

### 📊 `DEBUG.state()`
Display full app state:
```javascript
DEBUG.state()
// Returns: Core managers, settings, bridges
```

### 💚 `DEBUG.health()`
Check system health status:
```javascript
DEBUG.health()
// Returns: DOM, CSInterface, LocalStorage, Sentinel, UIController status
```

### 🧪 `DEBUG.test()`
Run diagnostic tests:
```javascript
DEBUG.test()
// Tests: Audio APIs, Web Canvas, Proposal generation, Library
```

---

## Data Inspection

### 📚 `DEBUG.library()`
View audio library contents:
```javascript
DEBUG.library()
// Shows: All stored audio items with metadata
```

### ⚙️ `DEBUG.settings()`
View current settings:
```javascript
DEBUG.settings()
// Shows: API key, endpoint, preferences
```

### 👁️ `DEBUG.vision()`
View last vision analysis:
```javascript
DEBUG.vision()
// Shows: Detected objects, mood, audio suggestions
```

### 📝 `DEBUG.logs(limit)`
View debug logs (default 20):
```javascript
DEBUG.logs(50)  // Show last 50 logs
// Shows: Timestamp, component, message, data
```

---

## Network & Connections

### 🌐 `await DEBUG.testSentinel()`
Test Sentinel Controller connection:
```javascript
await DEBUG.testSentinel()
// Shows: Health status, validation gates, audit log status
```

---

## Global Access

### App State
```javascript
window.appState
// Contains: sentinelBridge, timelineManager, audioLibrary, 
//           waveformRenderer, visionAnalyzer, uiController
```

### Global Debug Logging
```javascript
window.debugLog('Component', 'Message', data)
// Logs with timestamp and formatted output
```

---

## Common Issues & Debugging

### Issue: Extension doesn't load

```javascript
DEBUG.health()
// Check if DOM, CSInterface are ready
```

### Issue: Can't generate audio

```javascript
await DEBUG.testSentinel()
DEBUG.settings()
// Verify endpoint and API key
```

### Issue: Vision analysis fails

```javascript
DEBUG.vision()
// Check if analysis was successful
```

### Issue: Library not saving

```javascript
DEBUG.settings()
localStorage.getItem('audioLibrary')
// Check localStorage availability
```

---

## Example Workflow

```javascript
// 1. Check everything is loaded
DEBUG.health()

// 2. Verify Sentinel connectivity
await DEBUG.testSentinel()

// 3. Generate test audio
window.appState.sentinelBridge.createAudioGenerationProposal({
    type: 'tts',
    text: 'test'
})

// 4. Check library
DEBUG.library()

// 5. View recent logs
DEBUG.logs(30)
```

---

## Error Handling

All errors are logged to browser console with:
- ✅ Success messages (green)
- ⚠️ Warnings (yellow)
- ❌ Errors (red)
- ℹ️ Info (cyan)

Check console for **[ERROR]**, **[WARN]**, **[LOG]** prefixes.

---

## Performance Monitoring

Monitor app uptime and memory:
```javascript
DEBUG.info()
// Shows: Uptime, logs in memory, version
```

---

## Tips

- **Use `await`** for async functions like `testSentinel()`
- **Copy logs** for error reporting: `JSON.stringify(DEBUG.logs())`
- **Check localStorage** for persisted data
- **Monitor network** tab for API calls
- **Check CSInterface** logs for Adobe integration issues

---

**Need Help?** Type `DEBUG.help()` in console for full command list.
