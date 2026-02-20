# LetterBlack Sentinel

**Contract-Driven AI Execution Pipeline v0.1.0**

A cryptographically-secured governance engine that enforces the principle: **Agents Propose → Controller Decides → Adapters Execute**.

---

## Start Here

**First time?** → [START_HERE.md](START_HERE.md) — Your 14-day checkpoint (5 min read)

**Want zero-risk testing?** → [OBSERVER_MODE.md](OBSERVER_MODE.md) — AI reports issues, never executes (perfect for week 1)

Then pick one:

- **🚀 I want to USE it** → [USAGE_EXAMPLE.md](USAGE_EXAMPLE.md) — Real 7-day test with AI-generated JSX
- **📋 I want to TEST it** → [TESTING_GUIDE.md](TESTING_GUIDE.md) — Step-by-step test procedures
- **✅ I want to know what's done** → [MVP_READINESS.md](MVP_READINESS.md) — Implemented vs. Parked status
- **🏗️ I want architecture** → [../LBCP_Plan/01_ARCHITECTURE.md](../LBCP_Plan/01_ARCHITECTURE.md) — Layer contracts & design

---

## Overview

LetterBlack Sentinel is a command-line governance tool for safely executing AI-generated proposals. It implements a 4-layer architecture that ensures every command is:

1. **Structurally valid** (schema validation)
2. **Authentically signed** (Ed25519 signature verification)
3. **Non-replayed** (nonce-based replay protection)
4. **Policy-compliant** (governance rule enforcement)

Only after passing all four gates does execution proceed.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Agent Layer (Untrusted)                                │
│ LLM/AI generates JSON proposals                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: LetterBlack Controller (Authority)                     │
│ 4-Stage Validation Gate:                                        │
│   1. Schema Validation      (structural correctness)            │
│   2. Signature Verification (authentic proposal)                │
│   3. Nonce Checking        (no replay attacks)                  │
│   4. Policy Evaluation     (governance rules)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Secure Adapters (Constrained Execution)                │
│ - noopAdapter: Test/dry-run (no-op execution)                  │
│ - shellAdapter: Shell commands with allowlists & timeouts       │
│ - cepAdapter: Adobe CEP extension communication (future)        │
│ - blenderAdapter: Blender scripting (future)                   │
│ - nukeAdapter: Nuke scripting (future)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Immutable Audit Ledger                                 │
│ Hash-chain append-only log for compliance & investigation       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Installation

```bash
npm install
```

### Initialize Environment

```bash
node bin/lbe.js init
```

This creates:
- `config/keys.json` - Trusted multi-key registry (preferred in production)
- `keys/secret.key` - Ed25519 secret key (keep secure!)
- `config/policy.default.json` - Deny-by-default governance policy
- `config/policy.sig.json` - Signed envelope for policy integrity preflight
- `data/nonce.db.json` - Nonce replay protection store
- `data/audit.log.jsonl` - Immutable execution audit trail
- `data/rate-limit.db.json` - Requester rate limiter state
- `data/policy.state.json` - Monotonic policy version state

### Verify a Proposal (Validate Only)

```bash
node bin/lbe.js verify --in proposal.json --keys-store config/keys.json
```

Output:
```json
{
  "status": "valid",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "checks": {
    "schema": true,
    "keyId": true,
    "timestamp": true,
    "signature": true,
    "nonce": true,
    "policy": true
  },
  "risk": "LOW"
}
```

### Dry-Run (Validate + Simulate)

```bash
node bin/lbe.js dryrun --in proposal.json --keys-store config/keys.json
```

Simulates execution using the `noop` adapter (no changes occur).

### Run (Validate + Execute)

```bash
node bin/lbe.js run --in proposal.json --keys-store config/keys.json
```

Executes the command with actual adapter (shell, etc.) after passing all validation gates.

### Sign Policy After Edits

```bash
node bin/lbe.js policy-sign --config config/policy.default.json --policy-sig config/policy.sig.json
```

Use this whenever policy metadata or rules change.

### Verify Audit Integrity

```bash
node bin/lbe.js audit-verify --audit data/audit.log.jsonl
```

