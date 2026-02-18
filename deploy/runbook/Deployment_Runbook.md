# LetterBlack Sentinel Deployment Runbook

## Scope
Phase 2.1 on-prem container packaging for CLI-first operation.

## Image Build
```bash
cd deploy/docker
docker compose build
```

## Required Runtime Mounts
- `/app/config` (rw): `policy.default.json`, `policy.sig.json`, `keys.json`, optional `integrity.manifest.json`
- `/app/data` (rw): `nonce.db.json`, `rate-limit.db.json`, `audit.log.jsonl`, `policy.state.json`
- `/app/keys` (ro recommended): `secret.key` (needed only for `policy-sign`)

## One-Shot Commands
Health:
```bash
cd deploy/docker
docker compose run --rm sentinel health --json true
```

Verify:
```bash
cd deploy/docker
docker compose run --rm sentinel verify --in /app/config/proposal.json --keys-store /app/config/keys.json
```

Run:
```bash
cd deploy/docker
docker compose run --rm sentinel run --in /app/config/proposal.json --keys-store /app/config/keys.json
```

## Controller Integrity Strict Mode
Generate manifest:
```bash
cd deploy/docker
docker compose run --rm sentinel integrity-generate --out /app/config/integrity.manifest.json
```

Use strict mode:
```bash
cd deploy/docker
docker compose run --rm sentinel verify \
    --in /app/config/proposal.json \
    --keys-store /app/config/keys.json \
    --integrity-strict \
    --integrity-manifest /app/config/integrity.manifest.json
```

## Policy Lifecycle
After editing policy:
```bash
cd deploy/docker
docker compose run --rm sentinel policy-sign --config /app/config/policy.default.json --policy-sig /app/config/policy.sig.json
```

## Logging Standard
- All command outputs are structured JSON.
- Persist evidence in `/app/data/audit.log.jsonl`.
- Verify tamper evidence regularly:
```bash
cd deploy/docker
docker compose run --rm sentinel audit-verify --audit /app/data/audit.log.jsonl
```
