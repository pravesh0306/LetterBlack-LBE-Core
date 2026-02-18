# 04 — Adapters (CEP + Browser + Future)

## Browser Adapter (preview-only)
Purpose:
- Prove safety: nothing executes
- Provide previews and clear blocks

Rules:
- Block any command requiring missing capability
- Explain why + provide solve step
- Never attempt filesystem or eval

## CEP Adapter
Purpose:
- Provide the “power host” through controlled execution

Must include:
- `safeEvalScript(script, timeoutMs)`
- `safeFSWrite(path, data, timeoutMs)`
- `revealInExplorer(path)` (optional)
- `openDockablePanel(code)` (if supported)

Non-negotiables:
- Timeouts on all bridge operations
- Environment gating (no CEP API calls outside CEP)
- No JSON.parse on error strings; always validate

## Future adapters
- Electron adapter: filesystem + windowing
- VS Code adapter: extension API + workspace ops
- Cloud adapter: proposal-only + audit logs