Verifies append-only hash-chain integrity and returns structured JSON (`valid`, `firstInvalidIndex`, `reason`).

### Runtime Health Check

```bash
node bin/lbe.js health --json true
```

Checks required config/data files and write readiness for deployment.

---

## Command Specification

### Proposal JSON Format

A LetterBlack proposal is a signed JSON object with this structure:

```json
{
  "id": "RUN_SHELL",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "requesterId": "agent:gpt",
  "sessionId": "session:abc123",
  "timestamp": 1771287440,
  "nonce": "bf5ce1dcf5f77355625f62b0e12f6c7ebe00dac33b507a734e050749f6d5b91d",
  "requires": ["shell:execute"],
  "risk": "LOW",
  "payload": {
    "adapter": "noop",
    "cmd": "echo",
    "args": ["hello", "world"],
    "cwd": "/project"
  },
  "signature": {
    "alg": "ed25519",
    "keyId": "default",
    "sig": "ws1A6C6q2ZIugNQTXwqle8KW0q9tb9dtK0tbGVD/KbmeqYMO0ytu0s9IkypP6XisnbUEFsk/+BVhT5tovQrpCA=="
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Command identifier (uppercase, 1-50 chars) |
| `commandId` | string | Yes | Unique UUID for this proposal |
| `requesterId` | string | Yes | Identity of the agent/requester (e.g., "agent:gpt") |
| `sessionId` | string | Yes | Session group for replay protection |
| `timestamp` | number | Yes | Unix epoch seconds (future within 30 mins) |
| `nonce` | string | Yes | Random string (32-128 chars, used once per session) |
| `requires` | array | Yes | Capabilities required (e.g., ["shell:execute"]) |
| `risk` | string | Yes | Risk level: LOW, MEDIUM, HIGH, CRITICAL |
| `payload` | object | Yes | Adapter-specific execution payload |
| `signature` | object | Yes | Ed25519 detached signature |

### Signing a Proposal

1. Remove the `signature` field from the proposal
2. Canonicalize JSON (deterministic ordering + whitespace)
3. Sign with Ed25519 secret key
4. Base64-encode the signature
5. Add signature back to proposal

Example (Node.js):
```javascript
import { signEd25519 } from './src/core/signature.js';
import fs from 'fs';

const secretKeyB64 = fs.readFileSync('keys/secret.key', 'utf-8').trim();
const proposal = { /* ... fields ... */ };
const { signature, ...proposalForSigning } = proposal;

const signResult = signEd25519({
  payloadObj: proposalForSigning,
  secretKeyB64
});

