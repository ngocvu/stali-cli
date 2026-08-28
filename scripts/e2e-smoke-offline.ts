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

  const removed = run(["plugins", "doctor", "--json"]);
  assert("plugins doctor removed exit 2", removed.status === 2);

  const checkTools = run(["check", "--tools-only", "--json"]);
  assert("check --tools-only --json", checkTools.status === 0 || checkTools.status === 1);
  if (checkTools.status === 0 || checkTools.status === 1) {
    try {
      const parsed = JSON.parse(checkTools.stdout || "{}");
      assert("check JSON has scope", parsed.scope === "tools");
    } catch {
      assert("check JSON parseable", false, "invalid JSON");
    }
  }

  const checkConflict = run(["check", "--tools-only", "--plugins-only"]);
  assert("check conflicting flags exit 1", checkConflict.status === 1);

  const wizardHelp = run(["wizard", "--help"]);
  assert("wizard --help exit 0", wizardHelp.status === 0);

  const subBundle = await fs.readFile(path.join(CLI_ROOT, "dist/subcommand-cli.js"), "utf8");
  assert(
    "subcommand bundle no wizard ref",
    !subBundle.includes("Wizard-") && !subBundle.includes("wizard-launcher")
  );

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(`${icon} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
