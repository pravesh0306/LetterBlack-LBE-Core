# LetterBlack Controller Platform - AI Agent Instructions

## Quick Reference for Agents

**LetterBlack Sentinel** is a cryptographically-secured governance engine: **Agents Propose → Controller Decides → Adapters Execute**. 

### Keep This in Mind
- Sentinel core is **validation + controlled execution only** — no UI logic, phase logic, or business rules
- All 4 validation gates (schema → signature → nonce → policy) **must always pass**, regardless of context
- Use `atomicWriteFileSync()`/`atomicAppendFileSync()` for all state persistence (nonce DB, audit logs)
- Policy is **deny-by-default**: only what's explicitly allowed in `allowCommands`, `allowAdapters` executes
- Tests use sandbox pattern: `fs.mkdtempSync()` → initialize → test → cleanup; see `test/security-invariants.test.js`

### Implemented vs. Parked

**Implemented (Production-Ready Core):**
- ✅ 4-layer validation pipeline (schema, signature, nonce, policy)
- ✅ Ed25519 signature verification with versioned key IDs
- ✅ Replay protection via nonce store
- ✅ Hash-chain audit logging
- ✅ Adapters: `noop` (test), `shell` (commands with allowlists/denylists)
- ✅ Atomic writes for state persistence
- ✅ Deterministic exit codes + structured JSON output

**Parked (Deferred Until Required):**
- 🟡 Integrity strict mode (distribution verification)
- 🟡 Policy version binding hard rollout (multi-instance deployment)
- 🟡 Request rate limiting (fleet traffic patterns)
- 🟡 Deep audit analytics / dashboards
- 🟡 Future adapters: CEP, Blender, Nuke (reference designs documented)

See [MVP_READINESS.md](../letterblack-sentinel/MVP_READINESS.md) for detailed status.

---

## Project Overview

This repository contains **LetterBlack Sentinel** (v0.1.0), one component of the **LetterBlack Controller Platform (LBCP)** for safe AI-driven automation across creative tools and enterprise systems.

### Core Principle
> Agents are advisory only. Controller is the sole authority. Adapters are "dumb hands" that execute.

UI/Agents emit *intents* → Controller validates and decides → Adapters execute after approval.

### Fundamental Invariant: Single Responsibility
**Sentinel core must remain single-responsibility: validation and controlled execution only.**

No business logic, UI logic, or orchestration logic may enter core. This protects:
- Future maintainability
- Testability in isolation
- Embeddability in any host (CLI, HTTP, CEP)
- Independence from UI/platform lifecycle

## Sentinel Core Constitutional Invariant

This constitutional framework defines the immutable governance rules for Sentinel Core development.

### Article I — Single Responsibility of Sentinel Core

Sentinel Core exists solely to:
- Validate proposals
- Enforce cryptographic authenticity
- Enforce policy authorization
- Enforce replay protection
- Enforce integrity constraints
- Orchestrate controlled adapter execution
- Produce tamper-evident audit records

**Sentinel Core shall perform no other function.**

### Article II — Explicit Prohibition

The following shall **never** enter Sentinel Core:
- UI state logic
- Phase/solve resolution logic
- Workflow orchestration logic
- Business rules
- Notebook or memory systems
- Host-specific assumptions
- Platform-dependent shortcuts
- "Temporary" bypass flags
- Context-based gate relaxation

**No validation gate may be bypassed based on:**
- Phase (SETUP, WORKING, etc.)
- Environment
- Caller convenience
- Feature urgency

### Article III — Determinism Requirement

Sentinel Core must remain:
- **Stateless**
- **Phase-agnostic**
- **Deterministic**
- **Environment-neutral**

Given identical inputs and configuration, Sentinel must produce identical validation outcomes.

### Article IV — Separation of Concerns

**Sentinel Core (Infrastructure Layer)** is responsible for:
- Schema validation
- Signature verification
- Nonce validation
- Policy enforcement
- Key lifecycle enforcement
- Integrity verification
- Adapter authorization
- Audit logging

**Platform Layer (Outside Sentinel)** is responsible for:
- UI state
- Workflow orchestration
- Phase resolution
- User notebooks
- Solve hints
- Business workflows
- Presentation logic