proposal.signature.sig = signResult.signature;
```

---

## Validation Pipeline

### Preflight: Policy Signature Verification

Before any `verify`, `dryrun`, or `run`, the loaded policy is verified against `config/policy.sig.json` using trusted keys.
- Strict by default (signature required)
- Dev override: `--policy-unsigned-ok true`

**Exit code on failure: 8**

### Preflight: Policy Version Binding

Before any `verify`, `dryrun`, or `run`, policy metadata is validated:
- `policy.version` and `policy.createdAt` are mandatory
- Monotonic state is enforced via `data/policy.state.json`
- Version rollback is blocked (`POLICY_VERSION_REGRESSION`)
- createdAt regression is blocked (`POLICY_CREATED_AT_REGRESSION`)

**Exit code on failure: 8**

### Stage 1: Schema Validation

Checks that the proposal has all required fields with correct types:
- `id`: string, pattern `^[A-Z_]+$`, 1-50 chars
- `commandId`: string, 36-char UUID
- `requesterId`: string, 3-100 chars
- `nonce`: string, 32-128 chars
- `payload`: object with required `adapter` field
- `signature`: object with `alg`, `keyId`, `sig`

**Exit code on failure: 5**

### Stage 2: Signature Verification

Uses Ed25519 to verify the proposal was signed with the provided secret key:
- `signature.keyId` must be valid (rejects non-versioned IDs like `default`)
- Timestamp skew must be within policy limits (`security.maxClockSkewSec`)
- Payload is canonicalized (deterministic JSON)
- Signature is verified against public key
- Fails if signature is invalid or key doesn't match

**Exit code on failure: 3**

### Stage 3: Nonce Replay Protection

Prevents the same (requesterId, sessionId, nonce) tuple from being used twice:
- Nonces expire after 3600 seconds (1 hour) by default
- Expired nonces are automatically pruned
- Storage persists across restarts (`data/nonce.db.json`)

**Exit code on failure: 4**

### Stage 4: Policy Enforcement

Evaluates governance rules configured in `config/policy.default.json`:
- **Default**: DENY (fail-safe)
- **Per-requester rules** define:
  - Allowed adapters
  - Allowed commands
  - Filesystem roots (containment)
  - Command allowlists/denylists

Example policy:
```json
{
  "default": "DENY",
  "requesters": {
    "agent:gpt": {
      "allowAdapters": ["noop", "shell"],
      "allowCommands": ["RUN_SHELL"],
      "filesystem": {
        "roots": ["/projects/safe"],
        "denyPatterns": ["**/.git/**", "**/secrets/**"]
      },
      "exec": {
        "allowCmds": ["ls", "echo", "node"],
        "denyCmds": ["rm", "chmod", "curl"]
      }
    }
  }
}
```

**Exit code on failure: 2**

### Stage 5: Request Rate Limiting (Run Path)

`run` enforces per-requester limits from policy:
- Requester override: `requesters.<id>.rateLimit`
- Fallback: `security.defaultRateLimit`

**Exit code on failure: 7**

---

## Adapters

### NoOp Adapter

Test/dry-run adapter that simulates execution without making changes.

```bash
node bin/lbe.js dryrun --in proposal.json --keys-store config/keys.json
```

Output:
```json
{
  "adapter": "noop",
  "status": "completed",
  "output": "[NOOP] Would execute: RUN_SHELL on adapter: noop",
  "exitCode": 0
}
```

### Shell Adapter

Executes shell commands with policy constraints:
- Command allowlist enforcement
- Filesystem root containment
- 30-second timeout (configurable)
- 1MB max output (configurable)

Example payload:
```json
{
  "adapter": "shell",
  "cmd": "ls",
  "args": ["-la", "/projects/safe"],
  "cwd": "/projects/safe"
}
```

### Future Adapters

- **CEP Adapter**: Adobe CEP extension communication
- **Blender Adapter**: Blender scripting
- **Nuke Adapter**: Nuke compositing scripting

---

## Security Guarantees

### Cryptographic Signing

- **Algorithm**: Ed25519 (ECDSA, 256-bit)
- **Implementation**: TweetNaCl.js
- **Key Lifecycle**: `notBefore` / `expiresAt` enforced for trusted keys

### Governance Integrity

- **Policy Signature**: Signed policy envelope verified preflight
- **Policy Anti-Rollback**: Version/createdAt monotonic guard
- **Controller Integrity**: Optional strict manifest check (`--integrity-strict`)

### Replay Prevention

- **Method**: Nonce + sessionId + requesterId 3-tuple + TTL
- **Expiration**: Configurable TTL (default 3600s)
- **Storage**: JSON DB with auto-pruning

### Audit Trail

- **Format**: JSONL (one JSON object per line, append-only)
- **Integrity**: Hash-chain (each entry includes hash of previous)
- **Immutability**: File permissions prevent offline modification

### Execution Containment

- **Deny-by-Default**: Fail-safe (no unallowed commands execute)
- **Filesystem**: Root path enforcement prevents directory traversal
- **Resource**: Timeout + max output size limits prevent DoS
- **Environment**: No secretive env vars leaked in logs

---

## Exit Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| 0 | Success | N/A |
| 1 | Internal error | Check stderr |
| 2 | Policy rejection | Update policy config |
| 3 | Bad signature | Re-sign proposal |
| 4 | Nonce replay | Use new nonce |
| 5 | Schema error | Fix proposal structure |
| 6 | Timestamp skew exceeded | Re-sign with current timestamp |
| 7 | Rate limit exceeded | Retry after window |
| 8 | Governance integrity failure | Fix policy/integrity/audit preflight issue |
| 9 | Execution error | Debug adapter logs |

---

## Configuration

### policy.default.json

Governs what each requester can do:

```json
{
  "default": "DENY",
  "version": "1.0.0",
  "createdAt": "2026-02-18T00:00:00.000Z",
  "security": {
    "maxClockSkewSec": 600,
    "maxPolicyCreatedAtSkewSec": 31536000,
    "defaultRateLimit": {
      "windowSec": 60,
      "maxRequests": 30
    }
  },
  "requesters": {
    "REQUESTER_ID": {
      "allowAdapters": ["shell", "noop"],
      "allowCommands": ["RUN_SHELL"],
      "filesystem": {
        "roots": ["/safe/path1", "/safe/path2"],
        "denyPatterns": ["**/.git/**", "**/secrets/**"]
      },
      "exec": {
        "allowCmds": ["ls", "echo"],
        "denyCmds": ["rm", "chmod", "sudo"]
      }
    }
  }
}
```

### keys.json

Trusted key entries should define lifecycle metadata:
- `notBefore`
- `expiresAt`
- `requesterId` scope (recommended)

### .env (Future)

```env
NONCE_TTL=3600
SHELL_TIMEOUT=30
SHELL_MAX_OUTPUT=1048576
AUDIT_LOG_PATH=./data/audit.log.jsonl
NONCE_DB_PATH=./data/nonce.db.json
```

---

## Testing

### Generate Test Proposal

```bash
node test/generate-proposal.js
```

Creates `test-proposal.json` with valid signature using keys in `keys/`.

### Run All Commands

```bash
# Verify without executing
node bin/lbe.js verify --in test-proposal.json --keys-store config/keys.json

