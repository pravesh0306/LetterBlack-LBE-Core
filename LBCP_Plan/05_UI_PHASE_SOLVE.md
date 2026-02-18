# 05 — UI: Phase Badge + Solve Hints

## Goal
Users always know:
1) current system state (phase)
2) next required step (solve)

## UI components (minimal)
### Phase badge (always visible)
Example:
- `STATUS: WORKING`
- Color mapped to phase (Setup/Ready/Working/Assisted/Advanced/Blocked)

### Solve hint (visible only when blocked)
Example:
- `Next step: Select a layer`

Optional:
- Clicking solve hint opens the relevant UI (e.g., Settings tab)

## UX rules
- Never show raw error strings to users
- Always provide a solve hint for blocked actions
- Action buttons disabled when action cannot succeed
- Tooltips explain why disabled

## “No silent clicks” policy
Every click must yield:
- success feedback, or
- blocked feedback with solve, or
- failure feedback with next action
