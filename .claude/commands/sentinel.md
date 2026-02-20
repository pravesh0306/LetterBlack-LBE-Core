# LetterBlack Sentinel Skill

You are helping the user work with **LetterBlack Sentinel** — a cryptographically-secured AI governance engine located in `letterblack-sentinel/` within this workspace.

## Architecture Recap

- **Agents propose → Controller validates → Adapters execute**
- 4-layer validation pipeline (strict order): Schema → Signature → Nonce → Policy
- All core state uses atomic writes (`src/core/atomicWrite.js`)
- Deny-by-default policy model
- Ed25519 signatures via TweetNaCl.js + RFC 8785 canonicalization
- Immutable hash-chain audit log (JSONL)

All commands run from inside the `letterblack-sentinel/` directory unless otherwise noted.

---

## Step 1 — Understand the user's intent

Read the user's message and determine which workflow they need:

| Keyword(s) in request | Workflow |
|---|---|
| propose, proposal, create, sign, new command | **Proposal Pipeline** |
| verify, validate, check proposal | **Proposal Verification** |
| run, execute, submit | **Proposal Execution** |
| health, ready, deployment | **Health & Integrity** |
| integrity, manifest | **Integrity Check** |
| policy, rules, allow, deny, requester | **Policy Management** |
| audit, log, hash-chain, history | **Audit Log Operations** |
| init, initialize, setup | **Initialization** |

If the intent is ambiguous, ask the user one focused clarifying question before proceeding.

---

## Workflow: Initialization

Run once to bootstrap keys, config, and data directories:

```bash
cd letterblack-sentinel
npm run init
```

This creates:
- `keys/secret.key` and `keys/public.key` (Ed25519 keypair)
- `data/nonce.db.json`, `data/audit.log.jsonl`, `data/rate-limit.db.json`
- `config/policy.default.json` (deny-by-default template)

**Critical:** `keys/secret.key` is gitignored and must never be committed.

---

## Workflow: Proposal Pipeline

### 1. Generate a test proposal with valid signature

```bash
cd letterblack-sentinel
node test/generate-proposal.js > proposal.json
cat proposal.json
```

### 2. Inspect the proposal structure

A valid proposal contains:
```json
{
  "v": 1,
  "requesterId": "agent:gpt",
  "nonce": "<unique UUID>",
  "issuedAt": "<ISO timestamp>",
  "command": { "adapter": "noop", "action": "echo", "args": {} },
  "signature": "<base64 Ed25519 signature>"
}
```

### 3. Verify (no execution)

```bash
npm run verify -- --in proposal.json --keys-store config/keys.json
```

Expected success output: `{ "ok": true, "validated": true }`

### 4. Dry-run (simulate with noop adapter)

```bash
npm run dryrun -- --in proposal.json --keys-store config/keys.json
```

### 5. Execute (full pipeline + adapter execution)

```bash
npm run run -- --in proposal.json --keys-store config/keys.json
```

### Troubleshooting proposals

| Error | Cause | Fix |
|---|---|---|
| `SCHEMA_INVALID` | Missing required field | Add `v`, `requesterId`, `nonce`, `issuedAt`, `command`, `signature` |
| `SIGNATURE_INVALID` | Wrong key or corrupted payload | Re-sign with `test/generate-proposal.js` |
| `REPLAY_DETECTED` | Nonce already used | Generate new nonce (UUID v4) |
| `POLICY_DENIED` | Requester/command not allowed | Update policy allowlists |
| `KEY_EXPIRED` | Key lifecycle violation | Rotate key in `config/keys.json` |

---

## Workflow: Health & Integrity Checks

### Health check (deployment readiness)

```bash
cd letterblack-sentinel
npm run health
# Or with JSON output:
node bin/lbe.js health --json true
```

Checks: key existence, policy file presence, data directory writability, policy signature validity.

### Generate integrity manifest

Run after any intentional change to core files:

```bash
npm run integrity:generate
```

This writes a cryptographic manifest of all `src/core/` files.

### Verify integrity against manifest

```bash
npm run integrity:check
```

