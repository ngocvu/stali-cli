#!/usr/bin/env bash
# Mẫu git pre-commit — kiểm tra gateway Stali (cần stali-cli trong PATH).
# Cài: cp scripts/examples/git-hooks/pre-commit-stali-doctor.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
set -euo pipefail

if ! command -v stali >/dev/null 2>&1; then
  echo "○ skip: stali CLI chưa cài (npm i -g stali-cli)"
  exit 0
fi

if ! stali doctor --strict --tools-only --json >/tmp/stali-pre-commit-doctor.json 2>/dev/null; then
  echo "❌ stali doctor --strict thất bại — app chưa trỏ Stali."
  echo "   Chạy: stali gw auto   hoặc   stali doctor"
  if command -v jq >/dev/null 2>&1; then
    jq -r '.pendingGateway // [] | join(", ")' /tmp/stali-pre-commit-doctor.json 2>/dev/null \
      | xargs -I{} sh -c 'test -n "{}" && echo "   Gateway chờ: {}"'
  fi
  exit 1
fi

echo "✓ stali doctor --strict OK"
exit 0