**Dependency Rule:** The Platform Layer may depend on Sentinel. Sentinel must **never** depend on the Platform Layer.

### Article V — Change Review Gate

Before merging any change affecting Sentinel Core, reviewers must ask:
1. Is this feature phase-agnostic?
2. Does it introduce UI or orchestration logic?
3. Does it weaken or bypass a validation gate?
4. Does it modify key lifecycle guarantees?
5. Does it alter deterministic behavior?

If the answer to any of these is "yes" without strong justification, **the change must be rejected**.

### Article VI — Architectural Integrity Principle

Sentinel Core is **infrastructure**.

It is not:
- A feature engine
- A convenience layer
- A business logic container
- A UI extension

**It is a trust boundary. Trust boundaries must not erode.**

### Constitutional Guarantees

This invariant guarantees:
- ✅ Portability across CLI, HTTP, CEP, cloud, and future hosts
- ✅ Testability without UI mocks
- ✅ Maintainability without entanglement
- ✅ Longevity beyond platform evolution
- ✅ Resistance to "just one small exception" decay

## Architecture

### Execution Flow (ASCII Reference)
```
Agent (LLM — advisory only)
    ↓ proposal.json (unsigned)
Controller (validate → decide → execute)
    ├─ Schema validation
    ├─ Signature verification
    ├─ Nonce check (replay protection)
    └─ Policy evaluation (deny-by-default)
    ↓ ✅ decision: ALLOW or DENY
Adapter (dumb hands — constrained execution)
    ├─ noop (dry-run, no-op)
    ├─ shell (cmd with allowlist/timeout)
    └─ future: cep, blender, nuke
    ↓ result + timestamp
Audit Log (immutable, hash-chain append-only)
    └─ One entry per command ✅
```

**Critical Rule:** Agents never call adapters directly. All execution flows through Controller validation gates.

### 4-Layer Validation Pipeline (Implemented)
Every command passes through 4 security gates in strict order:
1. **Schema Validation** - Structural correctness (`src/core/schema.js`)
2. **Signature Verification** - Ed25519 cryptographic authentication (`src/core/signature.js`)
3. **Nonce Checking** - Replay attack prevention (`src/core/nonceStore.js`)
4. **Policy Evaluation** - Deny-by-default governance rules (`src/core/policyEngine.js`)

**All 4 gates must pass in order. No shortcuts.** Return early on first failure.

### Key Components
- **Controller Core** (`src/core/validator.js`): Orchestrates 4-gate validation, sole decision authority
- **Policy Engine** (`src/core/policyEngine.js`): Deny-by-default with allowlists/denylists (requesters, commands, adapters, filesystem)
- **Adapters** (`src/adapters/`): Currently implemented: `noop` (test), `shell` (commands). Planned: CEP, Blender, Nuke
- **Audit Log** (`src/core/auditLog.js`): Immutable hash-chain append-only ledger (use `atomicAppendFileSync()`)
- **Trusted Keys** (`src/core/trustedKeys.js`): Multi-key registry with versioned key IDs (e.g., `agent:gpt-v1-2026Q1`)
- **Key Rotation** (`src/core/keyRotation.js`): Lifecycle management for versioned keys with expiration enforcement

### Critical Architectural Invariant: Phase-Agnostic Design
Sentinel core is **stateless and deterministic**. It does not depend on UI phase state (SETUP, WORKING, etc.). Phase/solve resolution belongs to higher-layer platform. **Validation gates must NEVER be bypassed based on phase**.

## Development Patterns

### Module System
- **ES Modules only**: `type: "module"` in package.json, use `import`/`export`
- Node.js ≥20.9.0 required
- No CommonJS (`require`) - ever

### State Persistence (Critical)
- **Always use atomic writes** via `src/core/atomicWrite.js` for databases (nonce, rate-limit, policy state)
- Pattern: write to temp file → atomic rename (POSIX guarantee) 
- For appending (audit log): use `atomicAppendFileSync(filePath, data)` - it reads existing, appends, writes atomically
- **NEVER** use direct `fs.writeFileSync()` for state files — race conditions on process crash
- Databases: `nonce.db.json`, `rate-limit.db.json`, audit logs all use atomic writes

