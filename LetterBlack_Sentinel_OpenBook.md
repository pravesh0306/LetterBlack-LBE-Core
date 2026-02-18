# LetterBlack Sentinel OpenBook
## Enterprise AI‑Safe Pipeline — End‑to‑End Playbook (CLI‑First)

**Owner:** Letterblack  
**Audience:** You + your internal agents/devs  
**Status:** Living document (update as you ship)  
**Generated:** 2026-02-18 (UTC)

---

## 0) What This OpenBook Is
This is the **single source of truth** for building and operating **LetterBlack Sentinel** as an **enterprise‑grade, contract‑driven AI execution governance layer**.

It explains:
- What Sentinel is (and what it is not)
- The exact build order (phases)
- The concrete artifacts to produce
- The acceptance criteria and failure modes
- The commands you run
- The rules that **must never be violated**
- How to package and extend (adapters) without breaking trust

---

## 1) Sentinel in One Sentence
**LetterBlack Sentinel is a trust boundary:** AI can propose actions, but only Sentinel can validate and execute them under strict policy, cryptography, and audit evidence.

---

## 2) Non‑Negotiable Principles (The Constitution)

### 2.1 Authority Model
- **Agents are untrusted advisors.**
- **Sentinel Controller is the authority.**
- **Adapters are dumb hands** (no policy decisions inside adapters).

### 2.2 Deny‑by‑Default
Everything is denied unless explicitly allowed:
- requesters
- commands
- adapters
- filesystem roots
- shell executable allowlist

### 2.3 Deterministic Outputs
Every operation returns:
- structured JSON output
- deterministic exit code
- audit record when appropriate

### 2.4 Evidence Is a Feature
Audit and receipts are **core**:
- tamper‑evident audit log (hash chain)
- audit verification tool (`audit-verify`)
- (optional) signed execution receipts for non‑repudiation

---

## 3) System Map (Conceptual)

```
AI / Agent / Tooling
        |
        v
 Signed Proposal (JSON)
        |
        v
+-----------------------+
|  Sentinel Controller  |  (Authority)
|  - schema             |
|  - signature          |
|  - key lifecycle      |
|  - nonce replay       |
|  - timestamp skew     |
|  - rate limit         |
|  - policy enforcement |
|  - policy signature   |
|  - policy versioning  |
|  - controller integrity
+-----------------------+
        |
        v
+-----------------------+
|       Adapter         |  (Hands)
|  - constrained exec   |
|  - timeouts/caps      |
+-----------------------+
        |
        v
+-----------------------+
| Audit Ledger / Receipts|
+-----------------------+
```

---

## 4) Repo & Artifact Layout (Recommended)

```
letterblack-sentinel/
  bin/
    lbe.js
  src/
    cli/
      commands/
      parseArgs.js
    core/
      schema.js
      validator.js
      signature.js
      trustedKeys.js
      nonceStore.js
      rateLimiter.js
      policyEngine.js
      policySignature.js
      integrity.js
      atomicWrite.js
      auditLog.js
      executionReceipt.js
  config/
    policy.json
    policy.sig.json
    keys.json
    integrity.manifest.json
  data/
    nonce.db.json
    rate.db.json
    audit.log.jsonl
    policy.state.json
  test/
    security-invariants.test.js
  docs/
    (this OpenBook + whitepaper + threat model)
```

---

## 5) Contracts

### 5.1 Proposal (Command) Contract
A proposal is a JSON envelope that must pass:
1) schema validation  
2) keyId validation  
3) timestamp skew  
4) signature verification  
5) rate limiting  
6) nonce replay check  
7) policy enforcement  
8) (optional) controller integrity preflight  
9) (optional) policy signature + version binding preflight  

**Minimum fields (example):**
- `id` (command name)
- `commandId` (uuid)
- `requesterId`
- `sessionId`
- `timestamp` (epoch seconds)
- `nonce`
- `payload` (adapter + parameters)
- `signature` (alg/keyId/sig)

### 5.2 Policy Contract
Policy must enforce:
- deny‑by‑default
- explicit allowlists per requester
- security controls (clock skew, default rate limit)
- filesystem roots + deny patterns
- adapter allowlists
- command allowlists

**Phase 1.4 adds mandatory:**
- `version`
- `createdAt` (signed timestamp)
- optional `environment`

