#!/usr/bin/env bun
/**
 * Smoke test cho standalone binary từ GitHub Release / build matrix.
 * Usage: STALI_STANDALONE_BIN=dist/stali-standalone-linux-x64 bun scripts/e2e-standalone-smoke.ts
 */
import { spawnSync } from "child_process";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import pkg from "../package.json" with { type: "json" };

const CLI_ROOT = path.resolve(import.meta.dir, "..");
const BIN = process.env.STALI_STANDALONE_BIN?.trim();

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function assert(name: string, cond: boolean, detail?: string) {
  results.push({ name, ok: cond, detail });
}

function resolveBin(): string {
  if (!BIN) return "";
  if (BIN.endsWith(".exe")) return BIN;
  const withExe = `${BIN}.exe`;
  try {
    if (existsSync(withExe)) return withExe;
  } catch {
    /* ignore */
  }
  return BIN;
}

function run(args: string[], timeoutMs = 30_000) {
  const bin = resolveBin();
  return spawnSync(bin, args, {
    cwd: CLI_ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    env: { ...process.env, STALI_SKIP_TELEMETRY_FLUSH: "1" },
    windowsHide: true,
  });
}

async function main() {
  if (!BIN) {
    console.log("○ STALI_STANDALONE_BIN chưa set — bỏ qua standalone smoke");
    process.exit(0);
  }

  const bin = resolveBin();
  const exists = await fs.access(bin).then(() => true).catch(() => false);
  assert("standalone binary exists", exists, bin);
  if (!exists) {
    for (const r of results) {
      console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
    process.exit(1);
  }

  const ver = run(["--version"]);
  assert("--version exit 0", ver.status === 0);
  assert(`--version = ${pkg.version}`, ver.stdout?.trim() === pkg.version, ver.stdout?.trim());

  const help = run(["--help"]);
  assert("--help exit 0", help.status === 0);
  assert("--help user-first", !/^\s+init\s/m.test(help.stdout || ""));

  const doctorJson = run(["doctor", "--json"]);
  assert("doctor --json exit 0", doctorJson.status === 0);
  if (doctorJson.stdout) {
    try {
      const parsed = JSON.parse(doctorJson.stdout);
      assert("doctor JSON pendingGateway", Array.isArray(parsed.pendingGateway));
      assert("doctor JSON schemaVersion", parsed.meta?.schemaVersion === 2);
    } catch {
      assert("doctor JSON parseable", false);
    }
  }

  const suggest = run(["plugins", "suggest", "--json"]);
  assert("plugins suggest --json exit 0", suggest.status === 0);

  const preview = run(
    [
      "plugins",
      "sync",
      "--preview",
      "--json",
      "-k",
      "sk-stali-" + "s".repeat(40),
    ],
    60_000
  );
  assert("plugins sync --preview --json", preview.status === 0 || preview.status === 1);

  const scan = run(["scan", "--json"]);
  assert("scan --json exit 0", scan.status === 0);

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed (standalone: ${path.basename(bin)})`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
