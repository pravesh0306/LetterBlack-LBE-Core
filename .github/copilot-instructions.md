# LetterBlack Controller Platform - AI Agent Instructions

## Project Overview

This repository contains **LetterBlack Sentinel**, a cryptographically-secured governance engine that enforces: **Agents Propose → Controller Decides → Adapters Execute**. This is part of the broader **LetterBlack Controller Platform (LBCP)** for safe AI-driven automation across creative tools and enterprise systems.

### Core Principle
> Agents are advisory only. Controller is the sole authority. Adapters are "dumb hands" that execute.

Never violate this separation: UI/Agents emit *intents*, Controller validates and decides, Adapters execute after approval.

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

### 4-Layer Validation Pipeline
Every command passes through 4 security gates in strict order:
1. **Schema Validation** - Structural correctness (`src/core/schema.js`)
2. **Signature Verification** - Ed25519 cryptographic authentication (`src/core/signature.js`)
3. **Nonce Checking** - Replay attack prevention (`src/core/nonceStore.js`)
4. **Policy Evaluation** - Deny-by-default governance rules (`src/core/policyEngine.js`)

### Key Components
- **Controller Core** (`src/core/validator.js`): Orchestrates 4-gate validation, the sole decision authority
- **Policy Engine** (`src/core/policyEngine.js`): Deny-by-default with allowlists/denylists for requesters, commands, adapters, filesystem paths
- **Adapters** (`src/adapters/`): Platform-specific executors (noop, shell, future: CEP, Blender)
- **Audit Log** (`src/core/auditLog.js`): Immutable hash-chain append-only ledger for compliance
- **Trusted Keys** (`src/core/trustedKeys.js`): Multi-key registry with versioned key IDs (e.g., `agent:gpt-v1-2026Q1`)
- **Key Rotation** (`src/core/keyRotation.js`): Lifecycle management for versioned keys with expiration enforcement

### Critical Architectural Invariant: Phase-Agnostic Design
Sentinel core is **stateless and deterministic**. It does not depend on UI phase state (SETUP, WORKING, etc.). Phase/solve resolution is a higher-layer platform concern for workflow orchestration. **Validation gates must NEVER be bypassed based on phase**.

## Development Patterns

### Module System
- **ES Modules only**: `type: "module"` in package.json, use `import`/`export`
- Node.js ≥20.9.0 required

### State Persistence
- **Always use atomic writes** via `src/core/atomicWrite.js` for databases (nonce, rate-limit, policy state)
- Pattern: write to temp file → atomic rename (POSIX guarantee)
- Never use direct `fs.writeFileSync` for state files

### Signature Operations
- Use `json-canonicalize` (RFC 8785) before signing/verifying to ensure deterministic JSON
- Strip `signature` field before canonicalizing payload
- All signatures are Ed25519 with base64-encoded output

### Policy Design
- **Deny-by-default**: If not explicitly allowed, it's blocked
- Requester scoping: `policy.requesters[requesterId]` controls allowCommands, allowAdapters, filesystem roots
- Path validation uses `path.resolve()` and prefix matching for security

### Error Handling
- Use custom error classes from `src/core/errors.js` (ValidationError, PolicyError, SignatureError, ReplayError, ConfigError)
- Return structured error objects with `{ ok: false, reason: 'CODE', message: 'details' }` pattern
- Never JSON.parse error strings; always validate first

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

1. **Never bypass validation gates** - All 4 must pass in order (schema → sig → nonce → policy), **regardless of system phase**
2. **Never use direct fs.writeFileSync for state** - Use `atomicWriteFileSync()` or `atomicAppendFileSync()` from `src/core/atomicWrite.js`
3. **Never parse error strings as JSON** - Validate structure first
4. **Never allow UI/Agents to execute directly** - They emit intents only
5. **Never skip policy signature verification in production** - Use `--policy-unsigned-ok` only in dev/test
6. **Never commit `keys/secret.key`** - Verify `.gitignore` includes it
7. **Never allow expired or revoked keys** - Key lifecycle enforcement is mandatory
8. **Never add phase-dependent logic to Sentinel core** - Phase resolution belongs to platform layer

## Key Reference Files

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

### High-Risk Adapters (CEP, Browser, Electron)
CEP and browser adapters are considered **high-risk** and must enforce:
- **Strict timeout limits** on all operations (no unbounded execution)
- **Restricted API surface** for evalScript or DOM APIs
- **Never access policy or key files** from adapter execution context
- **Return structured results only** (no raw eval output)
- **Never execute dynamic code from UI directly** (all code must pass through Controller validation)
- **Capability-based restrictions** (block filesystem if not in requester.filesystem.roots)

### CEP Adapter Implementation Pattern

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

**Critical Constraints:**
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

**MVP Action Set (safe, read-heavy):**
1. `ae.getProjectInfo` - Project metadata
2. `ae.getActiveCompInfo` - Active composition
3. `ae.listSelectedLayers` - Selected layers
4. `ae.applyEffectByMatchName` - Apply allowlisted effects only

**Testing Requirements:**
- Unit: Reject oversized args, excessive timeout, malformed JSON
- Integration: Round-trip request with AE + CEP running
- Security: Block `ae.evalRaw`, reject JSX strings in args
- Audit: Verify audit log entries for all executions

### Adding Policy Rules
1. Edit `config/policy.default.json` following deny-by-default structure
2. Add requester if new: `policy.requesters[requesterId]`
3. Set allowCommands, allowAdapters arrays
4. Configure filesystem roots and denyPatterns if needed
5. Re-sign policy: `npm run policy:sign`
6. Verify with test proposal: `npm run verify -- --in test.json`

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

## Questions for Clarification

When uncertain about implementation details, consider:
- Does this maintain the 3-layer separation (Agent/Controller/Adapter)?
- Is state persistence using atomic writes?
- Are all 4 validation gates enforced?
- Does this follow deny-by-default policy model?
- Are error codes structured and actionable?
- Is this feature phase-agnostic (stateless/deterministic)?
- Does key rotation remain explicit and auditable?