### Signature Operations
- Use `json-canonicalize` (RFC 8785) before signing/verifying to ensure deterministic JSON
- Strip `signature` field from proposal **before** canonicalizing
- All signatures are Ed25519 with base64-encoded output
- Key ID format: `agent:name-v1-YYYYQN` (e.g., `agent:gpt-v1-2026Q1`)

### Policy Design
- **Deny-by-default**: If not explicitly in `allowCommands` or `allowAdapters`, request is blocked
- Requester scoping: `policy.requesters[requesterId]` controls allowCommands, allowAdapters, filesystem roots
- Path validation uses `path.resolve()` and prefix matching for security
- Expired keys must fail validation immediately (no grace periods)

### Error Handling
- Use custom error classes from `src/core/errors.js` (ValidationError, PolicyError, SignatureError, ReplayError, ConfigError)
- Return structured error objects with `{ ok: false, reason: 'CODE', message: 'details' }` pattern
- Never JSON.parse error strings; always validate structure first
- Exit codes: 0 = success, 1 = validation/policy failure, 9 = execution error, 2 = parse/config error

## CLI Workflow

### Common Commands
```bash
# Initialize environment (creates keys, config, data dirs)
npm run init

# Validate proposal without execution
npm run verify -- --in proposal.json --keys-store config/keys.json

# Dry-run with noop adapter
npm run dryrun -- --in proposal.json --keys-store config/keys.json

# Execute after validation
npm run run -- --in proposal.json --keys-store config/keys.json

# Sign policy after editing
npm run policy:sign -- --config config/policy.default.json --policy-sig config/policy.sig.json

# Verify audit log integrity
npm run audit:verify -- --audit data/audit.log.jsonl

# Health check (deployment readiness)
npm run health
```

### Testing
```bash
# Run security invariant tests
npm test

# Tests use Node's built-in test runner (node:test)
# Pattern: Sandbox-based with fs.mkdtempSync() cleanup via t.after()
```

## Proposal Lifecycle (Canonical Example)

### 1. Unsigned Proposal (Agent Generated)
Agent creates this JSON and sends to Controller:

```json
{
  "id": "RUN_SHELL",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "requesterId": "agent:gpt-v1-2026Q1",
  "sessionId": "session:design-2026-02-20",
  "timestamp": 1739991600,
  "nonce": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "requires": ["shell:execute"],
  "risk": "MEDIUM",
  "payload": {
    "adapter": "shell",
    "cmd": "ls",
    "args": ["-la", "/tmp"],
    "cwd": "/tmp"
  }
}
```

**Key Fields:**
- `commandId`: UUID (unique per command, used in nonce DB to prevent replay)
- `timestamp`: Unix seconds (checked against system clock ± `maxClockSkewSec`)
- `nonce`: 64-char hex string (32 random bytes; must not exist in `data/nonce.db.json`)
- `requesterId`: Matches key in `policy.requesters[requesterId]`
- `payload.adapter`: Must be in `policy.requesters[requesterId].allowAdapters`

### 2. Nonce & Signature Generation

**Nonce Creation:**
```
nonce = crypto.randomBytes(32).toString('hex')  // Always unique, always fresh
```
**Stored** in `data/nonce.db.json` after validation passes, never reused.

**Signature Construction:**
```javascript
// 1. Remove signature field (if present)
const unsigned = { ...proposal };
delete unsigned.signature;

// 2. Canonicalize to RFC 8785 JSON (deterministic ordering, no whitespace)
const msg = canonicalize(unsigned);  // Internal: uses json-canonicalize

// 3. Sign with Ed25519 private key
const sig = nacl.sign.detached(msg, secretKey);  // Base64-encoded output

// 4. Attach signature envelope
proposal.signature = {
  alg: "ed25519",
  keyId: "agent:gpt-v1-2026Q1",
  sig: toBase64(sig)  // 64-byte signature as base64
};
```

### 3. Signed Proposal (Agent → Controller)

