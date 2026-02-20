# CEP Integration (Minimal Pattern)

## Strategic Principle
```
AI generates JSX code
         ↓
   Sentinel validates
         ↓
   if allowed: execute
   else: show error reason
```

No UI redesign, no phase system, no capability matrix. Just a gate.

---

## Option A: Call Sentinel CLI (Recommended for Prototyping)

CEP calls out to Node CLI, gets JSON response back.

### CEP JSX Code

```javascript
// Inside your CEP extension (jsx file)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function validateAndExecuteAI(aiGeneratedCode) {
    try {
        // 1. Write unsigned proposal
        const proposalPath = path.join(
            system.userFolder,
            'sentinel-proposal.json'
        );
        
        const proposal = {
            id: 'RUN_SCRIPT',
            commandId: generateUUID(),
            requesterId: 'agent:cep-extension',
            sessionId: 'session:cep-' + Date.now(),
            timestamp: Math.floor(Date.now() / 1000),
            nonce: generateNonce(32),
            requires: ['evalScript'],
            risk: 'MEDIUM',
            payload: {
                adapter: 'noop',  // or 'shell' if you need fs
                code: aiGeneratedCode
            }
        };
        
        fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2));
        
        // 2. Call Sentinel CLI for validation
        const sentinelPath = 'C:\\path\\to\\sentinel\\bin\\lbe.js';
        const result = execSync(
            `node "${sentinelPath}" verify --in "${proposalPath}"`,
            { encoding: 'utf-8' }
        );
        
        const decision = JSON.parse(result);
        
        // 3. Gate the execution
        if (decision.decision === 'ALLOW') {
            // Execute the AI code
            eval(aiGeneratedCode);
            showStatus('✅ Code executed successfully', 'success');
        } else {
            showStatus(
                `❌ Execution blocked: ${decision.message}`,
                'error'
            );
        }
        
    } catch (err) {
        showStatus(`Validation error: ${err.message}`, 'error');
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateNonce(bytes) {
    let nonce = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < bytes * 2; i++) {
        nonce += chars[Math.floor(Math.random() * 16)];
    }
    return nonce;
}

function showStatus(msg, type) {
    alert(msg);  // Replace with your toast/panel system
}
```

### Pros
- ✅ Sentinel runs independently (easier to test/update)
- ✅ All cryptographic features available (signatures, nonce store, policy)
- ✅ Works today with existing CLI

### Cons
- ❌ Extra process overhead
- ❌ Requires Sentinel installation alongside CEP

---

## Option B: Extract Validator Module (Better for Production)

Bundle validation logic directly inside CEP. No external process.

### Step 1: Create Minimal Validator Module

`src/cep/cepValidator.js`:

```javascript
// Minimal inline validator for CEP
// (No external process, no file I/O overhead)

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

export async function validateProposal(proposal, policyPath) {
    const errors = [];
    
    // 1. SCHEMA CHECK
    if (!proposal.id || !proposal.payload) {
        errors.push('SCHEMA_ERROR: Missing id or payload');
        return { decision: 'DENY', message: errors[0] };
    }
    
    // 2. CAPABILITY CHECK (quick gate)
    const allowedCapabilities = ['evalScript'];
    const required = proposal.requires || [];
    
    for (const cap of required) {
        if (!allowedCapabilities.includes(cap)) {
            errors.push(
                `CAPABILITY_DENIED: ${cap} not available in CEP`
            );
            return { decision: 'DENY', message: errors[0] };
        }
    }
    
    // 3. POLICY CHECK (simple version)
    const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
    const requesterPolicy = policy.requesters[proposal.requesterId];
    
    if (!requesterPolicy) {
        errors.push(`POLICY_DENIED: Requester ${proposal.requesterId} not authorized`);
        return { decision: 'DENY', message: errors[0] };
    }
    
    if (!requesterPolicy.allowAdapters.includes(proposal.payload.adapter)) {
        errors.push(`POLICY_DENIED: Adapter ${proposal.payload.adapter} not allowed`);
        return { decision: 'DENY', message: errors[0] };
    }
    
    // 4. If all checks pass
    return {
        decision: 'ALLOW',
        commandId: proposal.commandId,
        message: 'All validation gates passed'
    };
}
```

### Step 2: Update CEP Extension JSX

```javascript
// In your CEP panel code

import { validateProposal } from './cepValidator.js';

async function validateAndExecuteAI(aiGeneratedCode) {
    try {
        // Create proposal
        const proposal = {
            id: 'RUN_SCRIPT',
            commandId: generateUUID(),
            requesterId: 'agent:cep-extension',
            timestamp: Math.floor(Date.now() / 1000),
            requires: ['evalScript'],
            payload: {
                adapter: 'noop',
                code: aiGeneratedCode
            }
        };
        
        // Validate (inline, no child process)
        const policyPath = 'C:\\path\\to\\policy.default.json';
        const result = await validateProposal(proposal, policyPath);
        
        // Gate execution
        if (result.decision === 'ALLOW') {
            eval(aiGeneratedCode);
            showStatus('✅ Code executed', 'success');
        } else {
            showStatus(`❌ ${result.message}`, 'error');
        }
        
    } catch (err) {
        showStatus(`Error: ${err.message}`, 'error');
    }
}

function generateUUID() {
    // ... same as Option A
}

function showStatus(msg, type) {
    // ... your UI
}
```

### Pros
- ✅ No external process (faster, more reliable)
- ✅ Full bundled (one package, CEP self-contained)
- ✅ Can still call full Sentinel CLI for testing

### Cons
- ❌ Doesn't include cryptographic signature verification (skip for now)
- ❌ Simpler policy model (allowAdapters/allowCommands only, no filesystem roots)

---

## Quick Decision Matrix

| Need | Option A (CLI) | Option B (Inline) |
|------|---|---|
| Prototype quickly | ✅ | ✅ |
| Full Sentinel features | ✅ | ❌ |
| Signature validation | ✅ | ❌ |
| No external process | ❌ | ✅ |
| Production CEP | Maybe | ✅ |

---

## What NOT to Do (Yet)

❌ Don't build phase resolver
❌ Don't detect capabilities automatically
❌ Don't implement full nonce store in CEP
❌ Don't add UI badges/solves
❌ Don't integrate notebook system

---

## Next: Test It

### Option A Test
```bash
# Terminal 1: Sentinel CLI
npm run verify -- --in proposal.json

# Terminal 2: CEP calls it
# (Should see decision: ALLOW or DENY)
```

### Option B Test
```bash
# Copy cepValidator.js into your CEP extension
# Update import paths
# Call validateProposal() from your panel
```

---

## Minimal Policy for CEP

```json
{
  "version": 1,
  "default": "DENY",
  "requesters": {
    "agent:cep-extension": {
      "allowAdapters": ["noop"],
      "allowCommands": ["RUN_SCRIPT"],
      "description": "CEP panel AI execution (observing only)"
    }
  }
}
```

That's it. No filesystem roots, no denyPatterns, no complexity.

**Choose A or B, test one proposal end-to-end, then decide if you need cryptographic signatures or the full system.**
