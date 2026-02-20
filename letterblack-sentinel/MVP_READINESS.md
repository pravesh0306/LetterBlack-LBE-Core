# MVP Readiness Checklist

**Status:** Ready to certify for testing  
**Last Updated:** 2026-02-20  
**Scope:** Minimal viable proof with all 4 validation gates intact

---

## ✅ Implemented (Non-Negotiable Core)

These are in place and tested:

### 1. Schema Validation
- **Location:** `src/core/schema.js`
- **Status:** ✅ Validates proposal structure before any other gate
- **Test:** `npm run verify -- --in test-proposal.json`
- **Exit Code:** 0 (valid), 1 (invalid)

### 2. Signature Verification (Ed25519)
- **Location:** `src/core/signature.js`
- **Status:** ✅ Detached signature (RFC 8785 canonical JSON)
- **Key Format:** Versioned (`agent:name-v1-YYYYQN`)
- **Test:** Tamper any field → `SIGNATURE_INVALID`
- **Expected Behavior:** Rejects if payload mutated or key expired

### 3. Nonce Replay Protection
- **Location:** `src/core/nonceStore.js`
- **Status:** ✅ Stores `commandId:nonce` pairs in `data/nonce.db.json`
- **Test:** Re-run same proposal → `REPLAY_DETECTED`
- **Expected Behavior:** Each proposal requires unique nonce, never reused

### 4. Deny-by-Default Policy Enforcement
- **Location:** `src/core/policyEngine.js`
- **Status:** ✅ Allowlists only (no denylists shortcut requests)
- **Rules:** Requester must be in `policy.requesters[requesterId]`
- **Test:** Unknown requester → `POLICY_DENIED`
- **Expected Behavior:** Blocks unless explicitly allowed

### 5. Audit Logging (Immutable Append)
- **Location:** `src/core/auditLog.js`
- **Status:** ✅ Hash-chained, append-only (`data/audit.log.jsonl`)
- **Test:** `npm run audit:verify -- --audit data/audit.log.jsonl`
- **Expected Behavior:** Detects tampering via SHA256 hash chain

### 6. Proposal Generation
- **Location:** `test/generate-proposal.js`
- **Status:** ✅ Produces signed, valid proposal with fresh nonce
- **Test:** `node test/generate-proposal.js` → creates `test-proposal.json`
- **Expected Behavior:** One command, always valid, never replay on re-run

### 7. Deterministic Exit Codes + Structured JSON
- **Status:** ✅ Consistent across all commands
  - `0` = success
  - `1` = validation/policy failure
  - `2` = parse/config error
  - `9` = execution error
- **Output Format:** Structured JSON (not log text)

---

## 🟡 Parked (Defer Until Required)

These are designed but not built yet. Document them for later.

### 1. Integrity Strict Mode (`--integrity-strict`)
- **Purpose:** Verify distribution package integrity
- **Status:** 🟡 Deferred
- **When to Build:** Before packaging for distribution
- **File:** `src/core/integrity.js` (skeleton exists)
- **Design:** Hash all source files, verify on boot

### 2. Policy Version Binding "Hard" Rollout
- **Purpose:** Force policy update across fleet
- **Status:** 🟡 Deferred
- **Current:** Policy signature verified but version optional
- **When to Build:** Multi-instance deployment (v0.2+)
- **Design:** `policy.version` + rollout gates in `policyVersionGuard.js`

### 3. Request Rate Limiting
- **Purpose:** Prevent agent flood attacks
- **Status:** 🟡 Skeleton only
- **Current:** `requestRateLimiter.js` exists but not enforced in validator
- **When to Build:** Production traffic patterns known
- **Design:** Per-requester token bucket with `data/rate-limit.db.json`

### 4. Enterprise Narrative / Whitepapers
- **Status:** 🟡 Deferred
- **Current:** `LetterBlack_Sentinel_OpenBook.md` exists
- **When to Build:** After MVP proof of resilience
- **Files:** Do not add to core; keep in `LBCP_Plan/`

### 5. Deep Audit Analytics / Dashboards
- **Status:** 🟡 Deferred
- **Current:** Audit log format stable; queries manual
- **When to Build:** After 3+ months production run
- **Design:** Separate repo (not inside Sentinel) that reads audit logs

---

## 🚀 MVP Test Runbook (Ready Now)

Run this sequence to certify "ready to test":

### Step 1: Initialize
```bash
npm run init
```
**Check:**
```bash
Test-Path config/keys.json       # True
Test-Path keys/secret.key        # True
Test-Path data/nonce.db.json     # True
Test-Path data/audit.log.jsonl   # True (may be empty)
```

### Step 2: Health Check
```bash
npm run health
```
**Expected:** All checks `ok`