### 5.3 Key Store Contract
Trusted keys must be:
- versioned keyIds (no “default”)
- lifecycle bound (notBefore + expiresAt)
- scoped to requester trust (recommended)

---

## 6) Phases (Exact Build Order)

### Phase 0 — Baseline CLI (Foundation)
**Goal:** CLI exists and can verify/run under a minimal policy.

**Must have:**
- `init`, `verify`, `dryrun`, `run`
- schema validation
- Ed25519 signature verification
- deny‑by‑default policy
- basic audit append

**Exit criteria:**
- verify/dryrun/run works end‑to‑end on a safe adapter (`noop`)
- blocked if schema invalid or signature invalid

---

### Phase 1 — Enterprise Core Hardening (Trust Stack)
This is the heart. Do not expand adapters until Phase 1 is complete.

#### Phase 1.1 — CI Security Invariants
**Goal:** security controls become regression‑proof.

**You already did:**
- invariants test suite enforced in CI

**Exit criteria:**
- CI fails on any regression of policy/audit/replay/rate/skew

#### Phase 1.2 — Key Lifecycle Enforcement
**Goal:** keys cannot live forever.

**Rules:**
- each trusted key has `notBefore` and `expiresAt`
- reject expired keys with `KEY_EXPIRED`
- reject not‑yet‑valid keys with `KEY_NOT_YET_VALID` (recommended)

**Exit criteria:**
- tests cover expiry and notBefore behavior
- `init` migrates older keys safely

#### Phase 1.3 — Controller Integrity Check
**Goal:** prevent tampering with the controller layer.

**Mechanism:**
- `integrity-generate` produces `integrity.manifest.json`
- `integrity-check` verifies current files match manifest
- `--integrity-strict --integrity-manifest ...` gates verify/dryrun/run

**Exit criteria:**
- strict preflight blocks execution if controller modified
- tests cover strict mode

#### Phase 1.4 — Policy Version Binding (Next)
**Goal:** prevent policy rollback and signature replay across versions.

**Implementation spec (exact):**
1) Policy must include:
   - `version` (semver or integer)
   - `createdAt` (ISO or epoch; choose one)
   - optional `environment`
2) Policy signature must bind the *entire policy including these fields*.
3) Sentinel stores last accepted policy meta in `data/policy.state.json`.
4) On boot preflight:
   - if policy version regresses → block (`POLICY_VERSION_REGRESSION`)
   - if createdAt older than last accepted → block
   - if createdAt skew beyond tolerance → block
5) Provide CLI:
   - `policy-sign` (optional) to sign policy and write `policy.sig.json`

**Exit criteria:**
- policy tamper is blocked
- policy rollback is blocked
- policy version bump without resign is blocked
- tests cover all cases

> **Rule:** Policy version binding must be enforced on `verify`, `dryrun`, and `run` paths.

---

## 7) Acceptance Matrix (What Must Always Work)

### 7.1 Positive Paths
- Valid command → `EXIT=0`
- Clean audit log → `audit-verify` valid true
- Valid policy signature → preflight pass

### 7.2 Negative Controls (Must Block)
- invalid schema → `SCHEMA_ERROR`
- invalid keyId → `KEY_ID_INVALID`
- expired key → `KEY_EXPIRED`
- timestamp skew exceeded → `TIMESTAMP_SKEW_EXCEEDED`
- invalid signature → `SIGNATURE_INVALID`
- rate limit exceeded → `RATE_LIMIT_EXCEEDED`
- replay nonce → `REPLAY_NONCE`
- policy denies action → `COMMAND_NOT_ALLOWED` / etc
- policy signature missing/invalid (strict) → `POLICY_SIGNATURE_MISSING/INVALID`
- audit tamper → `HASH_MISMATCH` / `PREV_HASH_MISMATCH`
- controller integrity fail (strict) → `INTEGRITY_FAIL`
- policy rollback (Phase 1.4) → `POLICY_VERSION_REGRESSION`

---

## 8) How to Operate Sentinel (Day‑to‑Day)

### 8.1 Initialize a workspace
```bash
node bin/lbe.js init
```

### 8.2 Verify a proposal (no execution)
```bash
node bin/lbe.js verify --in examples/proposal.json --keys-store config/keys.json --policy config/policy.json
```

