# 14-Day Usage Freeze

**Effective:** 2026-02-20  
**Thaw Date:** 2026-03-05

---

## What Happens Now

For 14 days:

✅ **DO:**
- Use the 4 validation gates (schema, signature, nonce, policy)
- Run proposals through the pipeline
- Check the audit log
- Measure: Does it prevent bugs? Build trust?
- Write down what you learn

❌ **DON'T:**
- Touch any documentation (it's done)
- Add new features (they'll distract)
- Design roadmaps (data first)
- Create new adapters (proof of concept first)
- Optimize performance (you don't know what matters yet)
- Add "enterprise" features
- Extend policy model
- Build analytics

---

## The Only Goal

**Answer this:** 

> Does Sentinel reduce confusion and build trust in AI execution?

That's it.

---

## Files You Can Edit

```
test-proposal.json              → Generate fresh proposals
src/core/policyEngine.js        → ONLY if gate logic is broken (it shouldn't be)
config/policy.default.json      → ONLY to add new approved requesters
```

That's it.

---

## Files Are Locked

```
.github/copilot-instructions.md  → Agents read this. Don't change it.
MVP_READINESS.md                 → Status tracker. Don't change it.
TESTING_GUIDE.md                 → Real test procedures. Don't change it.
USAGE_EXAMPLE.md                 → Your 7-day test plan. Don't change it.
src/core/validator.js            → Trust boundary. Don't weaken it.
src/core/signature.js            → Exit guarantee. Don't modify it.
src/core/nonceStore.js           → Replay protection. Don't disable it.
src/core/auditLog.js             → Proof. Don't weaken it.
```

---

## After 14 Days

Come back with:

1. **ONE real story:** "Here's what Sentinel caught/prevented/clarified."
2. **ONE user complaint:** "This was confusing because..."
3. **ONE trust measurement:** "I went from X% to Y% confident in AI code."
4. **ONE simplification:** "We don't actually need X."

Then we'll know what to build next.

---

## If Tempted to Design

Stop.

Ask yourself:

> "Does someone need this in the next 2 hours?"

If no → Write it down for March. Don't build it now.

The best features are discovered, not designed.

---

## Checkpoint: March 5, 2026

**Meeting Questions:**

- ✅ Did Sentinel prevent a bug?
- ✅ Did Sentinel reduce confusion?
- ✅ Did Sentinel build trust?
- ✅ What would you simplify?
- ✅ What would you keep forever?
- ✅ What did you never use?

**If all yes:** Unlock design phase.  
**If any no:** Fix it first.

---

That's it. Use it. Learn from it. Come back March 5.