```json
{
  "id": "RUN_SHELL",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "requesterId": "agent:gpt-v1-2026Q1",
  "sessionId": "session:design-2026-02-20",
  "timestamp": 1739991600,
  "nonce": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "requires": ["shell:execute"],
  "risk": "MEDIUM",
  "payload": {
    "adapter": "shell",
    "cmd": "ls",
    "args": ["-la", "/tmp"],
    "cwd": "/tmp"
  },
  "signature": {
    "alg": "ed25519",
    "keyId": "agent:gpt-v1-2026Q1",
    "sig": "abcdef123456789...base64-encoded-64-byte-sig...xyz="
  }
}
```

### 4. Controller Validation Result

Controller returns (verbatim):

```json
{
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "decision": "ALLOW",
  "reason": "All 4 validation gates passed",
  "checks": {
    "schema": true,
    "signature": true,
    "nonce": true,
    "policy": true
  }
}
```

Or on failure:

```json
{
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "decision": "DENY",
  "reason": "POLICY_DENIED",
  "message": "Adapter 'cep' not in allowAdapters for agent:gpt-v1-2026Q1",
  "checks": {
    "schema": true,
    "signature": true,
    "nonce": true,
    "policy": false
  }
}
```

### 5. Audit Log Entry (Immutable Append)

One line per command appended to `data/audit.log.jsonl`:

```json
{
  "timestamp": "2026-02-20T06:00:00.000Z",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "requesterId": "agent:gpt-v1-2026Q1",
  "decision": "ALLOW",
  "adapter": "shell",
  "status": "success",
  "exitCode": 0,
  "output": "total 256\ndrwxrwxrwt 15 root root 4096 Feb 20 06:00 .",
  "duration_ms": 145,
  "previousHash": "sha256:abc123def456...",
  "hash": "sha256:xyz789uvw012..."
}
```

**Hash Chain Verification:**
- Each entry's `hash` = SHA256(canonical JSON of this entry)
- Each entry's `previousHash` = the `hash` of the prior entry
- Tampering is detected: computed hash ≠ stored hash

## File Structure Conventions

### Key Directories
- `src/core/`: Validation, policy, crypto, audit log - the authority layer
- `src/adapters/`: Platform-specific executors (must be "dumb hands")
- `src/cli/commands/`: CLI command handlers for verify, run, dryrun, etc.
- `config/`: Policy files and trusted key registry (read-only in production containers)
- `data/`: Mutable state (nonce DB, audit log, rate limits) - must be writable
- `keys/`: **CRITICAL** - `secret.key` must never be committed (gitignored), `public.key` is distributable
- `LBCP_Plan/`: Phase-gated planning docs for broader platform (CEP, Browser, Electron adapters)

### Security-Critical Files
- `keys/secret.key`: Ed25519 private key, **NEVER commit**, permissions 0600
- `config/keys.json`: Multi-key trusted registry (preferred over single key)
- `config/policy.default.json`: Deny-by-default governance rules
- `config/policy.sig.json`: Signed envelope for policy integrity verification
- `data/nonce.db.json`: Replay protection store (atomic writes only)

## Testing Philosophy

### Security Invariants Pattern
See `test/security-invariants.test.js` for the testing model:
1. Create isolated sandbox with `fs.mkdtempSync()`
2. Initialize with `node bin/lbe.js init`
3. Mutate policy/proposal to test edge cases
4. Assert exit codes and error messages
5. Cleanup sandbox via `t.after()`

### Pre-Release Gates
Critical checklist from `LBCP_Plan/07_TESTING_CHECKLISTS.md`:
- Boot without freezes
- Signature verification never bypassed
- Nonce replay protection enforced
- Policy file integrity verified
- Atomic writes prevent race conditions
- Audit log hash-chain intact

## Docker Deployment

### Container Security Model
From `letterblack-sentinel/deploy/runbook/RUNBOOK_OnPrem.md`:
- Root filesystem: **read-only**
- `/app/config`: **read-only** (mounted externally)
- `/app/data`: **read-write** (audit/state persistence)
- User: non-root (`node`)
- No secrets baked in image

### Validation
```bash
# Build
docker build -f deploy/docker/Dockerfile -t letterblack-sentinel:local .

# Validate isolation
bash deploy/docker/container-validation.sh letterblack-sentinel:local
```

