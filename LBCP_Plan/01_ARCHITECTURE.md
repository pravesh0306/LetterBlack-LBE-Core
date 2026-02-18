# 01 — Architecture (Controller Platform)

## Layer model
```
UI (Host-specific)  ── emits intents, shows phase/solve, renders editors
   |
Controller Core     ── validates, decides, routes, reports feedback (authoritative)
   |
Adapters            ── execute on target platform (CEP, Browser, Electron, etc.)
```

## Contracts (non-negotiable)
### UI contract
- UI never calls platform APIs directly.
- UI does not decide allow/block.
- UI always shows explicit feedback.

### Controller contract
- Controller never touches platform APIs directly.
- Controller is the only allow/block authority.
- Controller returns:
  - `phase`
  - `solve` (next step)
  - `blockedReason` when blocked

### Adapter contract
- Adapter is “dumb hands”.
- Adapter executes only after controller approval.
- Adapter returns explicit success/failure results.

### Agent contract
- Agents are advisory only.
- Agents can read controller state.
- Agents output **intents**, not actions.

## Capability model
Each environment advertises capabilities:
- `filesystem`
- `evalScript`
- `clipboard`
- `windowing`
- `imageCapture`
- `network`

Controller validates required capabilities before routing.
