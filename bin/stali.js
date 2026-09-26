#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { spawnSync } from "child_process";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const args = process.argv.slice(2);

if (args.length === 1 && (args[0] === "--version" || args[0] === "-V")) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

const distEntry = join(root, "dist", "index.js");
const srcEntry = join(root, "src", "index.ts");

function bunCandidates() {
  const home = os.homedir();
  const list = [
    process.env.BUN_BIN,
    process.platform === "win32" ? join(home, ".bun", "bin", "bun.exe") : join(home, ".bun", "bin", "bun"),
    "bun",
  ].filter(Boolean);
  return [...new Set(list)];
}

function runBun(entry) {
  for (const bun of bunCandidates()) {
    const r = spawnSync(bun, [entry, ...args], {
      stdio: "inherit",
      windowsHide: true,
    });
    if (r.error && (r.error.code === "ENOENT" || r.error.code === "EINVAL")) continue;
    process.exit(r.status ?? 1);
  }
  return false;
}

if (existsSync(distEntry)) {
  if (!runBun(distEntry)) {
    await import(pathToFileURL(distEntry).href);
  }
} else if (existsSync(srcEntry)) {
  if (!runBun(srcEntry)) {
    console.error("stali-cli: cần Bun để chạy. Cài: https://bun.sh");
    console.error("  hoặc: bun run build && npm install -g .");
    process.exit(1);
  }
} else {
  console.error("stali-cli: thiếu dist/index.js — cài lại: npm install -g stali-cli@latest");
  process.exit(1);
}
