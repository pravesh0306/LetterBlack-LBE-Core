# Phase 2 Ops Checklist

## Pre-Deploy
- [ ] Build image from `deploy/docker/Dockerfile`
- [ ] Run smoke test: `docker run --rm letterblack-sentinel:local help`
- [ ] Run isolation validation script
- [ ] Confirm no secrets are copied into image layers

## Runtime Hardening
- [ ] Container runs as non-root user
- [ ] Root filesystem is read-only
- [ ] `/app/config` mounted read-only
- [ ] `/app/data` mounted read-write
- [ ] `/tmp` mounted as tmpfs

## Isolation Verification
- [ ] `touch /app/forbidden.txt` fails
- [ ] `touch /app/config/forbidden.txt` fails
- [ ] `touch /app/data/ok.txt` succeeds

## Persistence Verification
- [ ] Write marker under `/app/data`
- [ ] Restart container
- [ ] Marker remains present

## CI Governance
- [ ] Workflow `Phase2 Docker Validation` runs on push to `main`
- [ ] Workflow runs on pull request to `main`
- [ ] Branch protection requires this status check
- [ ] Merge blocked if Docker build or isolation checks fail

## Post-Deploy
- [ ] Run `health --json true` inside container
- [ ] Run `audit-verify` against persisted audit log
- [ ] Archive deployment evidence (build log + validation output)
