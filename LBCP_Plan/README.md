# LetterBlack Controller Platform (LBCP) — End-to-End Plan

**Generated:** 2026-02-10

This pack contains a complete, phase-gated plan to build the **LetterBlack Controller Platform** from zero to a distributable system:
- One **Controller Core** (authority)
- Multiple **Adapters** (CEP / Browser / Electron-ready)
- UI that exposes **Phase + Solve** status
- Agents that are **advisory only**
- Repeatable testing, rollback, and release processes

## Folder contents
- `00_OVERVIEW.md` — What you’re building, in business + technical terms
- `01_ARCHITECTURE.md` — Layered architecture & contracts
- `02_PHASES.md` — Phases from zero → ship, with gates
- `03_CONTROLLER_CORE.md` — Command schema, validation, phase/solve resolver
- `04_ADAPTERS.md` — CEP adapter rules + Browser adapter rules
- `05_UI_PHASE_SOLVE.md` — UX spec for Phase badge + Solve hints
- `06_AGENT_RULES.md` — Agent permissions & how Browser Agent is used
- `07_TESTING_CHECKLISTS.md` — Post-rollback + pre-release checklists
- `08_ROLLBACK_PLAYBOOK.md` — Rollback per phase
- `09_RELEASE_DISTRIBUTION.md` — Packaging & distribution gates
- `10_TASK_BOARD.md` — Work breakdown structure (WBS) + sequencing

## How to use
1. Start with `00_OVERVIEW.md`
2. Build in order using `02_PHASES.md`
3. Use `07_TESTING_CHECKLISTS.md` to decide GO/NO-GO at each phase
