# 08 — Rollback Playbook (Per Phase)

## Principle
Rollback restores the **last green tag**, not partial fixes.

## Tags
- `v1-stable`
- `phase-1-green`
- `phase-2-green`
- `phase-3-green`
- `phase-4-green`
- `phase-5-green`

## Phase rollback triggers
- Freeze on open → rollback to Phase 1 green
- Duplicate actions / performance decay → rollback to Phase 2 green
- UI lag / flicker / CSS regressions → rollback to Phase 3 green
- Crash / heavy feature hangs → disable flags or rollback to Phase 4 green

## After rollback
Run `07_TESTING_CHECKLISTS.md` section A only.