### Step 3: Generate Valid Proposal
```bash
node test/generate-proposal.js
```
**Check:**
```bash
Get-Content test-proposal.json | ConvertFrom-Json | % { $_.nonce.Length }  # Should be 64
```

### Step 4: Verify (Schema + Signature + Nonce + Policy)
```bash
npm run verify -- --in test-proposal.json --keys-store config/keys.json
```
**Expected Output:**
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

### Step 5: Dry-Run (Validate + Simulate)
```bash
npm run dryrun -- --in test-proposal.json --keys-store config/keys.json
```
**Expected:** Adapter `noop` simulated, no side effects

### Step 6: Real Run (Validate + Execute + Audit)
```bash
npm run run -- --in test-proposal.json --keys-store config/keys.json
```
**Check Audit Log:**
```bash
Get-Content data/audit.log.jsonl | Select-Object -Last 1 | ConvertFrom-Json | ConvertTo-Json -Depth 10
```
**Should contain:**
```json
{
  "commandId": "...",
  "decision": "ALLOW",
  "adapter": "noop",
  "status": "completed",
  "hash": "sha256:...",
  "previousHash": "sha256:..."
}
```

### Step 7: Verify Audit Integrity
```bash
npm run audit:verify -- --audit data/audit.log.jsonl
```
**Expected:**
```json
{
  "valid": true,
  "entriesVerified": 1,
  "hashedChainValid": true
}
```

### Step 8: Negative Control — Replay Protection
```bash
# Re-run the same proposal (should fail)
npm run run -- --in test-proposal.json --keys-store config/keys.json
```
**Expected Exit Code:** `1` (failure)  
**Expected Error:** `REPLAY_DETECTED`

### Step 9: Negative Control — Signature Tampering
```bash
# Edit test-proposal.json: change one character in payload
# Then try to run
npm run run -- --in test-proposal.json --keys-store config/keys.json
```
**Expected Exit Code:** `1` (failure)  
**Expected Error:** `SIGNATURE_INVALID`

### Step 10: Negative Control — Policy Enforcement
```bash
# Edit test-proposal.json: change requesterId to "agent:unauthorized"
# Then try to run
npm run run -- --in test-proposal.json --keys-store config/keys.json
```
**Expected Exit Code:** `1` (failure)  
**Expected Error:** `POLICY_DENIED`

---

## 🎯 Certification Checklist

✅ **Ready for Testing** when all 10 steps complete without error:

- [ ] Step 1: Initialize
- [ ] Step 2: Health Check passes
- [ ] Step 3: Proposal generates with valid signature
- [ ] Step 4: Verify shows all 4 gates pass
- [ ] Step 5: Dry-run completes without side effects
- [ ] Step 6: Real run completes and audit entry appended
- [ ] Step 7: Audit integrity verified (hash chain valid)
- [ ] Step 8: Replay protection blocks duplicate proposal
- [ ] Step 9: Signature tampering detected
- [ ] Step 10: Policy enforcement blocks unauthorized requester

---

## 📝 Development Flow (Low-Friction)

To reduce iteration pain **without bypassing gates:**

### Default: Always Use `generate-proposal.js`
```bash
node test/generate-proposal.js  # Fresh proposal every time
npm run dryrun -- --in test-proposal.json --keys-store config/keys.json
npm run run -- --in test-proposal.json --keys-store config/keys.json
```

**Why:** Eliminates nonce collisions, no re-signing needed.

### Keep Policy Minimal & Stable
Current `config/policy.default.json`:
```json
{
  "requesters": {
    "agent:gpt": {
      "allowAdapters": ["noop", "shell"],
      "allowCommands": ["RUN_SHELL"]
    }
  }
}
```

**Expand gradually after pipeline is stable.**

### Use Dry-Run as Your Fast Loop
```bash
npm run dryrun -- --in test-proposal.json --keys-store config/keys.json
```

**Why:** Validates all 4 gates but avoids side effects. Still 100% representative.

---

## ⛔ What NOT to Do (Architecture Boundaries)

These are explicitly forbidden by constitutional invariant:

- ❌ Bypass signature verification based on `--unsafe` flag
- ❌ Skip nonce checking in dev environment
- ❌ Route Agent → Adapter directly (bypass Controller)
- ❌ Add `process.env.SKIP_POLICY` logic to Controller
- ❌ Read phase state to decide gate behavior
- ❌ Allow partial validation (all 4 gates or fail)

---

## Reference

- **Testing Guide:** `TESTING_GUIDE.md`
- **Agent Instructions:** `.github/copilot-instructions.md`
- **Architecture:** `LBCP_Plan/01_ARCHITECTURE.md`
- **Proposal Spec:** `README.md` (Proposal Lifecycle section)
