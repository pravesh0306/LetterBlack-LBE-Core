# Phase 2 Config Reference

## Canonical Paths
- Policy file: `config/policy.default.json`
- Policy signature: `config/policy.sig.json`
- Trusted key store: `config/keys.json`
- Integrity manifest: `config/integrity.manifest.json` (optional unless strict mode)
- Data directory: `data/`

## Required Mount Semantics
- `/app/config`: read-only
- `/app/data`: read-write
- `/app/keys`: read-only (recommended)
- Root filesystem: read-only (`--read-only`)
- Temporary writable area: `--tmpfs /tmp`

## Container Invocation Baseline
```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp \
  -v ${PWD}/config:/app/config:ro \
  -v ${PWD}/data:/app/data:rw \
  -v ${PWD}/keys:/app/keys:ro \
  letterblack-sentinel:local help
```

## Security-Critical CLI Flags
- `--policy-sig <path>`: enforce signed policy
- `--policy-unsigned-ok true`: dev override only (do not use in production)
- `--integrity-strict`: fail closed on integrity mismatch
- `--integrity-manifest <path>`: controller hash manifest path
- `--keys-store <path>`: trusted signer key store

## Data Persistence Contracts
- `data/audit.log.jsonl`: append-only audit evidence
- `data/nonce.db.json`: replay protection store
- `data/rate-limit.db.json`: requester throttle store
- `data/policy.state.json`: policy monotonic state store

## CI Contract
- Workflow file: `.github/workflows/docker-phase2.yml`
- Required status check: `Phase2 Docker Validation`
