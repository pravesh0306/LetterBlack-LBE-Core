# CEP Extension Integration Guide (Complete)

## Files Created

✅ **src/cep/cepValidatorInline.js** — Option B (inline, no external process)
✅ **src/cep/cepValidatorCLI.js** — Option A (calls Sentinel CLI)
✅ **src/cep/cepExtensionExample.jsx** — Complete CEP extension example
✅ **test/test-cep-integration.js** — Test both validators side-by-side

---

## Quick Start

### Option B (Recommended for Week 1)

**Step 1: Copy validator into your CEP project**
```
your-cep-extension/
  ├── src/
  │   ├── cepValidatorInline.js        ← Copy this
  │   └── panel.jsx                    ← Your existing CEP code
  └── package.json
```

**Step 2: Import in your panel code**
```javascript
// In your panel.jsx or main CEP file
const { validateProposal, createProposal, DEFAULT_CEP_POLICY } = require('./cepValidatorInline.js');

// Create proposal from AI code
const proposal = createProposal(aiGeneratedCode, 'agent:cep-extension');

// Validate
const decision = validateProposal(proposal, DEFAULT_CEP_POLICY);

// Gate execution
if (decision.decision === 'ALLOW') {
    executeInAE(aiGeneratedCode);
} else {
    showError(decision.message);
}
```

**Step 3: Update policy if needed**
```json
{
  "version": 1,
  "default": "DENY",
  "requesters": {
    "agent:cep-extension": {
      "allowAdapters": ["noop"],
      "allowCommands": ["RUN_SCRIPT"],
      "description": "CEP panel AI execution"
    }
  }
}
```

**Step 4: Test**
```bash
# In your CEP project:
npm test

# Or from sentinel root:
node test/test-cep-integration.js
```

---

### Option A (For Full Governance)

**Step 1: Copy both validators + CLI helper**
```
your-cep-extension/
  ├── src/
  │   ├── cepValidatorInline.js
  │   ├── cepValidatorCLI.js           ← For Option A
  │   └── panel.jsx
  └── package.json
```

**Step 2: Update paths in your CEP code**
```javascript
const { validateViaCliSync } = require('./cepValidatorCLI.js');

// Paths to Sentinel (update for your system)
const SENTINEL_BIN = 'C:\\path\\to\\sentinel\\bin\\lbe.js';
const POLICY_PATH = 'C:\\path\\to\\policy.default.json';

// Validate via CLI
const decision = validateViaCliSync(proposal, SENTINEL_BIN, POLICY_PATH);

if (decision.decision === 'ALLOW') {
    executeInAE(aiGeneratedCode);
    logToAudit(decision.commandId);  // Full audit trail
}
```

**Step 3: Test health check before execution**
```javascript
const { sentinelHealthCheck } = require('./cepValidatorCLI.js');

if (!sentinelHealthCheck(SENTINEL_BIN)) {
    showError('⚠️ Sentinel not available. Enable Safe Mode?');
    return;
}
```

---

## Integration Patterns

### Pattern 1: Inline + Simple Button (Option B)

```javascript
// Minimal integration
async function onSuggestClick() {
    const code = await llmAPI.generate();
    const proposal = createProposal(code);
    const decision = validateProposal(proposal, DEFAULT_CEP_POLICY);
    
    if (decision.decision === 'ALLOW') {
        eval(code);
        toast.success('✅ Code executed');
    } else {
        toast.error(`❌ ${decision.message}`);
    }
}
```

### Pattern 2: CLI + Async Validation (Option A, Advanced)

```javascript
// Full governance with async feedback
async function onSuggestClick() {
    const code = await llmAPI.generate();
    const proposal = createProposal(code);
    
    // Show spinner while validating
    spinner.show('🔒 Validating...');
    
    const decision = await validateViaCliAsync(
        proposal,
        SENTINEL_BIN,
        POLICY_PATH
    );
    
    spinner.hide();
    
    if (decision.decision === 'ALLOW') {
        eval(code);
        logAudit(decision.commandId);
        toast.success('✅ Code executed (logged)');
    } else {
        showBlockedUI(decision.message, decision.reason);
    }
}
```

### Pattern 3: Health Check + Graceful Fallback

```javascript
// Start-up: Check if Sentinel is available
function initializeValidation() {
    const canUseValidation = sentinelHealthCheck(SENTINEL_BIN);
    
    if (canUseValidation) {
        console.log('✅ Using full governance (CLI)');
        VALIDATION_MODE = 'cli';
    } else {
        console.log('⚠️ Using inline validation (no audit trail)');
        VALIDATION_MODE = 'inline';
    }
}

// During execution: Use whichever is available
async function execute(code) {
    const proposal = createProposal(code);
    
    const decision = VALIDATION_MODE === 'cli'
        ? await validateViaCliAsync(proposal, SENTINEL_BIN, POLICY_PATH)
        : validateProposal(proposal, DEFAULT_CEP_POLICY);
    
    if (decision.decision === 'ALLOW') {
        eval(code);
    }
}
```

---

## Testing Your Integration

### Test 1: Option B (Inline) Works

```bash
# From CEP extension root
node -e "
const { validateProposal, createProposal, DEFAULT_CEP_POLICY } = require('./src/cepValidatorInline.js');
const proposal = createProposal('this.position[0] = 100;');
const result = validateProposal(proposal, DEFAULT_CEP_POLICY);
console.log('Result:', result);
"
```

Expected output:
```
Result: {
  decision: 'ALLOW',
  commandId: '...',
  message: 'All validation gates passed',
  adapter: 'noop',
  payload: { ... }
}
```

### Test 2: Option A (CLI) Works

