#!/usr/bin/env bash
# stali-cli installer — pin version + optional checksum verify
#
#   curl -fsSL https://api.stali.vn/install/stali-cli.sh | bash
#   STALI_CLI_VERSION=3.6.0 bash scripts/install.sh
#
# Env:
#   STALI_CLI_VERSION     — tag hoặc branch (mặc định: latest từ package.json repo)
#   STALI_CLI_SHA256      — sha256 của GitHub zip (tùy chọn, verify sau curl)
#   STALI_CLI_STANDALONE   — 1 = tải binary từ GitHub Release (cần STALI_CLI_VERSION)
#   STALI_CLI_REPO, STALI_CLI_BRANCH, STALI_HOME, STALI_CLI_INSTALL_DIR

set -euo pipefail

METHOD="${STALI_CLI_INSTALL_METHOD:-git}"
NPM_PKG="stali-cli"
REPO="${STALI_CLI_REPO:-https://github.com/ngocvu/stali-cli.git}"
BRANCH="${STALI_CLI_BRANCH:-main}"
VERSION="${STALI_CLI_VERSION:-}"
EXPECTED_SHA="${STALI_CLI_SHA256:-}"
STALI_HOME="${STALI_HOME:-$HOME/.stali}"
INSTALL_ROOT="${STALI_CLI_INSTALL_DIR:-$STALI_HOME/cli}"
STALI_BIN="$STALI_HOME/bin"
LEGACY_SHARE="${XDG_DATA_HOME:-$HOME/.local/share}/stali-cli"

log() { printf '> %s\n' "$*"; }
die() { printf '✖ %s\n' "$*" >&2; exit 1; }

need_bun() {
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$STALI_BIN:$PATH"
  if command -v bun >/dev/null 2>&1; then
    return 0
  fi
  log "Bun runtime chưa có — cài Bun (https://bun.sh)…"
  curl -fsSL https://bun.sh/install | bash
  export PATH="$BUN_INSTALL/bin:$STALI_BIN:$PATH"
  command -v bun >/dev/null 2>&1 || die "Không cài được Bun."
}

migrate_legacy() {
  if [[ -d "$LEGACY_SHARE" && ! -d "$INSTALL_ROOT" ]]; then
    log "Migrate legacy install: $LEGACY_SHARE → $INSTALL_ROOT"
    mkdir -p "$STALI_HOME"
    mv "$LEGACY_SHARE" "$INSTALL_ROOT"
  fi
  rm -f "$HOME/.bun/bin/stali" 2>/dev/null || true
}

register_global_stali() {
  local root="$1"
  local shell_shim="$root/bin/stali"
  local stali_js="$root/bin/stali.js"
  mkdir -p "$STALI_BIN"
  if [[ -f "$shell_shim" ]]; then
    log "Cài wrapper: $STALI_BIN/stali (từ bin/stali)"
    cp "$shell_shim" "$STALI_BIN/stali"
    chmod +x "$STALI_BIN/stali"
    return 0
  fi
  [[ -f "$stali_js" ]] || die "Thiếu bin/stali hoặc bin/stali.js"
  local bun_bin
  bun_bin="$(command -v bun)"
  log "Cài wrapper: $STALI_BIN/stali (bun + stali.js)"
  cat >"$STALI_BIN/stali" <<EOF
#!/usr/bin/env bash
exec "$bun_bin" "$stali_js" "\$@"
EOF
  chmod +x "$STALI_BIN/stali"
}

install_standalone_binary() {
  local version="${VERSION:-}"
  [[ -n "$version" ]] || die "STALI_CLI_STANDALONE=1 cần STALI_CLI_VERSION=vX.Y.Z"
  [[ "$version" =~ ^v ]] || version="v${version}"
  local repo_slug="ngocvu/stali-cli"
  if [[ "$REPO" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
    repo_slug="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  fi
  local os arch asset
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$arch" in
    x86_64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
  esac
  case "$os" in
    linux) asset="stali-standalone-linux-${arch}" ;;
    darwin) asset="stali-standalone-darwin-${arch}" ;;
    *) die "Standalone chưa hỗ trợ OS: $os" ;;
  esac
  local url="https://github.com/${repo_slug}/releases/download/${version}/${asset}"
  mkdir -p "$STALI_BIN"
  log "Tải standalone binary: ${url}"
  if ! curl -fsSL "$url" -o "$STALI_BIN/stali"; then
    if [[ "$asset" != "stali-standalone" && "$os" == "linux" && "$arch" == "x64" ]]; then
      url="https://github.com/${repo_slug}/releases/download/${version}/stali-standalone"
      log "Fallback legacy asset: ${url}"
      curl -fsSL "$url" -o "$STALI_BIN/stali" || die "Không tải được standalone"
    else
      die "Không tải được ${asset}"
    fi
  fi
  chmod +x "$STALI_BIN/stali"
  mkdir -p "$STALI_HOME"
  cat >"$STALI_HOME/install-mode.json" <<EOF
{
  "mode": "standalone",
  "version": "${version}",
  "asset": "${asset}"
}
EOF
  export PATH="$STALI_BIN:$PATH"
  command -v stali >/dev/null 2>&1 || die "Không cài được stali standalone"
  log "Standalone OK: $(stali --version 2>/dev/null || true)"
}