## Common Pitfalls to Avoid

1. **Never bypass validation gates** - All 4 must pass in order (schema → sig → nonce → policy), **regardless of system phase** — this is the constitutional guarantee
2. **Never execute with partial validation** - No "soft allow," no skipping capability checks. Every command must pass ALL 4 validation gates or fail completely. Half-validated execution is a security failure.
3. **Never use direct fs.writeFileSync for state** - Use `atomicWriteFileSync()` or `atomicAppendFileSync()`; missed atomic writes cause audit log corruption
4. **Never parse untrusted JSON with JSON.parse** - Always validate schema/type first with `validateSchema()` 
5. **Never allow UI/Agents to execute directly** - Intents only; Controller must decide
6. **Never skip policy signature verification** - Use `--policy-unsigned-ok` only in dev/test sandboxes
7. **Never commit `keys/secret.key`** - Verify `.gitignore` includes it; check git history for accidents
8. **Never allow expired or revoked keys** - Every signature check must validate key lifecycle (notBefore, expiresAt)
9. **Never add environment-branching logic to Controller** - Controller must be deterministic. Do not read `process.env` to decide adapter behavior, detect CEP availability, or branch policy logic. Environment-specific concerns belong in adapters or platform layer, not validation core.
10. **Never add phase-dependent logic** - Phase resolution is platform layer; Sentinel must be stateless
11. **Never mutate policy without re-signing** - Changed policy requires `npm run policy:sign` before execution
12. **Never execute unbounded operations** - Shell adapter has `timeoutMs` limits; respects policy `exec.denyCmds`

## Key Reference Files

- [letterblack-sentinel/MVP_READINESS.md](../letterblack-sentinel/MVP_READINESS.md) - **START HERE**: Implementation status + test runbook
- [letterblack-sentinel/TESTING_GUIDE.md](../letterblack-sentinel/TESTING_GUIDE.md) - Real-world test procedures
- [letterblack-sentinel/README.md](../letterblack-sentinel/README.md) - Quick start and proposal spec
- [LBCP_Plan/00_OVERVIEW.md](../LBCP_Plan/00_OVERVIEW.md) - Project vision and deliverables
- [LBCP_Plan/01_ARCHITECTURE.md](../LBCP_Plan/01_ARCHITECTURE.md) - Layer contracts and capability model
- [LBCP_Plan/03_CONTROLLER_CORE.md](../LBCP_Plan/03_CONTROLLER_CORE.md) - Command schema and phase/solve resolver
- [letterblack-sentinel/SECURITY_AUDIT.md](../letterblack-sentinel/SECURITY_AUDIT.md) - Production hardening verification

## Key Management & Rotation

### Key Lifecycle Rules
Keys are **versioned, lifecycle-bound, and revocable**:
- Key IDs follow pattern: `agent:name-v1-2026Q1`
- Keys have `notBefore` and `expiresAt` timestamps
- Expired keys must **immediately fail validation**
- Revoked keys must be rejected at signature verification stage
- Key rotation must be **explicit and logged** in audit trail

### Key Rotation Constraints
When modifying `src/core/trustedKeys.js` or `src/core/keyRotation.js`:
- ✅ Never allow expired keys
- ✅ Never auto-extend key validity
- ✅ Never silently downgrade lifecycle checks
- ✅ Rotation must not break existing policy signature validation
- ✅ All key state changes must be atomic writes

## Extending the System

### Adding a New Adapter
1. Create `src/adapters/newAdapter.js` with `export async function newAdapter(cmd, policy, requester)`
2. Register in `src/adapters/index.js` getAdapter() switch
3. Add adapter to policy allowAdapters list
4. Implement capability validation (filesystem, evalScript, etc.)
5. Add timeout enforcement and output size limits
6. Return structured result: `{ adapter, commandId, status, output/error, exitCode, timestamp }`
7. Test with sandbox: `npm run dryrun -- --in proposal.json`

### Currently Implemented Adapters
- **noop**: Test/dry-run adapter (always success, no execution)
- **shell**: System command execution with allowlists (`exec.allowCmds`), denylists (`exec.denyCmds`), timeout, and filesystem constraints
- **observer**: Non-mutating observation adapter (read-only, audit-only for AI self-reporting)

