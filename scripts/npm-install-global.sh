#!/usr/bin/env bash
# Cài nhanh stali-cli từ npm (prebuilt dist — không cần Bun build)
set -euo pipefail

VERSION="${STALI_CLI_VERSION:-latest}"
SPEC="stali-cli@${VERSION}"

echo "> npm install -g ${SPEC} (prebuilt, --no-fund --no-audit)…"
npm install -g "${SPEC}" --no-fund --no-audit --loglevel="${NPM_CONFIG_LOGLEVEL:-error}"

if command -v stali >/dev/null 2>&1; then
  echo "> OK: $(stali --version 2>/dev/null || echo stali-cli)"
  echo "> Chạy: stali --help"
else
  echo "> Cài xong. Thêm npm global bin vào PATH nếu chưa có:"
  npm bin -g 2>/dev/null || true
fi
