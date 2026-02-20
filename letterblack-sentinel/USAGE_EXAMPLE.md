# Real Usage Example: AI Generates JSX for After Effects

**What:** AI writes a JSX script. You want to run it in AE safely.  
**Why:** You don't trust random AI JSX. You want an audit trail. You want to see what actually ran.  
**How:** Sentinel validates it. You approve. AE executes. Audit log proves it.

---

## The Flow (7-Day Real Test)

### Option A: Mutation Mode (AI executes JSX)

See below.

### Option B: Observer-Only Mode (AI reports issues)

**Start here if cautious:** AI only reports irregularities, never executes.

```bash
# Generate observer proposal
node test/generate-observer-proposal.js

# Verify it (all 4 gates apply)
npm run verify -- --in observer-proposal.json --keys-store config/keys.json

# Run it (audit-only, no mutations)
npm run run -- --in observer-proposal.json --keys-store config/keys.json

# Check audit log
Get-Content data/audit.log.jsonl | Select-Object -Last 1 | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**What This Gives You:**
- ✅ Sentinel governance (all 4 gates)
- ✅ Tamper-evident observation record
- ✅ Signed AI report
- ✅ Zero mutation risk
- ✅ Real audit trail

**After 1–2 weeks:** If observations are valuable, add selective mutations.

---

### Option A: Mutation Mode (AI executes JSX)

### Day 1: Setup (15 min)

```bash
cd d:\Developement\Core_Control\letterblack-sentinel
npm install
npm run init
npm run health
```

**Check:** All green.

---

### Day 2: AI Writes JSX

**Scenario:** You ask Claude: "Write JSX to select all layers in a comp"

Claude writes:
```javascript
// Generate a proposal for "Select all layers"
{
  "id": "SELECT_LAYERS",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "requesterId": "agent:gpt-v1-2026Q1",
  "sessionId": "session:ae-design-2026-02-20",
  "timestamp": 1739991600,
  "nonce": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "requires": ["jsx:execute"],
  "risk": "LOW",
  "payload": {
    "adapter": "noop",  // Start with noop (safe simulation)
    "script": "app.project.activeItem.selectedLayers = app.project.activeItem.layers;",
    "env": "aftereffects"
  }
}
```

(Or use `node test/generate-proposal.js` to get a real signed version.)

---

### Day 3-5: Validate Before Execution

**You don't run it blindly.** You validate first:

```bash
npm run verify -- --in proposal.json --keys-store config/keys.json
```

Output:
```json
{
  "status": "valid",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "checks": {
    "schema": true,
    "signature": true,
    "nonce": true,
    "policy": true
  },
  "risk": "LOW"
}
```

**Decision Point:** 
- ✅ All gates pass → You trust it
- ❌ Any gate fails → Reject it (no execution)

---

### Day 6: Dry-Run (Simulate Safely)

Before real execution, simulate:

```bash
npm run dryrun -- --in proposal.json --keys-store config/keys.json
```

Output:
```json
{
  "validation": { "status": "valid", ... },
  "execution": {
    "adapter": "noop",
    "status": "simulated",
    "message": "Dry-run complete (no actual execution)"
  }
}
```

**What This Tells You:**
- Sentinel accepts the proposal
- Adapter validated it
- It would run (but didn't)

---

### Day 7: Real Execution

When you're confident:

```bash
npm run run -- --in proposal.json --keys-store config/keys.json
```

Output:
```json
{
  "validation": { "status": "valid", ... },
  "execution": {
    "adapter": "noop",
    "commandId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "timestamp": "2026-02-20T06:00:00.000Z"
  },
  "receipt": { ... }
}
```

**Audit Log** (`data/audit.log.jsonl`), last line:
```json
{
  "timestamp": "2026-02-20T06:00:00.000Z",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "requesterId": "agent:gpt-v1-2026Q1",
  "decision": "ALLOW",
  "adapter": "noop",
  "status": "completed",
  "duration_ms": 45,
  "hash": "sha256:xyz789...",
  "previousHash": "sha256:abc123..."
}
```

**What This Proves:**
- Proposal ran
- It was validated (all 4 gates)
- Exact timestamp recorded
- Hash chain unbroken (tamper-evident)

---

## Measure It (7-Day Questions)

After 7 days of real usage, ask yourself:

### ✅ Did this prevent a bug?
- Did Sentinel reject an invalid JSX script before it broke AE?
- Did you catch a signature mismatch?
- If yes → It's working.
- If no → Did you even test bad proposals?

### ✅ Did this reduce confusion?
- Can you tell what ran and when?
- Does the audit log answer "who did what?"
- Did you use `verify` before executing?
- If yes → Design is working.
- If no → Audit log too noisy? Fix it.

### ✅ Did this make logs clearer?
- Can you spot replays (REPLAY_DETECTED)?
- Can you spot tampering (SIGNATURE_INVALID)?
- Can you spot policy denials (POLICY_DENIED)?
- If yes → Error messages work.
- If no → Which message confused you?

### ✅ Did this make you trust AI more?
- Would you run AI-generated JSX without Sentinel? (If "no" → it's working)
- After seeing the audit log, did you feel more confident?
- If yes → You found the value.
- If no → What's missing?

---

## What Stays, What Simplifies

After 7 days, you'll know:

| Pattern | Keep If | Simplify If |
|---------|---------|-------------|
| Nonce checking | Caught a replay | Never saw one |
| Signature validation | Caught tampering | Always run fresh proposals |
| Policy enforcement | Rejected something | Policy always allows your agents |
| Audit log | You looked at it | You never checked |
| Error codes | They told you what failed | You ignored error output |

**Decision rule:** If you didn't use it in 7 days, it probably doesn't belong yet.

---

## Do NOT Do

- ❌ Bypass gates to "test faster"
- ❌ Skip `verify` and go straight to `run`
- ❌ Ignore REPLAY_DETECTED (it means something)
- ❌ Edit proposals by hand (use generate-proposal.js)
- ❌ Run the audit log through a script (keep it append-only)

---

## Come Back When

After 7 days, ask:

1. "Did I find a security bug that Sentinel caught?"
2. "Did I trust AI JSX more because of the audit trail?"
3. "Did I ever wish I could skip validation?"
4. "What error message confused me?"
5. "What would make this faster without weakening gates?"

**Honest answers** → Next phase of design.

---

## Files You'll Touch

```
config/keys.json              → Read (trusted key registry)
config/policy.default.json    → Read (allowed requesters/adapters)
data/nonce.db.json            → Auto-managed (don't edit)
data/audit.log.jsonl          → Read-only (proof)
proposal.json                 → You write it (or generate-proposal.js)
test-proposal.json            → Generate via generate-proposal.js
```

---

## Commands You'll Use (Memorize These)

```bash
npm run health                # Check if ready
node test/generate-proposal.js  # Fresh signed proposal
npm run verify -- --in proposal.json   # Validate, don't run
npm run dryrun -- --in proposal.json   # Simulate, don't execute
npm run run -- --in proposal.json      # Real execution + audit
npm run audit:verify -- --audit data/audit.log.jsonl  # Prove audit log is unbroken
```

---

## That's It

No architecture.
No enterprise narrative.
No roadmap.

Just:

1. Generate proposal
2. Validate it
3. Run it
4. Check the audit log
5. Repeat for 7 days
6. Tell me what you learned

When you come back with real usage data, we'll know what to build next.