### Important: This Repository is CLI-First
**This codebase is CLI-first and Node.js runtime-only.** CEP adapter exists as architectural reference and planned future work, not as active runtime code. Do not attempt to implement CEP hooks, browser communication, or UI integration into Sentinel core. All platform-specific runtime concerns belong in a separate integration layer.

### Future Adapters (Planned, Not Implemented)
- **cepAdapter**: Adobe CEP extension communication (high-risk: requires strict IPC, timeout limits)
- **blenderAdapter**: Blender scripting interface
- **nukeAdapter**: Nuke compositor scripting

#### CEP Adapter Design Pattern (FUTURE - Reference Only)

**Architecture:** Control plane (Sentinel) → IPC Bridge → CEP Extension → JSX Runtime

**Message Contract (RPC):**
```javascript
// Request (Sentinel → CEP)
{
  "v": 1,
  "requestId": "uuid",
  "adapter": "cep",
  "actionId": "ae.getProjectInfo",  // Allowlisted actions only
  "args": { /* bounded size */ },
  "timeoutMs": 5000
}

// Response (CEP → Sentinel)
{
  "ok": true,
  "requestId": "uuid",
  "actionId": "ae.getProjectInfo",
  "data": { /* structured result */ }
}
```

**Critical Constraints (when implemented):**
- **No raw eval**: Every action must be pre-bundled and allowlisted
- **File-based IPC** (recommended): `bridge/inbox/*.json` ← Sentinel writes, CEP polls; CEP writes → `bridge/outbox/*.json`
- **JSX Dispatcher**: `LB_CEP.dispatch(payload)` maps `actionId` to hardcoded functions (ES3-compatible)
- **Double-gating**: Policy checks allowActions, JSX dispatcher has second allowlist
- **Atomic operations**: All bridge I/O uses atomic writes
- **Response size caps**: Enforce `maxBytes` on args and response
- **Timeout enforcement**: `timeoutMs <= policy.adapters.cep.timeoutMsMax`

**Policy Model:**
```json
{
  "requesters": {
    "agent:ui-v1": {
      "allowAdapters": ["cep"],
      "allowActions": [
        "ae.getProjectInfo",
        "ae.listSelectedLayers",
        "ae.applyEffectByMatchName"
      ],
      "denyActions": ["ae.deleteItem", "ae.evalRaw"]
    }
  },
  "adapters": {
    "cep": {
      "timeoutMsMax": 8000,
      "argsMaxBytes": 8192
    }
  }
}
```

### Adding Policy Rules
1. Edit `config/policy.default.json` following deny-by-default structure
2. Add requester if new: `policy.requesters[requesterId]`
3. Set allowCommands, allowAdapters arrays
4. Configure filesystem roots and denyPatterns if needed
5. Re-sign policy: `npm run policy:sign`
6. Verify with test proposal: `npm run verify -- --in test.json`

### Adding a New Requester to Policy
```json
{
  "requesters": {
    "agent:new-requester": {
      "allowAdapters": ["noop"],
      "allowCommands": ["RUN_SHELL"],
      "filesystem": {
        "roots": ["/home/user/projects"],
        "denyPatterns": ["**/.git/**", "**/*.key", "**/secrets/**"]
      },
      "exec": {
        "allowCmds": ["ls", "echo"],
        "denyCmds": ["rm", "sudo"]
      }
    }
  }
}
```
Then run `npm run policy:sign` and restart.

## Observer-Only Governance Mode

### Pattern: Non-Mutating AI Observations

**Use Case:** AI detects irregular states (missing layer selection, unexpected errors, etc.) and reports them **without executing mutations**.

**Key Principle:** All 4 validation gates remain intact. The only change is the adapter class (observer vs. shell).

### How It Works

Instead of routing to mutations:
```
Agent → Proposal → Controller → Adapter (mutating)
```

Route to observations:
```
Agent → Proposal → Controller → Observer Adapter (read-only)
```

**Critical:** Both paths validate all 4 gates. The observer adapter simply refuses to mutate.

### Example: After Effects Irregularity

