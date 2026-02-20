# Your 14-Day Checkpoint

## What's Complete ✅

```
✅ 4-layer validation (schema → sig → nonce → policy)
✅ Ed25519 cryptographic signing
✅ Nonce replay protection
✅ Deny-by-default policy enforcement
✅ Immutable audit logging (hash-chained)
✅ Proposal generation (test/generate-proposal.js)
✅ Dry-run mode (validate without side effects)
✅ Deterministic exit codes + JSON output
✅ Docker-ready (minimal, non-root)
✅ CLI commands (health, verify, dryrun, run, audit:verify)
✅ Full documentation for agents (.github/copilot-instructions.md)
✅ Test procedures (TESTING_GUIDE.md)
✅ Implementation status (MVP_READINESS.md)
✅ Real usage example (USAGE_EXAMPLE.md)
```

---

## What You Do Now (Next 14 Days)

### Step 1: Setup (15 min)
```bash
cd letterblack-sentinel
npm install
npm run init
npm run health
```

### Step 2: One Real Scenario
Use Sentinel for ONE concrete thing:
- **Option A (Cautious):** AI reports irregularities via observer-only mode (no mutations)
- **Option B (Full Test):** AI generates After Effects JSX, you validate it with Sentinel

Pick the one that matches your risk tolerance.

### Step 3: Measure
After 14 days, answer:
1. Did Sentinel catch something dangerous?
2. Did Sentinel reduce your confusion?
3. Did Sentinel make you trust AI more?
4. What would you simplify?

---

## What NOT to Do (14-Day Freeze)

❌ Don't add features  
❌ Don't optimize  
❌ Don't design adapters  
❌ Don't extend documentation  
❌ Don't touch validation gates  
❌ Don't weaken security  

**See:** [14DAY_FREEZE.md](14DAY_FREEZE.md)

---

## Your Files

**To Read (Getting Started):**
- [README.md](README.md) — Pick your path (Use / Test / Learn status / Architecture)
- [USAGE_EXAMPLE.md](USAGE_EXAMPLE.md) — 7-day walkthrough with real example
- [MVP_READINESS.md](MVP_READINESS.md) — What's built, what's parked, test runbook

**To Reference (During Testing):**
- [TESTING_GUIDE.md](TESTING_GUIDE.md) — Test procedures
- [14DAY_FREEZE.md](14DAY_FREEZE.md) — What stays locked

**For Agents:**
- [../.github/copilot-instructions.md](../.github/copilot-instructions.md) — Detailed technical guide

---

## Commands to Memorize

```bash
npm run init                           # One-time setup
npm run health                         # Verify system ready
node test/generate-proposal.js         # Fresh signed proposal
npm run verify -- --in test-proposal.json   # Validate (don't run)
npm run dryrun -- --in test-proposal.json   # Simulate (don't execute)
npm run run -- --in test-proposal.json      # Real execution + audit
npm run audit:verify -- --audit data/audit.log.jsonl  # Verify log integrity
```

---

## The Real Test

Success looks like:

1. **You use Sentinel daily** (even if just to validate proposals)
2. **You look at the audit log** at least once
3. **You ask:** "What would it look like if this proposal was malicious?"
4. **You compare:** Trust with Sentinel vs. without
5. **You answer:** "This reduced my confusion / built my trust / caught a bug"

**This is the data that matters.**

---

## March 5 Checkpoint

Come back with:
- ✅ One thing Sentinel prevented/clarified
- ✅ One thing you'd simplify
- ✅ One measurable change in trust
- ✅ Real usage stories (not guesses)

Then we design Phase 2.

---

## Don't Overthink It

You've built the right kernel:
- Schema validation
- Cryptographic signing
- Nonce replay protection
- Policy gates
- Audit proof

**It works.**

Now use it until it tells you what you need next.

(It will.)

---

**Start:** Pick an action from USAGE_EXAMPLE.md and do it today.

**Stop:** Don't design until March 5.

**Learn:** Everything you need is in the audit log.