verify_installed_version() {
  local expected="$1"
  [[ -n "$expected" ]] || return 0
  local got
  got="$(cd "$INSTALL_ROOT" && node -p "require('./package.json').version" 2>/dev/null || true)"
  [[ "$got" == "$expected" ]] || die "Version mismatch: expected $expected got ${got:-unknown}"
  log "Verified package version: $got"
}

verify_checksums_file() {
  [[ -f "$INSTALL_ROOT/dist/checksums.json" ]] || return 0
  log "Verify dist/checksums.json…"
  cd "$INSTALL_ROOT"
  node <<'NODE'
const fs = require("fs");
const crypto = require("crypto");
const manifest = JSON.parse(fs.readFileSync("dist/checksums.json", "utf8"));
let ok = true;
for (const [rel, expected] of Object.entries(manifest.files || {})) {
  const p = rel;
  if (!fs.existsSync(p)) {
    console.error("Missing:", p);
    ok = false;
    continue;
  }
  const hash = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  if (hash !== expected) {
    console.error("Checksum mismatch:", p);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log("Checksums OK (" + Object.keys(manifest.files).length + " files)");
NODE
}

install_from_npm() {
  need_bun
  local spec="$NPM_PKG"
  [[ -n "$VERSION" ]] && spec="${NPM_PKG}@${VERSION}"
  log "Cài ${spec} từ npm…"
  bun install -g "$spec"
  local npm_root="$HOME/.bun/install/global/node_modules/stali-cli"
  if [[ -d "$npm_root" ]]; then
    register_global_stali "$npm_root"
  fi
}

fetch_source() {
  rm -rf "$INSTALL_ROOT"
  local ref="${VERSION:-$BRANCH}"
  if command -v git >/dev/null 2>&1; then
    log "Clone ${REPO} (ref=${ref})…"
    if [[ -n "$VERSION" && "$VERSION" =~ ^v?[0-9] ]]; then
      git clone --depth 1 --branch "$VERSION" "$REPO" "$INSTALL_ROOT" 2>/dev/null \
        || git clone --depth 1 "$REPO" "$INSTALL_ROOT" && cd "$INSTALL_ROOT" && git checkout "$VERSION"
    else
      git clone --depth 1 --branch "$ref" "$REPO" "$INSTALL_ROOT"
    fi
    return 0
  fi
  local zip_url stage extracted branch_name
  if [[ "$REPO" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    branch_name="${ref#v}"
    if [[ -n "$VERSION" && "$VERSION" =~ ^v?[0-9] ]]; then
      zip_url="https://github.com/${BASH_REMATCH[1]}/${BASH_REMATCH[2]}/archive/refs/tags/${VERSION}.zip"
    else
      zip_url="https://github.com/${BASH_REMATCH[1]}/${BASH_REMATCH[2]}/archive/refs/heads/${ref}.zip"
    fi
  else
    die "Không suy ra URL zip GitHub từ STALI_CLI_REPO=$REPO"
  fi
  stage="$(mktemp -d)"
  trap 'rm -rf "$stage"' RETURN
  log "Tải zip: ${zip_url}"
  curl -fsSL "$zip_url" -o "$stage/repo.zip"
  if [[ -n "$EXPECTED_SHA" ]]; then
    echo "${EXPECTED_SHA}  repo.zip" | (cd "$stage" && sha256sum -c -) || die "SHA256 zip không khớp"
    log "SHA256 zip OK"
  fi
  unzip -q "$stage/repo.zip" -d "$stage"
  extracted="$(find "$stage" -maxdepth 1 -type d -name 'stali-cli-*' | head -n1)"
  [[ -n "$extracted" ]] || die "Zip không đúng cấu trúc"
  mkdir -p "$STALI_HOME"
  mv "$extracted" "$INSTALL_ROOT"
  [[ -f "$INSTALL_ROOT/package.json" ]] || die "Thiếu package.json"
}

install_from_git() {
  need_bun
  migrate_legacy
  log "Stali home: ${STALI_HOME}"
  log "Install dir: ${INSTALL_ROOT}"
  fetch_source
  cd "$INSTALL_ROOT"
  verify_installed_version "${VERSION#v}"
  log "Build stali-cli…"
  bun install
  bun run build
  verify_checksums_file
  [[ -f bin/stali.js ]] || die "Thiếu bin/stali.js"
  [[ -f dist/index.js ]] || die "Thiếu dist/index.js"
  [[ -f dist/checksums.json ]] || log "Warning: dist/checksums.json không có"
  register_global_stali "$INSTALL_ROOT"
}

main() {
  if [[ "${STALI_CLI_STANDALONE:-0}" == "1" ]]; then
    install_standalone_binary
    log "Done (standalone). Chạy: stali"
    exit 0
  fi
  case "$METHOD" in
    npm) install_from_npm ;;
    git) install_from_git ;;
    auto)
      if install_from_npm; then :; else
        log "npm failed — thử GitHub…"
        install_from_git
      fi
      ;;
    *) die "Unknown STALI_CLI_INSTALL_METHOD=$METHOD" ;;
  esac

  export PATH="$STALI_BIN:$PATH"
  command -v stali >/dev/null 2>&1 || die "stali chưa trong PATH. Thêm: export PATH=\"$STALI_BIN:\$PATH\""

  log "Done. Chạy: stali"
  log "Paths: cli=$INSTALL_ROOT bin=$STALI_BIN"
  stali --version 2>/dev/null || true
  if [[ "${STALI_CLI_NO_RUN:-0}" != "1" ]]; then
    exec stali
  fi
}

main "$@"
