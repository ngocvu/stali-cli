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
try {
  fs.mkdirSync(home, { recursive: true });
  const marker = {
    mode: "npm-global",
    version: require(path.join(root, "package.json")).version,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(home, "install-mode.json"), JSON.stringify(marker, null, 2) + "\n");
} catch {
  /* non-fatal */
}