# Simulate execution
node bin/lbe.js dryrun --in test-proposal.json --keys-store config/keys.json

# Actually execute (with noop adapter, safe)
node bin/lbe.js run --in test-proposal.json --keys-store config/keys.json
```

---

## Integration Examples

### With GitHub Actions (CI/CD)

```yaml
- name: Verify AI proposal
  run: |
    node bin/lbe.js verify --in ai-proposal.json --keys-store config/keys.json
    echo "✅ Proposal is valid and policy-compliant"

- name: Execute if approved
  if: github.event.pull_request.approved == true
  run: |
    node bin/lbe.js run --in ai-proposal.json --keys-store config/keys.json
```

### With LLM Integration

```javascript
// LLM generates proposal
const proposal = {
  id: 'RUN_SHELL',
  commandId: generateUUID(),
  requesterId: 'agent:gpt4',
  sessionId: `session:${Date.now()}`,
  timestamp: Math.floor(Date.now() / 1000),
  nonce: crypto.randomBytes(32).toString('hex'),
  requires: ['shell:execute'],
  risk: 'MEDIUM',
  payload: { adapter: 'shell', cmd: 'echo', args: ['test'] },
  signature: { alg: 'ed25519', keyId: 'agent:gpt-v1-2026Q1', sig: '' }
};

// Sign with LLM's private key
const signed = signProposal(proposal, llmSecretKey);

// Send to Sentinel for verification & execution
const result = await fetch('https://sentinel.letterblack.io/run', {
  method: 'POST',
  body: JSON.stringify(signed)
});
```

---

## Deployment

### Docker (On-Prem)

```bash
docker build -t letterblack-sentinel:local .
docker run --rm --read-only --tmpfs /tmp \
  -v ${PWD}/config:/app/config:rw \
  -v ${PWD}/data:/app/data:rw \
  -v ${PWD}/keys:/app/keys:ro \
  letterblack-sentinel:local health --json true
