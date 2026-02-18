# Sentinel Real-World Testing Guide

## Prerequisites Check

```powershell
# Navigate to Sentinel directory
cd d:\Developement\Core_Control\letterblack-sentinel

# Verify Node.js version (must be ≥20.9.0)
node --version

# Check if initialized
Test-Path config/keys.json  # Should be True
Test-Path keys/secret.key   # Should be True
```

## Test 1: Health Check (Deployment Readiness)

```powershell
npm run health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "checks": {
    "keysStore": "ok",
    "policy": "ok",
    "policySig": "ok",
    "nonceDb": "ok",
    "auditLog": "ok",
    "dataWritable": "ok"
  }
}
```

**What This Tests:** All critical files exist and data directory is writable.

---

## Test 2: Generate a Valid Proposal

```powershell
# Generate a signed test proposal
node test/generate-proposal.js
```

This creates `test-proposal.json` with:
- Proper schema
- Valid signature
- Unique nonce
- Current timestamp

**Inspect the proposal:**
```powershell
Get-Content test-proposal.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

## Test 3: Validate Proposal (No Execution)

```powershell
npm run verify -- --in test-proposal.json --keys-store config/keys.json
```

**Expected Output:**
```json
{
  "status": "valid",
  "commandId": "...",
  "checks": {
    "schema": true,
    "keyId": true,
    "timestamp": true,
    "signature": true,
    "nonce": true,
    "policy": true
  },
  "risk": "LOW"
}
```

**What This Tests:** All 4 validation gates pass (schema → signature → nonce → policy).

**Exit Code:** Should be `0` (success)

---

## Test 4: Dry-Run (Validation + Simulation)

```powershell
npm run dryrun -- --in test-proposal.json --keys-store config/keys.json
```

**Expected Output:**
```json
{
  "validation": {
    "status": "valid",
    "checks": { ... }
  },
  "execution": {
    "adapter": "noop",
    "commandId": "...",
    "status": "simulated",
    "message": "Dry-run complete (no actual execution)"
  }
}
```

**What This Tests:** Validation passes + adapter simulation (no side effects).

---

## Test 5: Real Execution (Controlled)

```powershell
npm run run -- --in test-proposal.json --keys-store config/keys.json
```

**Expected Output:**
```json
{
  "validation": { "status": "valid", ... },
  "execution": {
    "adapter": "noop",
    "commandId": "...",
    "status": "completed",
    "timestamp": "..."
  },
  "receipt": {
    "commandId": "...",
    "status": "completed",
    "signature": "..."
  }
}
```

**What This Tests:** Full pipeline including audit logging.

**Verify Audit Log:**
```powershell
Get-Content data/audit.log.jsonl | Select-Object -Last 1 | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

## Test 6: Verify Audit Integrity

```powershell
npm run audit:verify -- --audit data/audit.log.jsonl
```

**Expected Output:**
```json
{
  "valid": true,
  "entries": 1,
  "hashChainIntact": true
}
```

**What This Tests:** Tamper-evident hash chain is intact.

---

## Test 7: Replay Attack Prevention

```powershell
# Try to run the same proposal again (should fail)
npm run run -- --in test-proposal.json --keys-store config/keys.json
```

**Expected Output:**
```json
{
  "status": "error",
  "error": "NONCE_ALREADY_USED",
  "message": "Nonce 'xxx' already used in session 'xxx'"
}
```

**Exit Code:** Should be non-zero (failure)

**What This Tests:** Nonce store prevents replay attacks.

---

## Test 8: Policy Violation (Blocked Command)

**Create a blocked proposal:**
```powershell
# Copy test proposal
Copy-Item test-proposal.json test-blocked.json

# Edit to use a disallowed command ID
$proposal = Get-Content test-blocked.json | ConvertFrom-Json
$proposal.id = "DELETE_ALL"  # Not in policy allowCommands
$proposal.commandId = [guid]::NewGuid().ToString()
$proposal.nonce = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
$proposal | ConvertTo-Json -Depth 10 | Set-Content test-blocked.json
```

**Note:** This proposal won't have a valid signature, but you'll see policy rejection first.

```powershell
npm run verify -- --in test-blocked.json --keys-store config/keys.json
```

**Expected Error:**
```json
{
  "status": "invalid",
  "errors": [
    {
      "type": "POLICY_ERROR",
      "message": "Command 'DELETE_ALL' not allowed for requester"
    }
  ]
}
```

**What This Tests:** Deny-by-default policy enforcement.

---

## Test 9: Signature Tampering Detection

```powershell
# Tamper with a valid proposal
$proposal = Get-Content test-proposal.json | ConvertFrom-Json
$proposal.payload.cmd = "rm -rf /"  # Malicious change
$proposal | ConvertTo-Json -Depth 10 | Set-Content test-tampered.json

npm run verify -- --in test-tampered.json --keys-store config/keys.json
```

**Expected Error:**
```json
{
  "status": "invalid",
  "errors": [
    {
      "type": "SIGNATURE_INVALID",
      "message": "Signature verification failed"
    }
  ]
}
```

