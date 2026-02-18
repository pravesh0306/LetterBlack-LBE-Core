# 02 — Phases (Zero → End)

Each phase has:
- **Scope**
- **Implementation**
- **Tests**
- **Gate** (GO/NO-GO)

---

## Phase 1 — Controller Core (No Platform Dependencies)
### Scope
- Environment detection
- Capability matrix
- Command schema
- Validator
- Feedback broker
- Phase resolver + Solve resolver

### GO gate
- Commands validate correctly
- Phase/solve derived correctly
- No platform APIs used

---

## Phase 2 — Browser Host (Safe Proof)
### Scope
- Browser adapter: block + explain
- Minimal UI: phase badge + solve hint
- Command debug view (optional)

### GO gate
- No command that requires CEP can execute in browser
- All blocks show solve steps
- No silent failures

---

## Phase 3 — CEP Adapter (Power Host)
### Scope
- CEP adapter for:
  - evalScript
  - filesystem (save/reveal)
  - windowing (dock/panel)
- Hard environment gating
- Timeout wrappers

### GO gate
- Panel opens reliably
- No freeze paths
- Script run routing works (window vs property vs script)
- Ctrl+S scoped to editor only

---

## Phase 4 — Product Stability (Release-Ready Working Tier)
### Scope
- Script editor typography unification (typing = output)
- Smart run resolver + action gating
- Toast system as sole status channel
- Provider readiness matrix (Saved ≠ Verified)

### GO gate
- 30+ chat messages stable
- No duplicate actions/listeners
- CPU idle when idle
- Clear feedback everywhere

---

## Phase 5 — Advanced (Flagged Optional)
### Scope
- Screenshot capture (timeout + chunking)
- Vision payload builder + Gemini image parsing
- Floating mascot (expression only; no system notifications)
- User Notebook (client/project knowledge system)

### GO gate
- Advanced features OFF = zero impact
- Advanced features ON = no freezes, clear feedback
- Notebook persists and injects structured summaries only

---

## Phase 6 — Distribution & Rollback Discipline
### Scope
- Packaging
- Versioning
- Release notes
- Rollback tags

### GO gate
- Release checklist 100% green
- Reproducible install instructions
