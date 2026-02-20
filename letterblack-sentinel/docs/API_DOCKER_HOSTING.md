# Sentinel API Docker Hosting

## 1) Initialize once

```bash
cd letterblack-sentinel
npm run init
```

## 2) Set API token

Linux/macOS:

```bash
export SENTINEL_API_TOKEN="replace-with-strong-token"
```

PowerShell:

```powershell
$env:SENTINEL_API_TOKEN="replace-with-strong-token"
```

## 3) Start API in Docker

```bash
docker compose up --build -d
```

API listens on `0.0.0.0:8080` (configure with `SENTINEL_API_PORT`).

## 4) Test locally

```bash
curl -H "Authorization: Bearer $SENTINEL_API_TOKEN" \
  http://127.0.0.1:8080/v1/health
```

## 5) Call from another computer on LAN

Replace `<HOST_IP>` with the host machine IP:

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://<HOST_IP>:8080/v1/health
```

## Proposal endpoints

- `POST /v1/verify`
- `POST /v1/dryrun`
- `POST /v1/run`

Body format:

```json
{
  "proposal": {
    "id": "RUN_SHELL",
    "commandId": "550e8400-e29b-41d4-a716-446655440000",
    "requesterId": "agent:gpt",
    "sessionId": "session:test",
    "timestamp": 1771287440,
    "nonce": "bf5ce1dcf5f77355625f62b0e12f6c7ebe00dac33b507a734e050749f6d5b91d",
    "requires": ["shell:execute"],
    "risk": "LOW",
    "payload": {
      "adapter": "noop",
      "cmd": "echo",
      "args": ["hello"],
      "cwd": "/app"
    },
    "signature": {
      "alg": "ed25519",
      "keyId": "agent:gpt-v1-2026Q1",
      "sig": "<base64-signature>"
    }
  }
}
```
