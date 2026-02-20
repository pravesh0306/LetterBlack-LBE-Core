# Observer-Only Governance Mode

## What It Is

A non-mutating variant of Sentinel that lets AI **observe and report** without **executing or changing** anything.

All 4 validation gates still apply.
Zero mutation risk.
Full audit trail.

---

## When to Use It

### Start with Observer Mode If:
- ✅ You want to test Sentinel without risk
- ✅ You want AI to report irregularities (not execute)
- ✅ You want to build trust gradually (1–2 weeks)
- ✅ You want structural observation record

### Then Move to Mutations If:
- ✅ Observations prove valuable
- ✅ You trust the governance pipeline
- ✅ Specific mutations are clearly beneficial

---

## The Pattern

```
Traditional (Mutating):
  Agent → Controller → Adapter (execute) → Change System → Audit

Observer-Only (Safe):
  Agent → Controller → Observer Adapter (no-op) → Record Observation → Audit
```

**Key Difference:** Observer adapter returns a record, not a result.

**Same Security:** All 4 gates, all invariants, all audit guarantees.

---

## Example: After Effects Irregularity

AI detects: "No layer selected but JSX tried to apply expression"

Observer proposal:
```bash
node test/generate-observer-proposal.js
```

Generates signed proposal with:
- `issueType: "NO_LAYER_SELECTED"`
- `description: "Attempted property expression application with no active layer"`
- `severity: "low"`
- `metadata: { compName: "MainComp", ... }`

### Validate (All 4 Gates)
```bash
npm run verify -- --in observer-proposal.json --keys-store config/keys.json
```

Expected:
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

### Run (Record Observation)
```bash
npm run run -- --in observer-proposal.json --keys-store config/keys.json
```

Expected:
```json
{
  "adapter": "observer",
  "status": "recorded",
  "observation": {
    "issueType": "NO_LAYER_SELECTED",
    "description": "...",
    "severity": "low",
    "metadata": { ... }
  }
}
```

### Verify Audit Log
```bash
Get-Content data/audit.log.jsonl | Select-Object -Last 1
```

Entry:
```json
{
  "commandId": "observe.irregularity",
  "adapter": "observer",
  "status": "recorded",
  "observation": { ... },
  "hash": "sha256:xyz...",
  "previousHash": "sha256:abc..."
}
```

---

## Why This Is Safe

- ❌ No filesystem access
- ❌ No shell execution
- ❌ No state mutation
- ❌ No policy bypasses
- ✅ All 4 gates enforced
- ✅ Tamper-evident audit
- ✅ Cryptographic proof
- ✅ Nonce replay protection

---

## Policy Rule

Observer proposals are explicitly restricted:

```json
{
  "requesters": {
    "agent:observer": {
      "allowAdapters": ["observer"],
      "allowCommands": ["observe.irregularity"]
    }
  }
}
```

**If `agent:observer` tries to run `RUN_SHELL`:** ❌ POLICY_DENIED

---

## 7-Day Test Protocol

### Days 1–3: Setup
```bash
npm run init
npm run health
node test/generate-observer-proposal.js
npm run verify -- --in observer-proposal.json --keys-store config/keys.json
```

### Days 4–6: Run Observer
```bash
npm run run -- --in observer-proposal.json --keys-store config/keys.json
# Check audit log
Get-Content data/audit.log.jsonl | Select-Object -Last 1
```

### Day 7: Evaluate

Ask:
1. **Did observations provide value?** (Did they catch something real?)
2. **Did the audit trail help?** (Did you understand what happened?)
3. **Would mutations help?** (What would you want to execute?)
4. **Do you trust the system?** (Would you let it mutate selectively?)

If "yes" to 3+ questions → Ready for selective mutations.

---

## Graduation Path

### Phase 1 (Week 1): Observer-Only
- `agent:observer` → `observe.irregularity`
- No mutations
- Build trust in governance

### Phase 2 (Week 2+): Selective Mutations
- `agent:mutation` → `apply.effect`, `compose.create`
- Restricted command set
- Still deny-by-default
- Still audit-logged

---

## What Observer Proposals Look Like

```json
{
  "commandId": "observe.irregularity",
  "requesterId": "agent:observer",
  "payload": {
    "source": "CEP",
    "context": "AfterEffects",
    "issueType": "NO_LAYER_SELECTED",
    "description": "AI attempted to apply effect but no layer selected",
    "severity": "low",
    "metadata": {
      "compName": "MainComp",
      "attemptedAction": "applyPropertyExpression",
      "timestamp": 1739991600
    }
  },
  "timestamp": 1739991600,
  "nonce": "unique64charhex...",
  "signature": {
    "alg": "ed25519",
    "keyId": "agent:observer-v1-2026Q1",
    "sig": "base64signature..."
  }
}
```

Generate with:
```bash
node test/generate-observer-proposal.js
```

---

## Observer Audit Log Entry

```json
{
  "timestamp": "2026-02-20T06:00:00.000Z",
  "commandId": "observe.irregularity",
  "requesterId": "agent:observer",
  "decision": "ALLOW",
  "adapter": "observer",
  "status": "recorded",
  "observation": {
    "source": "CEP",
    "context": "AfterEffects",
    "issueType": "NO_LAYER_SELECTED",
    "description": "AI attempted to apply effect but no layer selected",
    "severity": "low",
    "metadata": { "compName": "MainComp" }
  },
  "duration_ms": 5,
  "hash": "sha256:xyz789uvw012...",
  "previousHash": "sha256:abc123def456..."
}
```

---

## Frequently Asked Questions

### Q: Is this a bypass?
**A:** No. All 4 gates still apply. Policy restricts to `observe.* ` commands only. No enforcement gate is weakened.

### Q: Can observer mode execute commands?
**A:** No. Observer adapter validates the proposal but refuses to execute mutations. It only returns an observation record.

### Q: What if I need to switch agents later?
**A:** Add a new requester to policy (e.g., `agent:mutation`) with appropriate `allowCommands` and `allowAdapters`. Old requester limited to observe.

### Q: Can I read the audit log from observer proposals?
**A:** Yes. Each observation creates an audit entry with full hash-chain proof. You can verify integrity with:
```bash
npm run audit:verify -- --audit data/audit.log.jsonl
```

### Q: How long should I run observer-only mode?
**A:** 1–2 weeks. Long enough to evaluate:
- Do observations matter?
- Is the audit trail useful?
- Would mutations help?

---

## Commands

```bash
# Generate observer proposal
node test/generate-observer-proposal.js

# Validate (all 4 gates)
npm run verify -- --in observer-proposal.json --keys-store config/keys.json

# Run (record observation, don't mutate)
npm run run -- --in observer-proposal.json --keys-store config/keys.json

# Verify audit log integrity
npm run audit:verify -- --audit data/audit.log.jsonl

# Check audit log (PowerShell)
Get-Content data/audit.log.jsonl | Select-Object -Last 1 | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

## Next Steps

1. **Day 1:** Run `node test/generate-observer-proposal.js`
2. **Day 2:** Run `npm run dryrun -- --in observer-proposal.json --keys-store config/keys.json`
3. **Day 3:** Run `npm run run -- --in observer-proposal.json --keys-store config/keys.json`
4. **Days 4–7:** Check audit log daily, note what's observed
5. **Day 8:** Decide: Keep observer mode? Add mutations? Keep exploring?

That's it. Risk-free. Governance-intact. Audit-proven.
