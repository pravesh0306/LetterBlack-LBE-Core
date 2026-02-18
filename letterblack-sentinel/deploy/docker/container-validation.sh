#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${1:-${LBE_IMAGE:-letterblack-sentinel:phase2-local}}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$TMP_DIR/config" "$TMP_DIR/data" "$TMP_DIR/keys"
echo "{}" > "$TMP_DIR/config/keys.json"
echo "{}" > "$TMP_DIR/config/policy.default.json"

docker run --rm \
  --read-only \
  --tmpfs /tmp \
  -v "$TMP_DIR/config:/app/config:ro" \
  -v "$TMP_DIR/data:/app/data:rw" \
  -v "$TMP_DIR/keys:/app/keys:ro" \
  --entrypoint sh \
  "$IMAGE_TAG" \
  -lc '
    set -eu
    if touch /app/test.txt 2>/dev/null; then
      echo "FAIL: Root filesystem is writable"
      exit 1
    fi
    echo "✔ Root FS is read-only"

    if touch /app/config/test.txt 2>/dev/null; then
      echo "FAIL: /app/config is writable"
      exit 1
    fi
    echo "✔ Config directory read-only"

    touch /app/data/test.txt
    echo "✔ Data directory writable"
  '

echo "✔ Container isolation checks passed"
