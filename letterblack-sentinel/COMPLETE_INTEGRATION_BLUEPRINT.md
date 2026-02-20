# LetterBlack Sentinel: Complete Integration Blueprint

## All Features Combined (Feb 20, 2026 Snapshot)

You have built these independent pieces:

✅ **Sentinel Core** (Node.js CLI)
- 4-gate validation (schema → signature → nonce → policy)
- Deny-by-default policy
- Hash-chain audit log
- Observer-only mode

✅ **CEP Integration** (Option A/B validators)
- Inline validator (no external process)
- CLI validator (calls Sentinel)
- Example CEP extension

✅ **LBCP Vision** (6-phase roadmap)
- Phase 1: Controller Core (you are here)
- Phase 2: Browser UI
- Phase 3: CEP Adapter
- Phases 4-6: Advanced features + distribution

✅ **Enterprise Playbook** (OpenBook)
- Phase 1.4: Policy version binding (next step)
- Deployment runbook
- Security invariants
- Red lines (never break)

---

## How They All Fit Together

```
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: AI/LLM (Untrusted Advisor)                         │
│ - Generates JSX code / proposals / intents                  │
└────────────────┬────────────────────────────────────────────┘
                 │ (signed proposal JSON)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ TIER 2: SENTINEL CONTROLLER (Authority)                    │
│ location: CLI (Node.js) or embedded in CEP                 │
│ features:                                                   │
│  • Schema validation                                        │
│  • Ed25519 signature verification                          │
│  • Nonce replay protection                                 │
│  • Timestamp skew check                                    │
│  • Deny-by-default policy enforcement                      │
│  • Policy version binding (Phase 1.4 — next)              │
│  • Controller integrity check                              │
│  • Rate limiting                                           │
│ output: { decision: ALLOW|DENY, reason, commandId }       │
└────────────────┬────────────────────────────────────────────┘
                 │ (decision JSON)
                 ▼
        ┌────────────────┐
        │ ALLOW?         │
        └────────────────┘
         /              \
        /                \
    NO ◄──────────────────► YES
    │                        │
    │                        ▼
    │                  ┌──────────────────────────────────┐
    │                  │ TIER 3: ADAPTER (Hands)         │
    │                  │ pick one:                        │
    │                  │ • noop (dry-run, no-op)          │
    │                  │ • shell (commands)               │
    │                  │ • observer (non-mutating)        │
    │                  │ • cep (future: JSX in AE)        │
    │                  │ • blender (future: Python)       │
    │                  │ output: { status, result, ... }  │
    │                  └──────────────────────────────────┘
    │                        │
    │                        ▼
    │                  ┌──────────────────────────────────┐
    │                  │ TIER 4: AUDIT LOG                │
    │                  │ (hash-chain append-only)         │
    │                  │ One entry per execution          │
    │                  └──────────────────────────────────┘
    │
    └──────► Show user: BLOCKED (reason + solve hint)
```

---

## Feature-by-Feature: How They Integrate

### Feature 1: Core Validation (Sentinel)

**Files:**
```
src/core/
  ├── schema.js           (gate 1: structural validation)
  ├── signature.js        (gate 2: cryptographic proof)
  ├── nonceStore.js       (gate 3: replay prevention)
  ├── policyEngine.js     (gate 4: authorization)
  ├── validator.js        (orchestrates all 4 gates)
  └── auditLog.js         (records decisions)
```

**Used by:**
- CLI: `node bin/lbe.js verify --in proposal.json`
- CEP (Option A): External call via child_process
- CEP (Option B): Direct import of validation functions

**Output:**
```json
{
  "commandId": "...",
  "decision": "ALLOW|DENY",
  "reason": "Code, string",
  "message": "Human-readable explanation"
}
```

---

### Feature 2: Observer-Only Mode

**How it works:**
1. AI generates `observe.irregularity` proposal
2. Sentinel validates with all 4 gates (same process)
3. Policy restricts `agent:observer` to `observe.*` commands only
4. Observer adapter records observation (no mutations)
5. Audit log captures what the AI observed