**What This Tests:** Cryptographic integrity protection.

---

## Test 10: Policy Signature Verification

```powershell
# Edit policy (add a new requester)
$policy = Get-Content config/policy.default.json | ConvertFrom-Json
$policy.requesters.'agent:test' = @{
    allowCommands = @("RUN_SHELL")
    allowAdapters = @("noop")
}
$policy | ConvertTo-Json -Depth 10 | Set-Content config/policy.default.json

# Try to run without re-signing policy (should fail)
npm run verify -- --in test-proposal.json --keys-store config/keys.json
```

**Expected Error:**
```json
{
  "status": "error",
  "error": "POLICY_SIG_INVALID",
  "message": "Policy signature verification failed"
}
```

**Fix by re-signing:**
```powershell
npm run policy:sign -- --config config/policy.default.json --policy-sig config/policy.sig.json
npm run verify -- --in test-proposal.json --keys-store config/keys.json  # Now works
```

**What This Tests:** Policy integrity binding and version monotonic guard.

---

## Test 11: Run Security Invariant Test Suite

```powershell
npm test
```

**Expected Output:**
```
✔ Security Invariant: Signature verification cannot be bypassed
✔ Security Invariant: Nonce replay protection works
✔ Security Invariant: Policy gates cannot be skipped
✔ Security Invariant: Expired keys are rejected
✔ Security Invariant: Tampered policy is rejected
...
```

**What This Tests:** All constitutional guarantees in isolated sandboxes.

---

## Test 12: Docker Isolation Validation

```powershell
# Build container
docker build -f deploy/docker/Dockerfile -t letterblack-sentinel:test .

# Validate filesystem isolation
bash deploy/docker/container-validation.sh letterblack-sentinel:test
```

**Expected Output:**
```
✔ Root FS is read-only
✔ Config directory read-only
✔ Data directory writable
✔ User is non-root
✔ No secrets in image
```

**What This Tests:** Production deployment security model.

---

## Real-World Workflow: CEP Integration (When Implemented)

### 1. Generate Proposal for After Effects Action

```javascript
// proposal-ae-getinfo.json
{
  "id": "CEP_ACTION",
  "commandId": "...",
  "requesterId": "agent:ui-v1",
  "sessionId": "session:cep-test",
  "timestamp": 1771287440,
  "nonce": "...",
  "requires": ["cep:execute"],
  "risk": "LOW",
  "payload": {
    "adapter": "cep",
    "actionId": "ae.getProjectInfo",
    "args": {},
    "timeoutMs": 5000
  },
  "signature": { ... }
}
```

### 2. Validate + Execute

```powershell
npm run run -- --in proposal-ae-getinfo.json --keys-store config/keys.json
```

### 3. Check Audit Trail

```powershell
npm run audit:verify -- --audit data/audit.log.jsonl
Get-Content data/audit.log.jsonl | Select-Object -Last 3
```

---

## Common Issues & Fixes

### Issue: "TIMESTAMP_SKEW_EXCEEDED"
**Cause:** System clock is off or proposal is too old.
**Fix:** Regenerate proposal with current timestamp:
```powershell
node test/generate-proposal.js
```

### Issue: "NONCE_ALREADY_USED"
**Cause:** Trying to replay an executed proposal.
**Fix:** Generate new proposal with unique nonce.

### Issue: "POLICY_SIG_INVALID" 
**Cause:** Policy was edited but not re-signed.
**Fix:**
```powershell
npm run policy:sign -- --config config/policy.default.json --policy-sig config/policy.sig.json
```

### Issue: "KEY_EXPIRED"
**Cause:** Key has passed `expiresAt` timestamp.
**Fix:** Rotate to new key or extend key validity (in dev only).

---

## Performance Benchmarks

Test validation throughput:

```powershell
Measure-Command {
    1..100 | ForEach-Object {
        npm run verify -- --in test-proposal.json --keys-store config/keys.json | Out-Null
    }
}
```

**Target:** <50ms per validation on modern hardware.

---

## Debugging Tips

### Enable Verbose Logging
```powershell
$env:DEBUG = "sentinel:*"
npm run verify -- --in test-proposal.json --keys-store config/keys.json
```

### Inspect Nonce Database
```powershell
Get-Content data/nonce.db.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Verify Key Files
```powershell
# Public key should be distributable
Get-Content keys/public.key

# Secret key permissions (should be restricted)
(Get-Acl keys/secret.key).Access | Format-Table IdentityReference,FileSystemRights
```

### Check Policy Structure
```powershell
Get-Content config/policy.default.json | ConvertFrom-Json | 
    Select-Object -ExpandProperty requesters | ConvertTo-Json -Depth 5
```

---

## Next Steps After Validation

Once all tests pass:
1. ✅ Build Docker image for production
2. ✅ Deploy to target environment (on-prem/cloud)
3. ✅ Implement CEP adapter with file-based bridge
4. ✅ Create proposal signing tool for UI layer
5. ✅ Set up audit log rotation/archival
6. ✅ Configure monitoring for policy violations