### 8.3 Dry‑run (prints plan)
```bash
node bin/lbe.js dryrun --in examples/proposal.json --keys-store config/keys.json --policy config/policy.json
```

### 8.4 Execute (governed)
```bash
node bin/lbe.js run --in examples/proposal.json --keys-store config/keys.json --policy config/policy.json --audit data/audit.log.jsonl
```

### 8.5 Verify audit integrity
```bash
node bin/lbe.js audit-verify --audit data/audit.log.jsonl
```

### 8.6 Controller integrity (strict mode)
```bash
node bin/lbe.js integrity-generate --out config/integrity.manifest.json
node bin/lbe.js verify --integrity-strict --integrity-manifest config/integrity.manifest.json --in examples/proposal.json ...
```

---

## 9) Deployment (Phase 2 — After Phase 1 Complete)

### Phase 2.1 Docker On‑Prem Package
**Goals:**
- run inside studio network
- mount config from volume
- write logs to volume
- keep container filesystem read‑only

**Deliverables:**
- Dockerfile
- docker-compose.yaml (optional)
- runbook: env vars, mounted paths, log path
- health check command

### Phase 2.2 Operational Hardening
- JSON‑only logs
- log rotation strategy
- runtime resource caps
- kill switch / safe shutdown
- configuration version printing

---

## 10) Integration (Phase 3 — Adapters)

Only after Phase 1 (core trust) + Phase 2 (deployment) are stable.

### Adapter Rules (must follow)
- Adapter never reads policy
- Adapter never verifies signature
- Adapter never decides allow/deny
- Adapter enforces runtime constraints: timeouts, memory, filesystem root

### Recommended adapter sequence
1) **CEP Adapter (AE/Premiere)** — constrained JSX calls
2) **Blender Adapter** — allowlisted `bpy.ops` only
3) **Nuke Adapter** — allowlisted node graph ops

---

## 11) Evidence & Compliance (Enterprise Narrative)

What you can credibly claim after Phase 1.4:
- cryptographic authenticity for actions
- replay protection
- policy integrity (signed)
- policy anti‑rollback (version binding)
- controller integrity (manifest)
- audit tamper detection
- CI enforcement of invariants

This is your **enterprise trust stack**.

---

## 12) “Do Not Break These” Rules (Red Lines)
1) Never allow unsigned execution in production mode  
2) Never run without deny‑by‑default policy  
3) Never let adapters accept actions without controller validation  
4) Never let policy load without signature verification (strict default)  
5) Never remove audit hash chaining  
6) Never relax exit codes to “soft warnings”  
7) Never ship without CI invariants passing  

---

## 13) The Exact Next Step (You Are Here)
You have completed:
- Phase 1.1 CI invariants
- Phase 1.2 key lifecycle
- Phase 1.3 controller integrity

**Next:** Phase 1.4 Policy Version Binding.

### Your deliverables for Phase 1.4
- policy.json includes `version` + `createdAt` (and optional env)
- signature binds those fields
- `policy.state.json` monotonic guard implemented
- tests added for rollback/regression and resign requirements
- README updated to document policy lifecycle

---

## 14) Completion Definition (“End State”)
Sentinel is “complete” for enterprise beta when:
- Phase 1.4 is shipped and invariant‑tested
- Docker on‑prem package exists
- One production adapter exists (CEP or Blender)
- A demo can show:
  - attempted delete blocked
  - replay blocked
  - tampered policy blocked
  - audit tamper detected
  - integrity strict mode blocks modified controller

---

## 15) Appendix — Terminology
- **Proposal:** Signed JSON requested action.
- **Policy:** Deny‑by‑default allowlist ruleset.
- **Adapter:** Runtime execution module (hands).
- **Audit log:** Append‑only evidence ledger (hash‑chained).
- **Integrity manifest:** Known‑good hashes of controller files.
- **Invariant:** A security rule that must never regress.

---

## 16) Appendix — Recommended Document Set
- `docs/LetterBlack_Sentinel_OpenBook.md` (this)
- `docs/Threat_Model.md`
- `docs/Command_Spec.md`
- `docs/Policy_Spec.md`
- `docs/Audit_Spec.md`
- `docs/Deployment_Runbook.md`
- `docs/Enterprise_Whitepaper.md` (external)

---

**End of OpenBook**