**Use case:** Week 1-2 of testing. AI reports issues, never executes code.

**Files:**
```
src/adapters/observerAdapter.js    (validates observation type)
config/policy.default.json           (agent:observer restricts to observe.*)
test/generate-observer-proposal.js   (creates test proposals)
```

**Result:**
```json
{
  "adapter": "observer",
  "status": "recorded",
  "observation": {
    "source": "CEP|Browser",
    "issueType": "NO_LAYER_SELECTED",
    "severity": "low",
    "description": "..."
  }
}
```

---

### Feature 3: CEP Integration (Two Paths)

#### Path A: Call Sentinel CLI from CEP

```javascript
// In your CEP extension
const { validateViaCliSync } = require('./cepValidatorCLI.js');

const proposal = createProposal(aiGeneratedCode);
const decision = validateViaCliSync(proposal, sentinelBinPath, policyPath);

if (decision.decision === 'ALLOW') {
  csInterface.evalScript(aiGeneratedCode);
}
```

**Pros:** Full features (signatures, nonce, audit)  
**Cons:** Extra process overhead

#### Path B: Inline Validator in CEP

```javascript
// In your CEP extension
const { validateProposal, DEFAULT_CEP_POLICY } = require('./cepValidatorInline.js');

const proposal = createProposal(aiGeneratedCode);
const decision = validateProposal(proposal, DEFAULT_CEP_POLICY);

if (decision.decision === 'ALLOW') {
  csInterface.evalScript(aiGeneratedCode);
}
```

**Pros:** No external process, instant  
**Cons:** Simpler policy model, no signatures yet

**Files:**
```
src/cep/
  ├── cepValidatorInline.js        (Option B)
  ├── cepValidatorCLI.js           (Option A)
  └── cepExtensionExample.jsx      (complete example)
```

---

### Feature 4: Policy Enforcement (Deny-by-Default)