Fails if any core file has been tampered with since the last `integrity:generate`.

---

## Workflow: Policy Management

### View current policy

```bash
cat letterblack-sentinel/config/policy.default.json
```

### Policy structure

```json
{
  "version": 1,
  "requesters": {
    "agent:gpt": {
      "allowCommands": ["echo"],
      "allowAdapters": ["noop", "shell"],
      "filesystem": {
        "roots": ["/safe/path"],
        "denyPatterns": ["*.key", "*.env"]
      }
    }
  },
  "adapters": {
    "shell": { "timeoutMs": 30000 }
  }
}
```

### Adding a new requester

1. Edit `config/policy.default.json` — add entry under `requesters`
2. Set `allowCommands` and `allowAdapters` arrays (deny-by-default)
3. Set `filesystem.roots` to constrain path access
4. Re-sign the policy:

```bash
cd letterblack-sentinel
npm run policy:sign -- --config config/policy.default.json --policy-sig config/policy.sig.json
```

5. Verify the policy loads correctly:

```bash
npm run health
```

### Policy anti-rollback

`version` in `policy.default.json` must be monotonically increasing. Never decrease it — the `policyVersionGuard` will reject older versions.

---

## Workflow: Audit Log Operations

### View recent audit entries

```bash
tail -20 letterblack-sentinel/data/audit.log.jsonl | node -e "
const rl = require('readline').createInterface({ input: process.stdin });
rl.on('line', l => { try { console.log(JSON.stringify(JSON.parse(l), null, 2)); } catch {} });
"
```

### Verify hash-chain integrity

```bash
cd letterblack-sentinel
npm run audit:verify -- --audit data/audit.log.jsonl
```

Expected: `{ "ok": true, "entries": N, "chainValid": true }`

If the chain is broken, it means an entry was tampered with or deleted. The audit log is append-only — never edit it manually.

### Audit entry structure

Each entry contains:
- `timestamp` — ISO timestamp
- `requesterId` — who proposed
- `commandId` — unique command identifier
- `action` — what was executed
- `status` — `ok` or `error`
- `prevHash` — SHA-256 of previous entry (hash-chain link)
- `hash` — SHA-256 of this entry

---

## Running Tests

```bash
cd letterblack-sentinel
npm test
```

Uses Node.js built-in `node:test`. Tests create isolated sandboxes via `fs.mkdtempSync()` and clean up after themselves.

### Lint

```bash
npm run lint
```

---

## Key Invariants (Never Violate)

1. All 4 validation gates must pass in order — no bypasses, no phase-based exceptions
2. State files (`nonce.db.json`, `rate-limit.db.json`, `policy.state.json`) must use `atomicWriteFileSync()` — never `fs.writeFileSync` directly
3. Sentinel core (`src/core/`) must remain stateless, phase-agnostic, and deterministic
4. `keys/secret.key` must never be committed — always verify `.gitignore`
5. Policy signature verification must always run in production — `--policy-unsigned-ok` is dev/test only
6. Adapters are "dumb hands" — they execute, they never validate or decide

---

## File Quick Reference

| Path | Purpose |
|---|---|
| `letterblack-sentinel/bin/lbe.js` | CLI entrypoint |
| `letterblack-sentinel/src/core/validator.js` | Main validation orchestrator |
| `letterblack-sentinel/src/core/policyEngine.js` | Deny-by-default policy evaluation |
| `letterblack-sentinel/src/core/auditLog.js` | Immutable hash-chain logger |
| `letterblack-sentinel/src/core/signature.js` | Ed25519 sign/verify |
| `letterblack-sentinel/src/core/nonceStore.js` | Replay protection |
| `letterblack-sentinel/src/adapters/` | Platform-specific executors |
| `letterblack-sentinel/config/policy.default.json` | Governance rules |
| `letterblack-sentinel/config/keys.json` | Trusted key registry |
| `letterblack-sentinel/data/audit.log.jsonl` | Immutable audit trail |
| `letterblack-sentinel/test/generate-proposal.js` | Test proposal generator |
| `.github/copilot-instructions.md` | Constitutional framework |
