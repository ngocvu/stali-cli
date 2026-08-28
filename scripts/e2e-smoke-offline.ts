#!/usr/bin/env bun
/**
 * Offline E2E smoke — không cần network hay api.stali.vn parent repo.
 */
import { spawnSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import pkg from "../package.json" with { type: "json" };

const CLI_ROOT = path.resolve(import.meta.dir, "..");
const CLI = path.join(CLI_ROOT, "dist/index.js");
const BUN = process.env.BUN_BIN || "bun";

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function assert(name: string, cond: boolean, detail?: string) {
  results.push({ name, ok: cond, detail });
}

function run(args: string[]) {
  return spawnSync(BUN, [CLI, ...args], {
    cwd: CLI_ROOT,
    encoding: "utf8",
    timeout: 15000,
  });
}

async function main() {
  assert("dist/index.js exists", await fs.access(CLI).then(() => true).catch(() => false));

  const help = run(["--help"]);
  assert("--help exit 0", help.status === 0);
  assert("--help lists init", /init/.test(help.stdout || ""));

  const ver = run(["--version"]);
  assert(`--version = ${pkg.version}`, ver.stdout?.trim() === pkg.version, ver.stdout?.trim());

  const badToken = run(["--models", "-k", "sk-openai-fake"]);
  assert("bad token prefix rejected", badToken.status !== 0);

  const shortToken = run(["--models", "-k", "sk-stali-x"]);
  assert("short token rejected", shortToken.status !== 0);

  const pluginsInit = run(["plugins", "--init"]);
  assert("plugins --init exit 0", pluginsInit.status === 0);

  const docPlugins = run(["doctor", "--plugins-only", "--json"]);
  assert("doctor --plugins-only --json exit 0|1", docPlugins.status === 0 || docPlugins.status === 1);

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(`${icon} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