**Current policy structure:**
```json
{
  "version": 1,
  "createdAt": "2026-02-20T...",
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

**What this means:**
- Agent must be registered
- Agent can only use allowed adapters
- Agent can only execute allowed commands
- Everything else is blocked

**Files:**
```
config/policy.default.json          (your rules)
config/policy.sig.json              (signed policy — Phase 1.4)
src/core/policyEngine.js            (enforces rules)
src/core/policySignature.js         (validates policy signature)
```

---

### Feature 5: Audit Trail (Hash-Chain)

**Every execution creates one audit entry:**
```json
{
  "timestamp": "2026-02-20T06:00:00.000Z",
  "commandId": "550e8400-...",
  "requesterId": "agent:cep-extension",
  "decision": "ALLOW",
  "adapter": "noop",
  "status": "success",
  "duration_ms": 145,
  "result": "...",
  "previousHash": "sha256:abc...",
  "hash": "sha256:xyz..."
}
```

**Verification:**
```bash
npm run audit:verify -- --audit data/audit.log.jsonl
```

**Files:**
```
src/core/auditLog.js                (hash-chain append-only)
src/cli/commands/auditVerify.js     (verify integrity)
data/audit.log.jsonl                (immutable ledger)
```

---

### Feature 6: Phase 1.4 Policy Version Binding (NEXT)

**Problem it solves:** Attacker can't downgrade policy to a weaker old version.

**Implementation:**
```json
{
  "version": 2,
  "createdAt": "2026-02-20T06:00:00Z",
  "default": "DENY",
  ...
}
```

- Policy includes `version` and `createdAt`
- Signature binds these fields
- Store last-accepted version in `data/policy.state.json`
- Block if version < last version
- Block if createdAt is older

**Files to create/update:**
```
config/policy.state.json            (NEW: track last-accepted policy)
src/core/policyVersionGuard.js      (NEW: enforce binding)
src/cli/commands/policySign.js      (UPDATE: bind version to signature)
```

---

## End-to-End Workflow: All Features

### Scenario: CEO Asks AI to Optimize After Effects Script

**Step 1: AI Generates Proposal**
```json
{
  "id": "RUN_SCRIPT",
  "commandId": "uuid-123",
  "requesterId": "agent:cep-extension",
  "sessionId": "session:workflow-1",
  "timestamp": 1708896000,
  "nonce": "a1b2c3...",
  "requires": ["evalScript"],
  "payload": {
    "adapter": "noop",
    "code": "this.position[0] *= 0.9;"
  },
  "signature": {
    "alg": "ed25519",
    "keyId": "agent:cep-v1-2026Q1",
    "sig": "base64-encoded-sig"
  }
}
```

**Step 2: CEP Extension Calls Validator**
```javascript
// Option B (inline)
const decision = validateProposal(proposal, DEFAULT_CEP_POLICY);
```

**Step 3: Sentinel Validates (All 4 Gates)**
- ✅ Schema: id, commandId, signature all present
- ✅ Signature: Ed25519 verification passes
- ✅ Nonce: Not seen before (checked nonce.db.json)
- ✅ Policy: agent:cep-extension is allowed RUN_SCRIPT with noop adapter

**Step 4: Adapter Executes**
```
decision === 'ALLOW' → adapter.execute(payload) → result
```

**Step 5: Audit Log Recorded**
```json
{
  "timestamp": "2026-02-20T06:00:00.000Z",
  "commandId": "uuid-123",
  "requesterId": "agent:cep-extension",
  "decision": "ALLOW",
  "adapter": "noop",
  "status": "success",
  "result": "Code would execute: this.position[0] *= 0.9;",
  "hash": "sha256:new...",
  "previousHash": "sha256:old..."
}
```

**Step 6: User Sees Result**
```
✅ Validation passed
🚀 Code executed
📋 Audit: Command 550e8400-... recorded
```

---

## Deployment Architecture: Where It All Lives

### Option 1: Standalone CLI (Development/Small Studio)

```
Your Machine
├── Node.js 20+
├── Sentinel CLI (npm install)
├── config/
│   ├── policy.default.json
│   ├── policy.sig.json
│   └── keys.json
├── data/
│   ├── nonce.db.json
│   ├── audit.log.jsonl
│   └── policy.state.json
└── bin/lbe.js
```

**How it works:**
```bash
# 1. Initialize
npm run init

# 2. Generate proposal (from AI)
node test/generate-proposal.js > proposal.json

# 3. Validate
npm run verify -- --in proposal.json

# 4. Execute (if allowed)
npm run run -- --in proposal.json

# 5. Check audit
npm run audit:verify -- --audit data/audit.log.jsonl
```

---

### Option 2: Docker On-Prem (Enterprise Studio)

```
┌──────────────────────────────────┐
│ Docker Container                 │
│ ├── /app/src/     (read-only)   │
│ ├── /app/bin/     (read-only)   │
│ ├── /app/config/  (mounted RO)  │
│ │   ├── policy.json              │
│ │   └── keys.json                │
│ └── /app/data/    (mounted RW)   │
│     ├── nonce.db.json            │
│     ├── audit.log.jsonl          │
│     └── policy.state.json        │
└──────────────────────────────────┘
       │
       │ POST /validate
       ▼
   External AI Service
```

**Docker command:**
```bash
docker run \
  -v /studio/config:/app/config:ro \
  -v /studio/data:/app/data:rw \
  letterblack-sentinel:latest \
  run --in /tmp/proposal.json
```

---

### Option 3: Embedded in CEP (Future)

```
┌──────────────────────────────────┐
│ After Effects Extension           │
│ ├── Panel UI (jsx)               │
│ ├── cepValidatorInline.js        │
│ ├── policy.default.json          │
│ └── Node bridge (IPC)            │
└──────────────────────────────────┘
       │
       │ Proposal JSON
       ▼
   validateProposal()
       │
       │ decision
       ▼
   csInterface.evalScript(code)
