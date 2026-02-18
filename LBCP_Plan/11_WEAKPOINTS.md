# 11 — Loopholes & Weak Points (Audit Notes)

This file documents risks and gaps in the current plan and suggests hardening actions. Use it alongside the phase checklist.

## 1) Command authenticity (missing)
**Issue:** Command schema has no requester identity, signature, or nonce.
**Risk:** Commands can be spoofed by any caller that can reach the controller.
**Fix:** Add `requesterId`, `sessionId`, `nonce`, and `signature` (HMAC/Ed25519). Reject unsigned or replayed commands.

## 2) “Agents propose” is policy, not enforced
**Issue:** The rule is stated, but no technical enforcement is described.
**Risk:** Agent code could still reach adapters directly if exposed.
**Fix:** Adapters must only accept commands from Controller Core (private channel). UI/Agent must never hold adapter handles.

## 3) Capability model is underspecified
**Issue:** Capability names exist, but strict mapping/validation is not defined.
**Risk:** False positives allow unsafe execution in wrong environments.
**Fix:** Define explicit allowlists per adapter + capability verification tests at boot. Enforce schema validation on all commands.

## 4) No audit trail / immutable logs
**Issue:** No append-only log for decisions and executions.
**Risk:** Hard to debug, detect abuse, or prove what ran.
**Fix:** Append-only log with `commandId`, `requesterId`, `decision`, `adapter`, `result`, `timestamp`.

## 5) UI can still spam intents
**Issue:** UI is “non-executing” but can still generate intents in bulk.
**Risk:** DoS or noisy behavior.
**Fix:** Rate-limit intents, validate payloads, and require user confirmation for sensitive actions.

## 6) Error schema not defined
**Issue:** “No JSON.parse on error strings” is noted, but error structure is undefined.
**Risk:** Inconsistent error handling and silent failures.
**Fix:** Define a standard error schema and surface it through a single feedback broker.

## 7) Secrets/config storage not defined
**Issue:** Notes mention API keys, but no storage/handling rules.
**Risk:** Keys leak into logs or UI.
**Fix:** Define a secure storage layer with redaction in logs and UI.

## 8) Rollback discipline is manual
**Issue:** Rollback policy is present but not automated.
**Risk:** Partial rollbacks or incorrect tags during incidents.
**Fix:** Scripted rollback + enforced tagging strategy.

## 9) No “safe execution” sandbox rules
**Issue:** Controlled coding environment needs explicit sandbox limits.
**Risk:** Unbounded file/network access.
**Fix:** Define policy for filesystem paths, network access, timeouts, and memory limits per adapter.

## 10) Incomplete threat model
**Issue:** No explicit list of attack vectors or misuse cases.
**Risk:** Blind spots in design.
**Fix:** Add a short threat model: spoofed commands, replay, privilege escalation, data exfiltration, prompt injection.

---

## Optional Enhancements
- **Two-person approval** for destructive actions.
- **Dry-run mode** for all commands.
- **Capability negotiation** with explicit user prompt when new permissions are requested.
- **Telemetry for anomalous patterns** (e.g., burst command requests).
