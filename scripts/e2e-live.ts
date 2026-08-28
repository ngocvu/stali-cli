#!/usr/bin/env bun
/**
 * Live E2E — cần STALI_E2E_KEY (sk-stali-...) trỏ api.stali.vn.
 * Không phụ thuộc parent repo api.stali.vn.
 *
 * Usage: STALI_E2E_KEY=sk-stali-... bun scripts/e2e-live.ts
 */
import { spawnSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import pkg from "../package.json" with { type: "json" };

const CLI_ROOT = path.resolve(import.meta.dir, "..");
const CLI = path.join(CLI_ROOT, "dist/index.js");
const BUN = process.env.BUN_BIN || "bun";
const KEY = process.env.STALI_E2E_KEY?.trim();

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function assert(name: string, cond: boolean, detail?: string) {
  results.push({ name, ok: cond, detail });
}

function run(args: string[]) {
  return spawnSync(BUN, [CLI, ...args], {
    cwd: CLI_ROOT,
    encoding: "utf8",
    timeout: 45000,
    env: process.env,
  });
}

async function main() {
  assert("dist/index.js exists", await fs.access(CLI).then(() => true).catch(() => false));

  if (!KEY) {
    console.log("::notice::STALI_E2E_KEY chưa cấu hình — bỏ qua live E2E");
    for (const r of results) {
      console.log(`${r.ok ? "✓" : "✗"} ${r.name}`);
    }
    process.exit(0);
  }

  if (!KEY.startsWith("sk-stali-") || KEY.length < 20) {
    assert("STALI_E2E_KEY format", false, "prefix sk-stali- và đủ dài");
    printSummary();
    process.exit(1);
  }

  const login = run(["auth", "login", "-k", KEY]);
  assert("auth login exit 0", login.status === 0, (login.stderr || login.stdout || "").slice(0, 200));

  const scan = run(["scan", "--json"]);
  assert("scan --json exit 0", scan.status === 0);
  if (scan.status === 0) {
    try {
      const parsed = JSON.parse(scan.stdout || "{}");
      assert("scan JSON has tools array", Array.isArray(parsed.tools));
      assert("scan JSON schemaVersion", parsed.schemaVersion === 2);
    } catch {
      assert("scan JSON parseable", false);
    }
  }

  const status = run(["status", "--json", "--online"]);
  assert("status --json --online exit 0|1", status.status === 0 || status.status === 1);
  if (status.stdout) {
    try {
      const parsed = JSON.parse(status.stdout);
      assert("status JSON has ok", typeof parsed.ok === "boolean");
    } catch {
      assert("status JSON parseable", false);
    }
  }

  const setup = run(["setup", "--json", "-k", KEY, "--skip-configure"]);
  assert("setup --json skip-configure exit 0|1", setup.status === 0 || setup.status === 1);
  if (setup.stdout) {
    try {
      const parsed = JSON.parse(setup.stdout);
      assert("setup JSON has durationMs", typeof parsed.durationMs === "number");
      assert("setup JSON has nextCommand", typeof parsed.nextCommand === "string");
      assert("setup JSON schemaVersion", parsed.schemaVersion === 2);
      assert("setup JSON command", parsed.command === "setup");
      assert("setup JSON pendingGateway", Array.isArray(parsed.pendingGateway));
    } catch {
      assert("setup JSON parseable", false);
    }
  }

  const check = run(["check", "--strict", "--tools-only", "--json"]);
  assert("check --strict --tools-only exit 0|1", check.status === 0 || check.status === 1);

  const configGet = run(["config", "get", "base-url"]);
  assert("config get base-url exit 0", configGet.status === 0);
  assert(
    "config get base-url has api.stali",
    /api\.stali\.vn|https:\/\//.test(configGet.stdout || "")
  );

  const configGetJson = run(["config", "get", "base-url", "--json"]);
  assert("config get base-url --json exit 0", configGetJson.status === 0);
  if (configGetJson.stdout) {
    try {
      const parsed = JSON.parse(configGetJson.stdout);
      assert("config get JSON has modelsEndpoint", typeof parsed.modelsEndpoint === "string");
    } catch {
      assert("config get JSON parseable", false);
    }
  }

  const doctorFixDry = run(["doctor", "--fix", "--dry-run", "-k", KEY]);
  assert("doctor --fix --dry-run exit 0", doctorFixDry.status === 0);

  const doctorJson = run(["doctor", "--json"]);
  assert("doctor --json exit 0", doctorJson.status === 0);
  if (doctorJson.stdout) {
    try {
      const parsed = JSON.parse(doctorJson.stdout);
      assert("doctor JSON installedTools", Array.isArray(parsed.installedTools));
    } catch {
      assert("doctor JSON parseable", false);
    }
  }

  const models = run(["ls", "-k", KEY]);
  assert("ls -k live exit 0", models.status === 0);

  printSummary();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
