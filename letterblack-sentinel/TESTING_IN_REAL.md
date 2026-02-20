# Testing Sentinel In Real (Production-Like Scenarios)

## Overview

You have three levels of "real" testing:

1. **Level 1:** Test mutations with shell adapter (safe, local)
2. **Level 2:** Test with real AI proposals (Gemini, ChatGPT)
3. **Level 3:** Test embedded in After Effects CEP extension

---

## Level 1: Shell Adapter Mutations (Start Here)

### What It Does
Execute shell commands (not just observe). You control the allowlist.

### Step 1: Create a Real Test Proposal

Create `test-real-mutation.json`:

```json
{
  "id": "RUN_SHELL",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "requesterId": "agent:gpt",
  "sessionId": "session:test-2026-02-21",
  "timestamp": 1708566000,
  "nonce": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "requires": ["shell:execute"],
  "risk": "MEDIUM",
  "payload": {
    "adapter": "shell",
    "cmd": "echo",
    "args": ["Hello from Sentinel"],
    "cwd": "."
  },
  "signature": {
    "alg": "ed25519",
    "keyId": "agent:gpt-v1-2026Q1",
    "sig": ""
  }
}
```

### Step 2: Generate Real Signature

Run this to sign the proposal:

```bash
node -e "
import fs from 'fs';
import { signEd25519 } from './src/core/signature.js';

const proposal = JSON.parse(fs.readFileSync('test-real-mutation.json', 'utf-8'));
const { signature, ...unsigned } = proposal;

const secretKeyB64 = fs.readFileSync('keys/secret.key', 'utf-8').trim();

const result = signEd25519({
  payloadObj: unsigned,
  secretKeyB64
});

proposal.signature.sig = result.signature;
fs.writeFileSync('test-real-mutation.json', JSON.stringify(proposal, null, 2));
console.log('✅ Proposal signed:', proposal.signature.sig);
"
```

### Step 3: Verify the Proposal

```bash
npm run verify -- --in test-real-mutation.json --keys-store config/keys.json
```

Expected output:
```json
{
  "status": "valid",
  "checks": {
    "schema": true,
    "signature": true,
    "nonce": true,
    "policy": true
  }
}
```

### Step 4: Execute It

```bash
npm run run -- --in test-real-mutation.json --keys-store config/keys.json --audit data/audit.log.jsonl
```

Expected output:
```
✅ Sentinel validated and executed
Hello from Sentinel
```

### Step 5: Verify Audit

```bash
npm run audit:verify -- --audit data/audit.log.jsonl
```

---

## Level 2: Real AI Proposals (With Gemini/ChatGPT)

### Setup: Get Your API Key

**For Google Gemini:**
```bash
# 1. Get API key from https://ai.google.dev
# 2. Set environment variable
$env:GOOGLE_API_KEY = "your-key-here"

# 3. Test it
node -e "
import fetch from 'node-fetch';

const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GOOGLE_API_KEY, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: 'Hello, Sentinel!' }]
    }]
  })
});

const data = await response.json();
console.log(data.candidates[0].content.parts[0].text);
"
```

**For OpenAI ChatGPT:**
```bash
# 1. Get API key from https://platform.openai.com
# 2. Set environment variable
$env:OPENAI_API_KEY = "sk-..."

# 3. Test it
node -e "
import fetch from 'node-fetch';

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Say hello' }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
"
```

### Create AI Proposal Generator

Create `test/generate-ai-proposal.js`:

```javascript
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { signEd25519 } from '../src/core/signature.js';
import fetch from 'node-fetch';

// Step 1: Ask AI to generate a command
async function callAI(prompt) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('⚠️  Set GOOGLE_API_KEY or OPENAI_API_KEY');
        return null;
    }

    if (process.env.GOOGLE_API_KEY) {
        // Use Gemini
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            }
        );
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } else {
        // Use OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    }
}

// Step 2: Parse AI response into a shell command
function parseAIResponse(aiText) {
    // Extract command from AI response
    // Example: AI says "List files with: ls -la"
    // Extract: "ls -la"
    
    const match = aiText.match(/ls\s+.*|echo\s+.*|cat\s+.*/);
    if (match) {
        const parts = match[0].split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);
        return { cmd, args };
    }
    
    throw new Error('Could not parse AI response into a command');
}

// Step 3: Create proposal
async function generateAIProposal() {
    console.log('🤖 Calling AI...');
    
    const prompt = 'Generate a simple shell command that lists directory contents. Just respond with the command, nothing else.';
    const aiResponse = await callAI(prompt);
    
    console.log('AI response:', aiResponse);
    
    const { cmd, args } = parseAIResponse(aiResponse);
    
    console.log(`✅ Parsed: cmd="${cmd}", args=${JSON.stringify(args)}`);
    
    const secretKeyB64 = fs.readFileSync(path.join(process.cwd(), 'keys/secret.key'), 'utf-8').trim();
    
    const proposal = {
        id: 'RUN_SHELL',
        commandId: crypto.randomUUID(),
        requesterId: 'agent:gpt',
        sessionId: `session:ai-test-${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
        nonce: crypto.randomBytes(32).toString('hex'),
        requires: ['shell:execute'],
        risk: 'LOW',
        payload: {
            adapter: 'shell',
            cmd,
            args,
            cwd: '.'
        },
        signature: {
            alg: 'ed25519',
            keyId: 'agent:gpt-v1-2026Q1',
            sig: ''
        }
    };
    
    // Remove signature for signing
    const { signature, ...proposalForSigning } = proposal;
    
    // Sign it
    const signResult = signEd25519({
        payloadObj: proposalForSigning,
        secretKeyB64
    });
    
    proposal.signature.sig = signResult.signature;
    
    // Save it
    const outputPath = path.join(process.cwd(), 'ai-proposal.json');
    fs.writeFileSync(outputPath, JSON.stringify(proposal, null, 2));
    
    console.log('✅ AI proposal saved:', outputPath);
    console.log('Next: npm run verify -- --in ai-proposal.json');
    console.log('Then:  npm run run -- --in ai-proposal.json');
}

generateAIProposal().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
```

### Run It

```bash
# Set API key
$env:GOOGLE_API_KEY = "your-api-key"

# Generate proposal from AI
node test/generate-ai-proposal.js

# Validate
npm run verify -- --in ai-proposal.json

# Execute
npm run run -- --in ai-proposal.json
```

---

## Level 3: Real After Effects CEP Extension

### Quick Setup

**Option A: Use Inline Validator (Fastest)**

1. Copy `src/cep/cepValidatorInline.js` into your AEP extension
2. In your CEP panel:

```javascript
import { validateProposal, createProposal, DEFAULT_CEP_POLICY } from './cepValidatorInline.js';

async function onGenerateClick() {
    // Step 1: Get AI-generated code (call your LLM)
    const aiCode = await callYourLLM('Generate JavaScript for AE');
    
    // Step 2: Create proposal
    const proposal = createProposal(aiCode, 'agent:cep-extension');
    
    // Step 3: Validate
    const decision = validateProposal(proposal, DEFAULT_CEP_POLICY);
    
    // Step 4: Execute if allowed
    if (decision.decision === 'ALLOW') {
        csInterface.evalScript(aiCode);
        showStatus('✅ Code executed');
    } else {
        showStatus(`❌ ${decision.message}`);
    }
}
```

**Option B: Use CLI Validator (Full Features)**

See [CEP_INTEGRATION_COMPLETE.md](CEP_INTEGRATION_COMPLETE.md) for full integration.

---

## Test Scenarios (Real-World)

### Scenario 1: AI Generates Safe Code (Should ALLOW)

**Proposal:**
- AI generates: `echo "test"`
- Sentinel validates: ✅ (allowed command)
- Result: ALLOW, execute

```bash
# Create proposal with safe command
cat > test-safe.json << 'EOF'
{
  "id": "RUN_SHELL",
  "commandId": "...",
  "requesterId": "agent:gpt",
  ...
  "payload": {
    "adapter": "shell",
    "cmd": "echo",
    "args": ["Hello"]
  }
}
EOF

