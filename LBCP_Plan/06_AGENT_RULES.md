# 06 — Agents (Advisory-Only)

## Role of Browser Agent
The Browser Agent is a **thinking agent**, not an acting agent:
- Reads controller state (phase/solve)
- Generates proposals (intents + code)
- Explains why something is blocked
- Previews results

Forbidden:
- No filesystem writes
- No evalScript
- No platform API calls
- No changing flags or state directly

## Agent output format
Agents output *intents* only, e.g.:
```json
{
  "id": "SUGGEST_RUN_SCRIPT",
  "payload": {
    "code": "...",
    "notes": "This requires CEP to execute"
  }
}
```

## Governance rule
> Agents propose. Controller decides. Adapters execute.

## Practical: agent-assisted debugging
When blocked, controller returns `solve`. Agent then:
- translates solve into steps
- offers a fix or next action
- never executes the fix directly
