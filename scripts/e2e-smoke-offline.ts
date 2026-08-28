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

function run(args: string[], env?: NodeJS.ProcessEnv, timeoutMs = 15000) {
  return spawnSync(BUN, [CLI, ...args], {
    cwd: CLI_ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    env: env ? { ...process.env, ...env } : process.env,
  });
}

async function main() {
  assert("dist/index.js exists", await fs.access(CLI).then(() => true).catch(() => false));

  const help = run(["--help"]);
  assert("--help exit 0", help.status === 0);
  assert("--help user-first hides init", !/^\s+init\s/m.test(help.stdout || ""));

  const ver = run(["--version"]);
  assert(`--version = ${pkg.version}`, ver.stdout?.trim() === pkg.version, ver.stdout?.trim());

  const badToken = run(["--models", "-k", "sk-openai-fake"]);
  assert("bad token prefix rejected", badToken.status !== 0);

  const shortToken = run(["--models", "-k", "sk-stali-x"]);
  assert("short token rejected", shortToken.status !== 0);

  const pluginsInit = run(["plugins", "--init"]);
  assert("plugins --init exit 0", pluginsInit.status === 0);

  const pluginsSuggest = run(["plugins", "suggest", "--json"]);
  assert("plugins suggest --json exit 0", pluginsSuggest.status === 0);
  if (pluginsSuggest.status === 0) {
    try {
      const parsed = JSON.parse(pluginsSuggest.stdout || "{}");
      assert("plugins suggest JSON has suggestions", Array.isArray(parsed.suggestions));
      assert("plugins suggest JSON schemaVersion", parsed.schemaVersion === 2);
      assert("plugins suggest JSON command", parsed.command === "plugins-suggest");
    } catch {
      assert("plugins suggest JSON parseable", false);
    }
  }

  const pluginsPreview = run([
    "plugins",
    "sync",
    "--preview",
    "--json",
    "-k",
    "sk-stali-" + "p".repeat(40),
  ]);
  assert("plugins sync --preview --json exit 0|1", pluginsPreview.status === 0 || pluginsPreview.status === 1);
  if (pluginsPreview.status === 0) {
    try {
      const parsed = JSON.parse(pluginsPreview.stdout || "{}");
      assert("plugins preview JSON preview flag", parsed.preview === true);
      assert("plugins preview JSON has items", Array.isArray(parsed.items));
      if (parsed.items?.length > 0) {
        assert("plugins preview item has preview field", typeof parsed.items[0].preview === "object");
      }
    } catch {
      assert("plugins preview JSON parseable", false);
    }
  }

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
      assert("check JSON pendingGateway", Array.isArray(parsed.pendingGateway));
      assert(
        "check JSON pendingGatewayCount",
        typeof parsed.pendingGatewayCount === "number"
      );
      assert("check JSON schemaVersion", parsed.schemaVersion === 2);
    } catch {
      assert("check JSON parseable", false, "invalid JSON");
    }
  }

  const checkConflict = run(["check", "--tools-only", "--plugins-only"]);
  assert("check conflicting flags exit 1", checkConflict.status === 1);

  const wizardHelp = run(["wizard", "--help"]);
  assert("wizard --help exit 0", wizardHelp.status === 0);

  const subBundle = await fs.readFile(
    path.join(CLI_ROOT, "dist/runtime/subcommand-cli.js"),
    "utf8"
  );
  assert(
    "subcommand bundle no wizard ref",
    !subBundle.includes("Wizard-") && !subBundle.includes("wizard-launcher")
  );

  assert("bin/stali wrapper exists", await fs.access(path.join(CLI_ROOT, "bin/stali")).then(() => true).catch(() => false));

  const checksums = await fs
    .access(path.join(CLI_ROOT, "dist/checksums.json"))
    .then(() => true)
    .catch(() => false);
  assert("dist/checksums.json exists", checksums);

  const compDoctor = run(["completion", "--doctor", "--json"]);
  assert("completion --doctor --json", compDoctor.status === 0 || compDoctor.status === 1);

  const compUninstall = run(["completion", "uninstall", "fish"]);
  assert("completion uninstall exit 0", compUninstall.status === 0);

  const wizardOnlyDir = path.join(CLI_ROOT, "dist/runtime/wizard-only");
  assert(
    "wizard-only dir exists",
    await fs.access(wizardOnlyDir).then(() => true).catch(() => false)
  );

  const watchSmoke = run(["doctor", "--tools-only", "--watch", "--max-cycles", "2", "-i", "1", "--json"]);
  assert("doctor watch --max-cycles exit 0|1", watchSmoke.status === 0 || watchSmoke.status === 1);
  assert(
    "doctor watch emits snapshot",
    (watchSmoke.stdout || "").includes("doctor.snapshot")
  );

  const tmpHomeAll = path.join(CLI_ROOT, ".e2e-home-all");
  await fs.mkdir(tmpHomeAll, { recursive: true });
  const installAll = run(["completion", "install", "--all"], { HOME: tmpHomeAll });
  assert("completion install --all exit 0", installAll.status === 0);
  await fs.rm(tmpHomeAll, { recursive: true, force: true }).catch(() => {});

  const tmpHomeFish = path.join(CLI_ROOT, ".e2e-home-fish");
  await fs.mkdir(tmpHomeFish, { recursive: true });
  const installFish = run(["completion", "install", "fish"], { HOME: tmpHomeFish });
  assert("completion install fish (implicit) exit 0", installFish.status === 0);
  await fs.rm(tmpHomeFish, { recursive: true, force: true }).catch(() => {});

  for (const shell of ["bash", "fish", "zsh"] as const) {
    const tmp = path.join(CLI_ROOT, `.e2e-comp-${shell}`);
    await fs.mkdir(tmp, { recursive: true });
    const r = run(["completion", "install", shell], { HOME: tmp });
    assert(`completion matrix ${shell}`, r.status === 0);
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }

  const infoJson = run(["info", "--json"]);
  assert("info --json exit 0", infoJson.status === 0);
  if (infoJson.status === 0) {
    try {
      const parsed = JSON.parse(infoJson.stdout || "{}");
      assert("info JSON has installMode", typeof parsed.installMode === "string");
      if (typeof parsed.offline === "boolean") {
        assert("info JSON offline flag", parsed.offline === true);
      }
      assert("info JSON schemaVersion", parsed.schemaVersion === 2);
      assert("info JSON pendingGateway", Array.isArray(parsed.pendingGateway));
    } catch {
      assert("info JSON parseable", false);
    }
  }

  const dryRun = run(["update", "--dry-run", "--channel", "stable"]);
  assert("update --dry-run exit 0", dryRun.status === 0);
  assert("update dry-run mentions Dry-run", (dryRun.stdout || "").includes("Dry-run"));

  const dryRunJson = run(["update", "--dry-run", "--json", "--channel", "stable"]);
  assert("update --dry-run --json exit 0", dryRunJson.status === 0);
  if (dryRunJson.status === 0) {
    try {
      const parsed = JSON.parse(dryRunJson.stdout || "{}");
      assert("update dry-run JSON has plan", typeof parsed.plan === "object");
    } catch {
      assert("update dry-run JSON parseable", false);
    }
  }

  const installJson = run(["install", "--json"]);
  assert("install --json exit 0", installJson.status === 0);
  if (installJson.status === 0) {
    try {
      const parsed = JSON.parse(installJson.stdout || "{}");
      assert("install JSON recommended npm", parsed.recommended === "npm");
    } catch {
      assert("install JSON parseable", false);
    }
  }

  const cronStatus = run(["update", "--cron-status"]);
  assert("update --cron-status exit 0", cronStatus.status === 0);

  const scanTop = run(["scan", "--json"]);
  assert("scan --json exit 0", scanTop.status === 0);
  if (scanTop.status === 0) {
    try {
      const parsed = JSON.parse(scanTop.stdout || "{}");
      assert("scan JSON has tools", Array.isArray(parsed.tools));
      assert("scan JSON schemaVersion", parsed.schemaVersion === 2);
      assert("scan JSON command", parsed.command === "scan");
      assert("scan JSON pendingGateway", Array.isArray(parsed.pendingGateway));
    } catch {
      assert("scan JSON parseable", false);
    }
  }

  const configGet = run(["config", "get", "base-url"]);
  assert("config get base-url exit 0|1", configGet.status === 0 || configGet.status === 1);

  const guideOnboard = run(["guide", "onboarding"]);
  assert("guide onboarding exit 0", guideOnboard.status === 0);
  if (guideOnboard.status === 0) {
    assert("guide onboarding content", (guideOnboard.stdout || "").includes("Onboarding stali-cli"));
  }

  const guideList = run(["guide"]);
  assert("guide list exit 0", guideList.status === 0);
  assert("guide list mentions onboarding", (guideList.stdout || "").includes("onboarding"));

  const gatewayScan = run(["gateway", "scan", "--json"]);
  assert("gateway scan --json exit 0", gatewayScan.status === 0);
  if (gatewayScan.status === 0) {
    try {
      const parsed = JSON.parse(gatewayScan.stdout || "{}");
      assert("gateway JSON has tools array", Array.isArray(parsed.tools));
      assert("gateway scan JSON command", parsed.command === "gateway-scan");
      assert("gateway scan JSON schemaVersion", parsed.schemaVersion === 2);
    } catch {
      assert("gateway JSON parseable", false);
    }
  }

  const benchEnv =
    process.platform === "win32"
      ? { STALI_BENCH_FAST: "1", STALI_BENCH_SKIP_WIZARD: "1" }
      : undefined;
  const benchJson = run(["bench", "--json", "--runs", "1"], benchEnv, 60_000);
  assert("bench --json exit 0", benchJson.status === 0);
  if (benchJson.status === 0) {
    try {
      const parsed = JSON.parse(benchJson.stdout || "{}");
      assert("bench JSON has results", Array.isArray(parsed.results));
    } catch {
      assert("bench JSON parseable", false);
    }
  }

  const gatewayPlan = run(["gateway", "plan", "--json"]);
  assert("gateway plan --json exit 0", gatewayPlan.status === 0);
  if (gatewayPlan.status === 0) {
    try {
      const parsed = JSON.parse(gatewayPlan.stdout || "{}");
      assert("gateway plan JSON has targets", Array.isArray(parsed.targets));
      assert("gateway plan JSON has summary", typeof parsed.summary === "object");
      assert("gateway plan JSON schemaVersion", parsed.schemaVersion === 2);
      assert("gateway plan JSON command", parsed.command === "gateway-plan");
    } catch {
      assert("gateway plan JSON parseable", false);
    }
  }

  const gatewayDefaultDry = run([
    "gateway",
    "--dry-run",
    "--json",
    "-k",
    "sk-stali-test-key-for-dry-run-only-000000000000",
  ]);
  assert("gateway default dry-run --json exit 0|1", gatewayDefaultDry.status === 0 || gatewayDefaultDry.status === 1);
  if (gatewayDefaultDry.status === 0) {
    try {
      const parsed = JSON.parse(gatewayDefaultDry.stdout || "{}");
      assert("gateway default JSON has plan", typeof parsed.plan === "object");
    } catch {
      assert("gateway default JSON parseable", false);
    }
  }

  const gatewayAutoDry = run([
    "gateway",
    "auto",
    "--dry-run",
    "--json",
    "-k",
    "sk-stali-test-key-for-dry-run-only-000000000000",
  ]);
  assert("gateway auto dry-run --json exit 0|1", gatewayAutoDry.status === 0 || gatewayAutoDry.status === 1);
  if (gatewayAutoDry.status === 0) {
    try {
      const parsed = JSON.parse(gatewayAutoDry.stdout || "{}");
      assert("gateway auto JSON has plan", typeof parsed.plan === "object");
      assert("gateway auto JSON dryRun", parsed.dryRun === true);
    } catch {
      assert("gateway auto JSON parseable", false);
    }
  }

  const gatewayDryJson = run([
    "gateway",
    "install",
    "--dry-run",
    "--json",
    "-k",
    "sk-stali-test-key-for-dry-run-only-000000000000",
  ]);
  assert("gateway install dry-run --json exit 0|1", gatewayDryJson.status === 0 || gatewayDryJson.status === 1);
  if (gatewayDryJson.status === 0) {
    try {
      const parsed = JSON.parse(gatewayDryJson.stdout || "{}");
      assert("gateway install JSON has targets", Array.isArray(parsed.targets));
      assert("gateway install JSON dryRun", parsed.dryRun === true);
    } catch {
      assert("gateway install JSON parseable", false);
    }
  }

  assert("setup --help exit 0", run(["setup", "--help"]).status === 0);
  assert("onboard --help exit 0", run(["onboard", "--help"]).status === 0);
  assert("user exit 0", run(["user"]).status === 0);
  const helpOut = run(["--help"]);
  assert("--help exit 0", helpOut.status === 0);
  assert("--help user-first hides bench", !/^\s+bench\s/m.test(helpOut.stdout || ""));
  assert("--help shows setup", /setup/.test(helpOut.stdout || ""));
  assert("--help shows scan", /^\s+scan\s/m.test(helpOut.stdout || ""));
  const helpAdv = run(["help", "advanced"]);
  assert("help advanced exit 0", helpAdv.status === 0);
  assert("help advanced shows bench", /bench/.test(helpAdv.stdout || ""));
  assert("help advanced shows init", /^\s+init\s/m.test(helpAdv.stdout || ""));
  assert("status --json exit 0|1", [0, 1].includes(run(["status", "--json"]).status));
  const statusJson = run(["status", "--json"]);
  if (statusJson.stdout) {
    try {
      const parsed = JSON.parse(statusJson.stdout);
      assert("status JSON gateway.pendingGateway", Array.isArray(parsed.gateway?.pendingGateway));
      assert(
        "status JSON gateway.pendingGatewayCount",
        typeof parsed.gateway?.pendingGatewayCount === "number"
      );
      assert("status JSON top-level pendingGateway", Array.isArray(parsed.pendingGateway));
      assert("status JSON schemaVersion", parsed.schemaVersion === 2);
      assert("status JSON command", parsed.command === "status");
    } catch {
      assert("status JSON parseable", false);
    }
  }
  const readyJson = run(["ready", "--json"]);
  assert("ready --json exit 0|1", [0, 1].includes(readyJson.status));
  if (readyJson.stdout) {
    try {
      const parsed = JSON.parse(readyJson.stdout);
      assert("ready JSON command", parsed.command === "ready");
      assert("ready JSON pendingGateway", Array.isArray(parsed.pendingGateway));
    } catch {
      assert("ready JSON parseable", false);
    }
  }
  const doctorStrict = run(["doctor", "--strict", "--tools-only", "--json"]);
  assert("doctor --strict --tools-only --json exit 0|1", [0, 1].includes(doctorStrict.status));
  const setupJson = run(["setup", "--json", "-k", "sk-stali-" + "x".repeat(40), "--skip-configure"]);
  assert("setup --json exit 0|1", setupJson.status === 0 || setupJson.status === 1);
  if (setupJson.stdout) {
    try {
      const parsed = JSON.parse(setupJson.stdout);
      assert("setup JSON has ok", typeof parsed.ok === "boolean");
      assert("setup JSON has steps", Array.isArray(parsed.steps));
      assert(
        "setup JSON pendingGatewayCount",
        typeof parsed.pendingGatewayCount === "number"
      );
      assert("setup JSON schemaVersion", parsed.schemaVersion === 2);
      assert("setup JSON command", parsed.command === "setup");
      assert("setup JSON pendingGateway", Array.isArray(parsed.pendingGateway));
    } catch {
      assert("setup JSON parseable", false);
    }
  }

  const telemetryStatus = run(["telemetry", "status", "--json"]);
  assert("telemetry status --json exit 0", telemetryStatus.status === 0);
  if (telemetryStatus.status === 0) {
    try {
      const parsed = JSON.parse(telemetryStatus.stdout || "{}");
      assert("telemetry status JSON schemaVersion", parsed.schemaVersion === 2);
      assert("telemetry status JSON command", parsed.command === "telemetry-status");
      assert("telemetry status JSON queueDepth", typeof parsed.queueDepth === "number");
    } catch {
      assert("telemetry status JSON parseable", false);
    }
  }

  const telemetryFlush = run(["telemetry", "flush", "--json"]);
  assert("telemetry flush --json exit 0", telemetryFlush.status === 0);
  if (telemetryFlush.status === 0) {
    try {
      const parsed = JSON.parse(telemetryFlush.stdout || "{}");
      assert("telemetry flush JSON schemaVersion", parsed.schemaVersion === 2);
      assert("telemetry flush JSON command", parsed.command === "telemetry-flush");
    } catch {
      assert("telemetry flush JSON parseable", false);
    }
  }

  const doctorJson = run(["doctor", "--json"]);
  assert("doctor --json exit 0", doctorJson.status === 0);
  if (doctorJson.stdout) {
    try {
      const parsed = JSON.parse(doctorJson.stdout);
      assert("doctor JSON has installedTools", Array.isArray(parsed.installedTools));
      assert("doctor JSON meta.installedToolsCount", typeof parsed.meta?.installedToolsCount === "number");
      assert("doctor JSON pendingGateway", Array.isArray(parsed.pendingGateway));
      assert("doctor JSON meta.schemaVersion", parsed.meta?.schemaVersion === 2);
      assert(
        "doctor JSON meta.pendingGatewayCount",
        typeof parsed.meta?.pendingGatewayCount === "number"
      );
      assert("doctor JSON meta.modelsEndpoint", typeof parsed.meta?.modelsEndpoint === "string");
    } catch {
      assert("doctor JSON parseable", false);
    }
  }

  const prom = run(["doctor", "--tools-only", "--prometheus"]);
  assert("doctor --prometheus", prom.status === 0 || prom.status === 1);
  assert(
    "doctor prometheus metrics",
    (prom.stdout || "").includes("stali_doctor_configured")
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
