#!/usr/bin/env bun
/**
 * Build local checkout rồi gắn vào lệnh `stali` trên PATH (npm global).
 * Windows cmd: gõ `stali` là mở TUI bản đang sửa.
 */
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist", "index.js");

function run(cmd: string, args: string[]): number {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

console.log("> bun run build");
if (run("bun", ["run", "build"]) !== 0) {
  process.exit(1);
}
if (!existsSync(dist)) {
  console.error("Thiếu dist/index.js sau build");
  process.exit(1);
}

console.log("> npm install -g . --no-fund --no-audit");
const code = run("npm", ["install", "-g", ".", "--no-fund", "--no-audit"]);
if (code !== 0) process.exit(code);

const check = spawnSync("stali", ["--version"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
const ver = (check.stdout || "").trim();
console.log("");
console.log(`OK. Gõ stali trong cmd (bản local ${ver || "?"}).`);
console.log("Nếu cmd đang mở từ trước: đóng rồi mở cửa sổ mới.");
