# 03 — Controller Core (Authority)

## Command schema
A command is the only unit that can be routed to execution.

```json
{
  "id": "RUN_SCRIPT",
  "requires": ["evalScript"],
  "payload": {
    "code": "..."
  },
  "meta": {
    "source": "ui|agent",
    "timestamp": 0
  }
}
```

## Validator
- Validates environment
- Validates required capabilities
- Validates preconditions (optional)
- Returns allow/block with solve name

### Example validation result
```json
{
  "allowed": false,
  "phase": "WORKING",
  "solve": "Select a layer",
  "blockedReason": "NO_LAYER_SELECTED"
}
```

## Phase resolver (derived, never manual)
Suggested user-facing phases:
- SETUP
- READY
- WORKING
- ASSISTED
- ADVANCED
- BLOCKED

### Inputs
- envReady
- blockers[]
- aiEnabled
- advancedFlags
- userHasInteracted

## Solve registry (human-readable next step)
Examples:
- Open inside After Effects
- Select a layer
- Open a composition
- Verify API key
- Enable Advanced Features
- Switch to Script Editor

## Feedback broker (no silent failures)
- `toast.success/info/warn/error`
- Console log in dev mode
- Optional: status bar indicator