```

---

## Testing All Features Together

### Test 1: Validation Gates Work
```bash
npm test  # runs security-invariants.test.js
```

Expected: All 4 gates enforce correctly

### Test 2: Observer Mode Works
```bash
node test/generate-observer-proposal.js > observer.json
npm run verify -- --in observer.json
npm run run -- --in observer.json
tail -1 data/audit.log.jsonl | jq .
```

Expected: Observation recorded, no mutations

### Test 3: CEP Integration Works
```bash
# From sentinel root
node test/test-cep-integration.js
```

Expected: Both Option A (CLI) and Option B (inline) pass

### Test 4: Policy Blocks Unauthorized
```bash
# Edit proposal: change requesterId to "agent:unauthorized"
npm run verify -- --in proposal.json
```

Expected: POLICY_DENIED (exit code 1)

### Test 5: Audit Integrity
```bash
# Manually tamper with audit log
npm run audit:verify -- --audit data/audit.log.jsonl
```

Expected: HASH_MISMATCH (tampering detected)

---

## Decision Tree: Which Features Do You Need?

```
Q: Do you need AI to generate code in After Effects?
├─ YES → Use CEP option A or B + observer mode first
└─ NO  → Use Sentinel CLI standalone (for now)

Q: Do you need cryptographic proof (signatures)?
├─ YES → Use option A (CLI) + implement Phase 1.4
└─ NO  → Use option B (inline validator)

Q: Do you need zero-risk first week?
├─ YES → Start with observer-only mode (no mutations)
└─ NO  → Start with noop adapter (dry run)

Q: Are you deploying to a studio network?
├─ YES → Docker on-prem deployment
└─ NO  → Standalone CLI is fine

Q: Do you want to prevent policy rollback?
├─ YES → Implement Phase 1.4 (policy version binding)
└─ NO  → Skip for now (basic policy works)
```

---

## Your Next Move (Pick One)

### Option 1: Start Small (Recommended)
1. Run `npm run init`
2. Generate observer proposal: `node test/generate-observer-proposal.js`
3. Validate: `npm run verify --in observer.json`
4. Execute: `npm run run --in observer.json`
5. Check audit: `npm run audit:verify`

**Time:** 30 minutes  
**Risk:** Zero (observer-only, read-only)

### Option 2: Implement Phase 1.4
1. Update policy.json to include `version` + `createdAt`
2. Implement `policyVersionGuard.js`
3. Update `policySign.js` to bind version
4. Create `data/policy.state.json` tracker
5. Add tests for version regression

**Time:** 3-4 hours  
**Value:** Prevents policy downgrade attacks

### Option 3: Build CEP Extension
1. Copy `cepValidatorInline.js` into your CEP project
2. Use `cepExtensionExample.jsx` as template
3. Test with `node test/test-cep-integration.js`
4. Integrate with your After Effects panel

**Time:** 2-3 hours  
**Risk:** Medium (can mutate, but gated by Sentinel)

### Option 4: Docker Deployment
1. Build Dockerfile from template
2. Mount config and data volumes
3. Create runbook
4. Test on clean machine

**Time:** 2-3 hours  
**Value:** Enterprise-ready deployment

---

## Summary: All Features Combined

| Feature | Status | Files | Used By |
|---------|--------|-------|---------|
| 4-gate validation | ✅ | src/core/*.js | CLI, CEP |
| Observer-only mode | ✅ | src/adapters/observerAdapter.js | CEP, CLI |
| Deny-by-default policy | ✅ | config/policy.default.json | Validator |
| Hash-chain audit | ✅ | src/core/auditLog.js | All |
| CEP Option A (CLI) | ✅ | src/cep/cepValidatorCLI.js | CEP extension |
| CEP Option B (inline) | ✅ | src/cep/cepValidatorInline.js | CEP extension |
| Policy version binding | 🟡 | Phase 1.4 (next) | TBD |
| Docker deployment | 🟡 | Phase 2 (future) | TBD |

**Everything works NOW. Phase 1.4 hardens policy. Then phases 2-6 expand reach.**

Pick your next move above. Want me to help with any of them?