```json
{
  "id": "OBSERVE_ISSUE",
  "commandId": "observe.irregularity",
  "requesterId": "agent:observer",
  "sessionId": "session:ae-monitoring-2026-02-20",
  "timestamp": 1739991600,
  "nonce": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "requires": ["observe"],
  "risk": "NONE",
  "payload": {
    "source": "CEP",
    "context": "AfterEffects",
    "issueType": "NO_LAYER_SELECTED",
    "description": "Attempted property expression application with no active layer",
    "severity": "low",
    "metadata": {
      "compName": "MainComp",
      "attemptedAction": "applyPropertyExpression",
      "timestamp": 1739991600
    }
  },
  "signature": {
    "alg": "ed25519",
    "keyId": "agent:observer-v1-2026Q1",
    "sig": "base64-encoded-signature"
  }
}
```

### Observer Adapter Behavior

**Location:** `src/adapters/observerAdapter.js`

**What It Does:**
1. Validates command is `observe.*`
2. Checks payload has `issueType` and `description`
3. Validates `severity` is one of: low, medium, high, critical
4. Returns observation record (no mutations)
5. Controller appends to audit log

**What It Does NOT Do:**
- ❌ Mutate filesystem
- ❌ Execute shell commands
- ❌ Modify state files
- ❌ Call external processes
- ❌ Bypass any validation gate

### Policy for Observer Mode

```json
{
  "requesters": {
    "agent:observer": {
      "allowAdapters": ["observer"],
      "allowCommands": ["observe.irregularity"],
      "description": "Observer-only: AI reports issues, no mutations"
    }
  }
}
```

**Why This Works:**
- Policy explicitly restricts `agent:observer` to `observe.*` commands only
- Deny-by-default prevents any mutation commands
- Even if proposal is valid, policy enforcement rejects non-observer commands

### Validation Example: Rejecting Mutations from Observer

If `agent:observer` tries to run `RUN_SHELL`:

```json
{
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "decision": "DENY",
  "reason": "POLICY_DENIED",
  "message": "Requester 'agent:observer' not authorized for command 'RUN_SHELL'",
  "checks": {
    "schema": true,
    "signature": true,
    "nonce": true,
    "policy": false
  }
}
```

**Exit Code:** 1 (failure)

### Audit Trail for Observations

Each observation creates an audit log entry:

```json
{
  "timestamp": "2026-02-20T06:00:00.000Z",
  "commandId": "observe.irregularity",
  "requesterId": "agent:observer",
  "decision": "ALLOW",
  "adapter": "observer",
  "status": "recorded",
  "observation": {
    "source": "CEP",
    "context": "AfterEffects",
    "issueType": "NO_LAYER_SELECTED",
    "description": "Attempted property expression application with no active layer",
    "severity": "low",
    "metadata": { "compName": "MainComp" }
  },
  "duration_ms": 5,
  "hash": "sha256:xyz789...",
  "previousHash": "sha256:abc123..."
}
```

**What This Enables:**
- ✅ Structured irregularity tracking
- ✅ Tamper-evident record (hash chain)
- ✅ Signed origin proof (cryptographic signature)
- ✅ Replay protection (nonce prevents duplicate observations)
- ✅ No mutation risk (observer adapter is read-only)

### Strategic Value

Observer-only mode allows you to:

1. **Test Sentinel's governance** without letting AI mutate anything yet
2. **Collect behavioral telemetry** (what issues does AI detect?)
3. **Build trust gradually** (run observer mode for 1–2 weeks, then evaluate)
4. **Enable AI self-reporting** (anomaly detection, without risk)
5. **Maintain all security guarantees** (no gate shortcuts, no bypasses)

### Why This Is NOT a Bypass

❌ **NOT a bypass because:**
- All 4 validation gates are enforced
- Policy explicitly restricts to `observe.*` commands
- Adapter is constrained to read-only operations
- Audit trail is complete and tamper-evident
- No environment branching (policy enforces it)
- No partial validation (all gates or fail)

✅ **IS a legitimate command class:**
- `observe.*` commands are allowed by policy
- Treated as first-class citizens
- Full cryptographic proof
- Production-safe (no mutations)

