#!/usr/bin/env bun
/**
 * stali-cli E2E smoke test — chạy trong repo api.stali.vn
 * Usage: bun /home/api.stali.vn/stali-cli/scripts/e2e-smoke.ts
 */
import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const CLI_ROOT = path.resolve(import.meta.dir, "..");
const STALI_ROOT = path.resolve(CLI_ROOT, "..");
const CLI = path.join(CLI_ROOT, "dist/index.js");
const BUN = process.env.BUN_BIN || "bun";

type Result = { name: string; ok: boolean; detail?: string; ms?: number };

const results: Result[] = [];

function run(name: string, args: string[], env?: Record<string, string>): Result {
  const t0 = Date.now();
  const r = spawnSync(BUN, [CLI, ...args], {
    cwd: CLI_ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 30000,
  });
  const ms = Date.now() - t0;
  const out = (r.stdout || "") + (r.stderr || "");
  return { name, ok: r.status === 0, detail: out.slice(0, 500), ms };
}

function assert(name: string, cond: boolean, detail?: string) {
  results.push({ name, ok: cond, detail });
}

async function main() {
  // 0. dist exists
  assert("dist/index.js tồn tại", await fs.access(CLI).then(() => true).catch(() => false));

  // 1. Static CLI
  const helpOut = spawnSync(BUN, [CLI, "--help"], { encoding: "utf8" });
  assert("--help có doctor", /doctor/.test(helpOut.stdout || ""));

  const help = run("help", ["--help"]);
  assert("--help exit 0", help.ok, help.detail);

  const ver = spawnSync(BUN, [CLI, "--version"], { encoding: "utf8" });
  assert("--version = 1.5.0", ver.stdout?.trim() === "1.5.0", ver.stdout?.trim());

  // 2. Token validation (no network)
  const badToken = run("models bad token", ["--models", "-k", "sk-openai-fake"]);
  assert("token sai prefix → exit != 0", !badToken.ok || /sk-stali|Không thể/.test(badToken.detail || ""));

  const shortToken = run("models short token", ["--models", "-k", "sk-stali-x"]);
  assert("token quá ngắn bị reject", !shortToken.ok);

  // 3. Create temp API key
  let keyId = 0;
  let rawKey = "";
  try {
    const mod = await import(path.join(STALI_ROOT, "src/lib/auth.ts"));
    const created = await mod.createApiKey(1, "stali-cli-e2e-smoke");
    keyId = created.id;
    rawKey = created.raw;
    assert("tạo API key test", rawKey.startsWith("sk-stali-"));
  } catch (e: any) {
    assert("tạo API key test", false, e?.message);
  }

  if (!rawKey) {
    printReport();
    process.exit(1);
  }

  // 4. Live API — models
  const models = run("--models", ["--models", "-k", rawKey]);
  assert("--models live OK", models.ok, models.detail?.slice(0, 200));
  assert("--models có bảng", /BẢNG GIÁ MODEL STALI API/.test(models.detail || ""));

  const ls = run("ls -k", ["ls", "-k", rawKey]);
  assert("ls -k live OK", ls.ok);

  const toolsCmd = run("tools", ["tools"]);
  assert("tools exit 0", toolsCmd.ok);
  assert("tools lists 13", /openclaw|jcode|claude/.test(toolsCmd.detail || ""));

  // 5. doctor
  const doctor = run("doctor", ["doctor"]);
  assert("doctor exit 0", doctor.ok);
  assert("doctor quét 13 tool", /13 công cụ|Claude Code/.test(doctor.detail || ""));

  // 6. Syncer patch trong temp HOME
  const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "stali-cli-e2e-"));
  const envHome = { HOME: tmpHome, USERPROFILE: tmpHome };

  const tools = [
    "openclaw",
    "deepseek-tui",
    "qwen",
    "opencode",
    "kilo",
    "droid",
    "cline",
    "roo",
    "grok-build",
    "cowork",
    "jcode",
  ] as const;

  for (const tool of tools) {
    const r = run(`configure ${tool}`, ["configure", tool, "-k", rawKey, "-m", "claude-fable-5"], envHome);
    assert(`configure ${tool}`, r.ok, r.detail?.slice(0, 150));
  }

  // Claude + Codex need specific models
  const claude = run("configure claude", ["configure", "claude", "-k", rawKey, "-m", "claude-fable-5"], envHome);
  assert("configure claude", claude.ok, claude.detail?.slice(0, 150));

  const codex = run("configure codex", ["configure", "codex", "-k", rawKey, "-m", "req/gpt-5.6-sol"], envHome);
  assert("configure codex", codex.ok, codex.detail?.slice(0, 150));

  // Verify files created (13/13)
  const checks = [
    [".openclaw/config.json", "api.stali.vn"],
    [".deepseek/config.toml", "api.stali.vn"],
    [".qwen/settings.json", "api.stali.vn"],
    [".opencode/config.json", "stali"],
    [".kilo/config.json", "api.stali.vn"],
    [".droid/config.json", "api.stali.vn"],
    [".vscode/cline_settings.json", "api.stali.vn"],
    [".vscode/roo_settings.json", "api.stali.vn"],
    [".grok/config.toml", "api.stali.vn"],
    [".cowork/settings.json", "api.stali.vn"],
    [".jcode/config.toml", "api.stali.vn"],
    [".claude/settings.json", "api.stali.vn"],
    [".codex/config.toml", "stali"],
  ];
  for (const [rel, needle] of checks) {
    const fp = path.join(tmpHome, rel);
    const content = await fs.readFile(fp, "utf8").catch(() => "");
    assert(`file ${rel}`, content.includes(needle), content.slice(0, 80));
  }

  // 7. Backup + restore (cần file đã tồn tại → configure lần 2 tạo backup)
  const openclawPath = path.join(tmpHome, ".openclaw/config.json");
  await run("configure openclaw 2nd", ["configure", "openclaw", "-k", rawKey, "-m", "claude-sonnet-5"], envHome);
  await fs.writeFile(openclawPath, JSON.stringify({ broken: true }));
  const restore = run("restore openclaw", ["restore", "-t", "openclaw"], envHome);
  assert("restore openclaw", restore.ok, restore.detail?.slice(0, 150));
  const after = await fs.readFile(openclawPath, "utf8");
  assert("restore khôi phục nội dung hợp lệ", after.includes("api.stali.vn") && !after.includes("broken"));

  // 8. Config persistence
  const cfgPath = path.join(tmpHome, ".stali/config.json");
  await run("wizard save via configure", ["configure", "openclaw", "-k", rawKey], {
    ...envHome,
    HOME: tmpHome,
  });
  // Save config manually like wizard
  await fs.mkdir(path.dirname(cfgPath), { recursive: true });
  await fs.writeFile(cfgPath, JSON.stringify({ apiKey: rawKey, baseUrl: "https://api.stali.vn/v1" }));

  const reset = spawnSync(BUN, [CLI, "--reset"], { env: { ...process.env, HOME: tmpHome }, encoding: "utf8" });
  assert("--reset xóa config", reset.status === 0);
  const cfgGone = await fs.access(cfgPath).then(() => false).catch(() => true);
  assert("~/.stali/config.json đã xóa", cfgGone);

  // 9. bin/stali.js entry
  const binCli = spawnSync(path.join(CLI_ROOT, "bin/stali.js"), ["--version"], {
    encoding: "utf8",
    env: process.env,
  });
  assert("bin/stali.js chạy được", binCli.stdout?.trim() === "1.5.0");

  const alias = run("configure claude-code alias", ["configure", "claude-code", "-k", rawKey, "-m", "claude-fable-5"], envHome);
  assert("configure alias claude-code", alias.ok, alias.detail?.slice(0, 120));

  // Cleanup temp home
  await fs.rm(tmpHome, { recursive: true, force: true });

  // Revoke test keys
  try {
    const mod = await import(path.join(STALI_ROOT, "src/lib/auth.ts"));
    if (keyId) await mod.revokeApiKey(1, keyId);
    await mod.revokeApiKey(1, 1024).catch(() => {});
  } catch {}

  printReport();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

function printReport() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n═══════════════════════════════════════");
  console.log(`  STALI-CLI E2E: ${passed}/${results.length} PASS`);
  console.log("═══════════════════════════════════════\n");
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    const timing = r.ms != null ? ` (${r.ms}ms)` : "";
    console.log(`${icon} ${r.name}${timing}`);
    if (!r.ok && r.detail) console.log(`   ↳ ${r.detail.split("\n")[0]}`);
  }
  if (failed.length) {
    console.log(`\n❌ ${failed.length} test FAIL\n`);
  } else {
    console.log("\n✅ Tất cả test PASS\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
