#!/usr/bin/env node
/**
 * npm postinstall — prebuilt dist, không build. Ghi install-mode npm-global.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const distEntry = path.join(root, "dist", "index.js");

if (!fs.existsSync(distEntry)) {
  console.warn("[stali-cli] Thiếu dist/index.js — cài lại hoặc build từ source.");
  process.exit(0);
}

const home = process.env.STALI_HOME || path.join(os.homedir(), ".stali");
const version = require(path.join(root, "package.json")).version;

try {
  fs.mkdirSync(home, { recursive: true });
  const marker = {
    mode: "npm-global",
    version,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(home, "install-mode.json"), JSON.stringify(marker, null, 2) + "\n");
} catch {
  /* non-fatal */
}

if (process.env.STALI_POSTINSTALL_QUIET === "1" || process.env.CI === "true") {
  process.exit(0);
}

// Dev checkout (bun install) — không spam; chỉ hiện khi cài từ npm registry
const isDevCheckout = fs.existsSync(path.join(root, "src", "index.ts"));
if (isDevCheckout && process.env.FORCE_STALI_POSTINSTALL !== "1") {
  process.exit(0);
}

// Gợi ý ngắn sau cài npm (không spam fund/audit — package không có runtime deps)
process.stderr.write(
  `\n✅ stali-cli v${version} (prebuilt, 0 npm deps)\n` +
    "   stali init -k sk-...         # auth + gateway auto + check\n" +
    "   stali gw                     # auto khi đã có key (hoặc: stali gw auto)\n" +
    "   stali gw plan --json         # kế hoạch cài gateway\n" +
    "   stali telemetry on           # opt-in telemetry ẩn danh\n" +
    "   stali --help\n\n"
);
