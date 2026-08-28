#!/usr/bin/env bash
# Mẫu CI gate — fail khi app AI chưa trỏ Stali (cần stali-cli trong PATH).
# Dùng: bash scripts/examples/shell/doctor-strict-ci.sh
# Hoặc copy vào pipeline: doctor --strict --tools-only --json | jq -e '.meta.schemaVersion == 2'
set -euo pipefail

if ! command -v stali >/dev/null 2>&1; then
  echo "❌ stali CLI chưa cài — npm i -g stali-cli@latest"
  exit 1
fi

OUT="${STALI_DOCTOR_STRICT_JSON:-/tmp/stali-doctor-strict.json}"
if ! stali doctor --strict --tools-only --json >"$OUT"; then
  echo "❌ stali doctor --strict thất bại"
  if command -v jq >/dev/null 2>&1; then
    jq -r '.pendingGateway // [] | join(", ")' "$OUT" 2>/dev/null \
      | xargs -I{} sh -c 'test -n "{}" && echo "   Gateway chờ: {}"'
  fi
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  jq -e '.meta.schemaVersion == 2' "$OUT" >/dev/null
fi

echo "✓ stali doctor --strict OK ($(wc -c <"$OUT" | tr -d ' ') bytes JSON)"
exit 0