```

Detailed operational guide: `docs/Deployment_Runbook.md`.

---

## Limitations & Future Work

### Current Limitations (v0.1.0)

- No external KMS/HSM integration yet
- Small nonce DB keeps all entries in memory
- Shell adapter only supports simple commands (no pipes)
- No web server interface (CLI-only)

### Planned Features

- [ ] Automated key rotation workflows
- [ ] Multiple requesters with different policies
- [ ] Policy hot-reloading without restart
- [ ] HTTP/REST API wrapper
- [ ] Blender, Nuke, CEP adapters
- [ ] Advanced audit analytics
- [ ] Compliance reporting (SOC2, ISO27001)
- [ ] Multi-signature proposals (approvals)
- [ ] Time-locked commands (execute-at)
- [ ] Conditional execution (if-then-else)

---

## Troubleshooting

### "Signature verification failed"

The proposal signature doesn't match the public key:
1. Ensure you're signing with the correct secret key
2. Ensure canonical JSON of the payload (no extra whitespace)
3. Re-generate keys with `npm run keygen`

### "Nonce has already been used"

The same (requesterId, sessionId, nonce) was submitted twice:
1. Generate a new nonce: `crypto.randomBytes(32).toString('hex')`
2. Recreate and re-sign the proposal
3. Submit with fresh nonce

### "POLICY_SIGNATURE_INVALID" or "POLICY_SIGNATURE_MISSING"

Policy integrity preflight failed:
1. Re-sign policy with `node bin/lbe.js policy-sign --config config/policy.default.json`
2. Confirm `config/policy.sig.json` exists
3. Ensure signer key exists in `config/keys.json`

### "POLICY_VERSION_REGRESSION" or "POLICY_CREATED_AT_REGRESSION"

Policy monotonicity guard blocked a rollback:
1. Increment `policy.version` for forward changes
2. Ensure `policy.createdAt` is newer than last accepted
3. Re-sign policy (`lbe policy-sign`) and retry

### "Adapter 'shell' not allowed"

Policy blocks it for this requester:
1. Check `config/policy.default.json`
2. Ensure `allowAdapters: ["shell"]` is in the requester's config
3. Or use `dryrun` with `noop` adapter if shell isn't required

### "Policy blocked: filesystem root not allowed"

Command tries to access files outside allowed roots:
1. Check `config/policy.default.json` for `roots` array
2. Ensure target directory is in an allowed root
3. Add new root path if needed, e.g., `"/projects/new/path"`

---

## Development

### Project Structure

```
letterblack-sentinel/
├── bin/
│   └── lbe.js              # CLI entrypoint
├── src/
│   ├── cli/
│   │   ├── parseArgs.js    # Argument parsing
│   │   └── commands/       # Command handlers
│   │       ├── init.js
│   │       ├── verify.js
│   │       ├── dryrun.js
│   │       ├── run.js
│   │       ├── policySign.js
│   │       └── integrityCheck.js
│   ├── core/
│   │   ├── signature.js    # Ed25519 signing/verification
│   │   ├── nonceStore.js   # Replay protection
│   │   ├── auditLog.js     # Hash-chain audit logging
│   │   ├── policyEngine.js # Policy evaluation
│   │   ├── policySignature.js
│   │   ├── policyVersionGuard.js
│   │   ├── trustedKeys.js
│   │   ├── integrity.js
│   │   ├── schema.js       # Command contract validation
│   │   └── validator.js    # validation orchestrator
│   └── adapters/
│       ├── index.js        # Adapter registry & dispatcher
│       ├── noopAdapter.js
│       └── shellAdapter.js
├── config/
│   └── policy.default.json
├── data/
│   ├── nonce.db.json      # (created by init)
│   └── audit.log.jsonl    # (created by init)
├── keys/
│   ├── public.key         # (created by init)
│   └── secret.key         # (created by init)
├── test/
│   └── generate-proposal.js
├── package.json
└── README.md (this file)
```

### Running Tests

```bash
node test/generate-proposal.js
npm test  # (when test suite is implemented)
```

### Development Mode

```bash
# Watch for changes (doesn't exist yet, use manual restart)
node bin/lbe.js init

# Test each command
node bin/lbe.js verify --in test-proposal.json --keys-store config/keys.json
node bin/lbe.js dryrun --in test-proposal.json --keys-store config/keys.json
node bin/lbe.js run --in test-proposal.json --keys-store config/keys.json
```

---

## License

Internal Development (Letterblack Inc.)

---

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/Letterblack0306/letterblack-sentinel/issues
- Email: eng@letterblack.io

---

**Built with ❤️ for AI governance**
