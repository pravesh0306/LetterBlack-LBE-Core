# LetterBlack Sentinel On-Prem Runbook

## Scope
Phase 2 container deployment with enforced filesystem isolation and CI gating.

## Canonical Build Source
- Dockerfile: `deploy/docker/Dockerfile`
- Compose file: `deploy/docker/docker-compose.yml`
- CI workflow: `.github/workflows/docker-phase2.yml`
- Isolation validator: `deploy/docker/container-validation.sh`

## Build
```bash
docker build -f deploy/docker/Dockerfile -t letterblack-sentinel:phase2-local .
```

## Smoke Test
```bash
docker run --rm letterblack-sentinel:phase2-local --help || true
```

Expected output includes `USAGE:`.

## Isolation Validation
```bash
bash deploy/docker/container-validation.sh letterblack-sentinel:phase2-local
```

Expected output:
- `✔ Root FS is read-only`
- `✔ Config directory read-only`
- `✔ Data directory writable`

## Compose Repro (Operator Validation)
```bash
docker compose -f deploy/docker/docker-compose.yml build
docker compose -f deploy/docker/docker-compose.yml up -d
docker compose -f deploy/docker/docker-compose.yml exec sentinel sh
```

Inside container:
```sh
touch /app/forbidden.txt      # must fail
touch /app/config/forbidden   # must fail
touch /app/data/ok            # must succeed
```

Exit container:
```sh
exit
docker compose -f deploy/docker/docker-compose.yml down
```

## Runtime Security Invariants
- Container runs as non-root (`node` user).
- Root filesystem is read-only.
- `/app/config` mounted read-only.
- `/app/data` mounted read-write.
- No secrets baked into image.
- Audit/state persistence uses mounted `/app/data`.

## CI Gate Rules
- Trigger: push to `main`, pull_request to `main`.
- Merge should be blocked when:
  - Docker build fails
  - Smoke test fails
  - `container-validation.sh` fails
  - `/app` read-only regression guard fails