```bash
# From Sentinel root
npm run health

# Then from CEP extension
node -e "
const { validateViaCliSync } = require('./src/cepValidatorCLI.js');
const proposal = require('./src/cepValidatorInline.js').createProposal('alert(\"test\");');
const result = validateViaCliSync(proposal, 'C:\\...\\bin\\lbe.js', 'C:\\...\\policy.default.json');
console.log('Result:', result);
"
```

### Test 3: Full Workflow

```bash
# From Sentinel root
node test/test-cep-integration.js
```

Should show:
```
OPTION B: INLINE VALIDATOR
[✅ PASS] Valid: Simple JSX expression
[✅ PASS] Valid: Composition name check
[✅ PASS] Invalid: Unauthorized requester (correctly blocked)
[✅ PASS] Invalid: Unauthorized adapter (correctly blocked)
...

OPTION A: CLI VALIDATOR
[✅ PASS] Valid: Simple JSX expression
... (same results)
```

---

## Common Issues & Fixes

### Issue: "Cannot find module 'cepValidatorInline.js'"

**Fix:** Update require paths to match your structure
```javascript
// Wrong:
const { validateProposal } = require('./cepValidatorInline.js');

// Right (from cepExtensionExample.jsx):
const { validateProposal } = require('./cepValidatorInline.js');

// If in subdirectory:
const { validateProposal } = require('../src/cep/cepValidatorInline.js');
```

### Issue: "Sentinel CLI not reachable" (Option A)

**Fix:** Verify paths and health
```bash
# Check if Sentinel is running
node C:\path\to\sentinel\bin\lbe.js health

# Check if policy file exists
dir C:\path\to\sentinel\config\policy.default.json

# Update paths in CEP code
```

### Issue: Validation always returns DENY

**Check policy file:**
```bash
# View current policy
cat config/policy.default.json

# Verify agent:cep-extension is registered
# Should show:
# "agent:cep-extension": {
#   "allowAdapters": ["noop"],
#   "allowCommands": ["RUN_SCRIPT"],
#   ...
# }
```

---

## Minimal Checklist

- [ ] Copy `cepValidatorInline.js` into your CEP project
- [ ] Update imports in your panel code
- [ ] Test with single proposal: `createProposal()` + `validateProposal()`
- [ ] Add validation gate: `if (decision.decision === 'ALLOW') { eval(...) }`
- [ ] Test with AI-generated code
- [ ] (Optional) Add CLI validation for full governance
- [ ] (Optional) Add health check for graceful fallback

---

## Next Steps

### Week 1: Observer Mode (Safe)
- Use `DEFAULT_CEP_POLICY` with `adapter: 'noop'` (no-op, observation-only)
- Log all decisions to console
- Verify: Does validation correctly block unauthorized requests?

### Week 2: Monitor & Adjust
- Check which proposals get blocked and why
- Update policy if rules are too strict
- Add real AI calls (Gemini, ChatGPT, etc.)

### Week 3: Enable Mutations (If Safe)
- Change `adapter: 'noop'` → `adapter: 'shell'` in proposal
- Update policy to allow shell commands
- Add filesystem constraints if needed

### Week 4: Add Cryptographic Proof (If Needed)
- Integrate Option A (CLI) for full Sentinel features
- Enable signature verification
- Set up audit logging
- Deploy to production

---

## Decision Tree: Which Option?

```
Do you need cryptographic proof of every action?
    YES → Use Option A (CLI) + signatures + audit trail
    NO  → Use Option B (Inline) + simple policy

Do you have Sentinel CLI installed next to CEP?
    YES → Option A is ready to go
    NO  → Option B works standalone

Do you want fastest response time?
    YES → Option B (inline = instant)
    NO  → Option A is fine (CLI adds ~500ms)

Are you in production?
    YES → Consider Option A for compliance
    NO  → Start with Option B, migrate later
```

---

## API Reference

### Option B (Inline)

```javascript
// Create proposal from AI code
createProposal(code, requesterId = 'agent:cep-extension')
  → { id, commandId, payload, ... }

// Validate against policy
validateProposal(proposal, policy)
  → { decision: 'ALLOW'|'DENY', message, ... }

// Pre-built policy
DEFAULT_CEP_POLICY
  → { version: 1, requesters: { 'agent:cep-extension': ... } }
```

### Option A (CLI)

```javascript
// Synchronous validation (blocks UI)
validateViaCliSync(proposal, sentinelBinPath, policyPath)
  → { decision, message, ... }

// Asynchronous validation (non-blocking)
validateViaCliAsync(proposal, sentinelBinPath, policyPath)
  → Promise<{ decision, message, ... }>

// Check if Sentinel is available
sentinelHealthCheck(sentinelBinPath)
  → boolean
```

---

## File Manifest

| File | Purpose | For You? |
|------|---------|----------|
| `src/cep/cepValidatorInline.js` | Option B validator (inline, no process) | ✅ Copy this |
| `src/cep/cepValidatorCLI.js` | Option A validator (calls CLI) | 🟡 Copy if Option A |
| `src/cep/cepExtensionExample.jsx` | Complete CEP panel example | ✅ Reference this |
| `test/test-cep-integration.js` | Test both validators | ✅ Run this to verify |
| `CEP_INTEGRATION_MINIMAL.md` | High-level guide | ✅ Read first |
| `CEP_INTEGRATION_COMPLETE.md` | This file | 🟡 Deep reference |

---

## Questions?

See [CEP_INTEGRATION_MINIMAL.md](CEP_INTEGRATION_MINIMAL.md) for quick reference.

See [../copilot-instructions.md#cep-adapter-design-pattern](../copilot-instructions.md#cep-adapter-design-pattern) for security patterns.

Check your proposal structure against [../USAGE_EXAMPLE.md](../USAGE_EXAMPLE.md) for canonical format.
