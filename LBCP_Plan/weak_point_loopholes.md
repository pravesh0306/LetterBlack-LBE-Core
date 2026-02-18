# Weak Points / Loopholes (Quick List)

- **No command authenticity** (no requester identity, signature, nonce)
- **Agents propose only** is policy, not enforced in code
- **Capability model underspecified** → environment mismatch risk
- **No immutable audit log** of decisions/execution
- **UI can spam intents** → DoS / noisy behavior
- **Error schema undefined** → inconsistent failures
- **Secrets handling not defined** → leakage risk
- **Rollback is manual** → wrong tag/partial rollback
- **Sandbox limits missing** (filesystem/network/time/memory)
- **Threat model missing** (spoofing, replay, exfiltration, prompt injection)
