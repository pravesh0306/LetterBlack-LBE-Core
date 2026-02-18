# LetterBlack Sentinel Deployment Runbook

## Scope
Phase 2.1 on-prem container packaging for CLI-first operation.

## Image Build
```bash
docker build -t letterblack-sentinel:local .
```

## Required Runtime Mounts
- `/app/config` (rw): `policy.default.json`, `policy.sig.json`, `keys.json`, optional `integrity.manifest.json`
- `/app/data` (rw): `nonce.db.json`, `rate-limit.db.json`, `audit.log.jsonl`, `policy.state.json`
- `/app/keys` (ro recommended): `secret.key` (needed only for `policy-sign`)

## One-Shot Commands
Health:
```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp \
  -v ${PWD}/config:/app/config:rw \
  -v ${PWD}/data:/app/data:rw \
  -v ${PWD}/keys:/app/keys:ro \
  letterblack-sentinel:local health --json true
```

Verify:
```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp \
  -v ${PWD}/config:/app/config:rw \
  -v ${PWD}/data:/app/data:rw \
  -v ${PWD}/keys:/app/keys:ro \
  -v ${PWD}/examples:/app/examples:ro \
  letterblack-sentinel:local verify --in /app/examples/proposal.json --keys-store /app/config/keys.json
```

Run:
```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp \
  -v ${PWD}/config:/app/config:rw \
  -v ${PWD}/data:/app/data:rw \
  -v ${PWD}/keys:/app/keys:ro \
  -v ${PWD}/examples:/app/examples:ro \
  letterblack-sentinel:local run --in /app/examples/proposal.json --keys-store /app/config/keys.json
```

## Controller Integrity Strict Mode
Generate manifest:
```bash
docker run --rm -v ${PWD}/config:/app/config:rw letterblack-sentinel:local integrity-generate --out /app/config/integrity.manifest.json
```

Use strict mode:
```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp \
  -v ${PWD}/config:/app/config:rw \
  -v ${PWD}/data:/app/data:rw \
  -v ${PWD}/keys:/app/keys:ro \
  -v ${PWD}/examples:/app/examples:ro \
  letterblack-sentinel:local verify \
    --in /app/examples/proposal.json \
    --keys-store /app/config/keys.json \
    --integrity-strict \
    --integrity-manifest /app/config/integrity.manifest.json
```

## Policy Lifecycle
After editing policy:
```bash
docker run --rm \
  -v ${PWD}/config:/app/config:rw \
  -v ${PWD}/keys:/app/keys:ro \
  letterblack-sentinel:local policy-sign --config /app/config/policy.default.json --policy-sig /app/config/policy.sig.json
```

## Logging Standard
- All command outputs are structured JSON.
- Persist evidence in `/app/data/audit.log.jsonl`.
- Verify tamper evidence regularly:
```bash
docker run --rm -v ${PWD}/data:/app/data:rw letterblack-sentinel:local audit-verify --audit /app/data/audit.log.jsonl
```