npm run run -- --in test-safe.json
```

**Expected:** ✅ Executes

---

### Scenario 2: AI Generates Dangerous Code (Should DENY)

**Proposal:**
- AI generates: `rm -rf /`
- Sentinel validates: ❌ (rm not in allowlist)
- Result: DENY, blocked

```bash
# Create proposal with dangerous command
cat > test-dangerous.json << 'EOF'
{
  ...
  "payload": {
    "adapter": "shell",
    "cmd": "rm",
    "args": ["-rf", "/"]
  }
}
EOF

npm run run -- --in test-dangerous.json
```

**Expected:** ❌ COMMAND_NOT_ALLOWED

---

### Scenario 3: Replay Attack (Should DENY)

**Proposal:**
- Same proposal sent twice
- Sentinel detects: ❌ (nonce already used)
- Result: DENY, blocked

```bash
# Run same proposal twice
npm run run -- --in proposal.json
npm run run -- --in proposal.json  # Second time: REPLAY_NONCE error
```

**Expected:** ❌ First succeeds, second fails with REPLAY_NONCE

---

### Scenario 4: Tampered Policy (Should DENY)

**Proposal:**
- Attacker modifies policy to allow dangerous commands
- Sentinel validates: ❌ (policy signature invalid)
- Result: DENY, blocked

```bash
# Edit policy
nano config/policy.default.json
# Change: "allowCmds": ["rm"]

# Try to run
npm run run -- --in proposal.json
```

**Expected:** ❌ POLICY_SIGNATURE_INVALID

---

## Real Test Checklist

```
□ Generate proposal from AI (Level 2)
□ Validate proposal (all 4 gates pass)
□ Execute with shell adapter (mutation)
□ Check audit log (tamper-proof record)
□ Try dangerous command (verify denial)
□ Try replay attack (verify nonce protection)
□ Tamper with policy (verify signature check)
□ Test with real AEP extension (Level 3, optional)
```

---

## Commands Reference (Real Testing)

```bash
# 1. Initialize
npm run init

# 2. Generate AI proposal
node test/generate-ai-proposal.js

# 3. Validate
npm run verify -- --in ai-proposal.json --keys-store config/keys.json

# 4. Dry-run (safe preview)
npm run dryrun -- --in ai-proposal.json --keys-store config/keys.json

# 5. Execute (real mutation)
npm run run -- --in ai-proposal.json --keys-store config/keys.json --audit data/audit.log.jsonl

# 6. Check audit
npm run audit:verify -- --audit data/audit.log.jsonl

# 7. View last execution
Get-Content data/audit.log.jsonl | Select-Object -Last 1 | ConvertFrom-Json | ConvertTo-Json -Depth 10

# 8. Test dangerous command (will be blocked)
node bin/lbe.js run --in test-dangerous.json

# 9. Test replay (will be blocked)
npm run run -- --in ai-proposal.json
npm run run -- --in ai-proposal.json  # Blocked: REPLAY_NONCE
```

---

## What "Real" Means

**Real testing = moving from read-only to mutations**

| Phase | What Happens | Risk |
|-------|--------------|------|
| Observer-only | AI reports, no mutations | Zero |
| Shell adapter | AI executes commands | Medium (but gated) |
| Dangerous commands | AI tries rm/sudo/curl | Zero (blocked by policy) |
| CEP extension | AI executes JSX in AE | Medium (but gated) |

**Key insight:** Even with mutations, Sentinel gates EVERY action with cryptography + policy.

---

## Next Steps

**Pick one:**

1. **Test Level 1 (Shell Mutations)** - 15 minutes
   - Create proposal with real shell command
   - Execute and verify audit trail
   - Try dangerous command (should be blocked)

2. **Test Level 2 (AI Proposals)** - 30 minutes
   - Get Gemini/ChatGPT API key
   - Generate proposal from AI
   - Execute and verify

3. **Test Level 3 (CEP Extension)** - 2 hours
   - Integrate validator into AEP extension
   - Connect to AI
   - Test in real After Effects

4. **Implement Phase 1.4 (Policy Versioning)** - 3-4 hours
   - Prevent policy rollback attacks
   - Add version binding
   - Test tampering scenarios

**Which would you like?**