### Development Pattern: Observer-First Testing

```bash
# 1. Create observer proposal
node test/generate-observer-proposal.js

# 2. Verify (all 4 gates)
npm run verify -- --in observer-proposal.json --keys-store config/keys.json

# 3. Run (audit-only, no mutations)
npm run run -- --in observer-proposal.json --keys-store config/keys.json

# 4. Check audit log
tail -1 data/audit.log.jsonl | jq .

# 5. Repeat for 1–2 weeks, observe irregularities
```

### When to Move From Observer to Mutations

After running observer-only mode for 1–2 weeks:

Ask yourself:
1. ✅ Are observations valuable? (Yes → keep it)
2. ✅ Would selective mutations help? (Yes → design them)
3. ✅ Do you trust the observer data? (Yes → use it for mutation decisions)

Only then: Add `agent:mutation` requester with restricted mutation commands.

---

## Platform vs. Core Separation

### What Belongs in Sentinel Core
- 4-layer validation pipeline
- Cryptographic signature verification
- Policy enforcement (deny-by-default)
- Nonce/replay protection
- Audit logging
- Key rotation and lifecycle management
- Adapter execution (with capability constraints)

### What Belongs in Platform Layer (NOT Sentinel Core)
- **Phase resolution** (SETUP, READY, WORKING, ASSISTED, ADVANCED, BLOCKED)
- **Solve hints** ("Select a layer", "Open a composition")
- **User notebooks** (agent memory, project intelligence)
- **UI state management** (selected layers, active composition)
- **Workflow orchestration** (CEP vs Browser environment detection)

Agents working on Sentinel core should be **aware** these platform features exist but understand Sentinel does not depend on them.

## Debugging & Troubleshooting

### Common Validation Failures

| Error | Cause | What This Means Internally | Fix |
|-------|-------|---------------------------|-----|
| `SCHEMA_ERROR` | Proposal missing required field or wrong type | Structural validation failed before signature check | Check proposal structure against `src/core/schema.js` |
| `KEY_ID_INVALID` | keyId not in `agent:name-v1-YYYYQN` format | keyId parsing failed; prevents version tracking | Use versioned key IDs, e.g., `agent:gpt-v1-2026Q1` |
| `SIGNATURE_INVALID` | Signature doesn't match payload or key is revoked | Ed25519 verification failed; payload was mutated or wrong key | Strip `signature` field **before** canonicalizing, verify payload wasn't changed, confirm key in `config/keys.json` |
| `KEY_EXPIRED` | Key's `expiresAt` timestamp is in past | Key lifecycle validation failed; key revoked by policy | Rotate to a valid, non-expired key in `config/keys.json`; check key's `expiresAt` field |
| `REPLAY_DETECTED` | Nonce already seen in `data/nonce.db.json` | Nonce store has this exact nonce; prevents replay attacks | Generate entirely new nonce; do not reuse `proposal.nonce` from prior commands |
| `POLICY_DENIED` | Adapter/command not in allowlists; requester not authorized | Policy evaluation found no match in `policy.requesters[requesterId]` | Check `policy.requesters[requesterId].allowAdapters` and `allowCommands` lists; verify requester is registered |

### Quick Debug Commands
```bash
# Validate without executing
npm run verify -- --in proposal.json

# Dry-run with noop adapter (safe test)
npm run dryrun -- --in proposal.json

# Check audit log integrity
npm run audit:verify -- --audit data/audit.log.jsonl

# View current policy
cat config/policy.default.json

# Check health status
npm run health --json true
```

### Resetting for Development
```bash
# Full reset (WARNING: clears all state)
rm -rf data/nonce.db.json data/rate-limit.db.json data/audit.log.jsonl

# Re-initialize after reset
npm run init
```

## Questions for Clarification

When uncertain about implementation details, consider:
- Does this maintain the 3-layer separation (Agent/Controller/Adapter)?
- Is state persistence using atomic writes?
- Are all 4 validation gates enforced?
- Does this follow deny-by-default policy model?
- Are error codes structured and actionable?
- Is this feature phase-agnostic (stateless/deterministic)?
- Does key rotation remain explicit and auditable?
