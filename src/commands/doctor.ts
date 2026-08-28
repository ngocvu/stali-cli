import chalk from "chalk";
import { loadStaliConfig } from "../services/config";
import { runDoctorFix } from "../services/doctor-fix";
import { runDoctorScan } from "../services/syncers";
import { runPluginsDoctor, type PluginHealthStatus } from "../services/plugin-doctor";
import { doctorSnapshotHash, notifyChange } from "../services/notify";
import { resolveStaliUrls } from "../utils/stali-urls";
import { t, getLocale } from "../i18n";
import type { ToolHealthStatus } from "../services/syncers";

export interface DoctorJsonOutput {
  meta: {
    baseUrl: string;
    openAiBaseUrl: string;
    anthropicBaseUrl: string;
    modelsEndpoint: string;
    toolsConfigured: number;
    toolsTotal: number;
    pluginsConfigured: number;
    pluginsTotal: number;
  };
  tools: ToolHealthStatus[];
  plugins: PluginHealthStatus[];
}

export async function buildDoctorJsonOutput(): Promise<DoctorJsonOutput> {
  const cfg = await loadStaliConfig();
  const urls = resolveStaliUrls(cfg?.baseUrl);
  const [tools, pluginReport] = await Promise.all([
    runDoctorScan({ urls }),
    runPluginsDoctor(),
  ]);
  const toolsConfigured = tools.filter((s) => s.configuredForStali).length;
  const pluginsConfigured = pluginReport.plugins.filter((p) => p.configuredForStali).length;

  return {
    meta: {
      baseUrl: cfg?.baseUrl || urls.openAiBaseUrl,
      openAiBaseUrl: urls.openAiBaseUrl,
      anthropicBaseUrl: urls.anthropicBaseUrl,
      modelsEndpoint: urls.modelsEndpoint,
      toolsConfigured,
      toolsTotal: tools.length,
      pluginsConfigured,
      pluginsTotal: pluginReport.plugins.length,
    },
    tools,
    plugins: pluginReport.plugins,
  };
}

function printPluginSection(plugins: PluginHealthStatus[]) {
  if (plugins.length === 0) return;
  const configured = plugins.filter((p) => p.configuredForStali);
  console.log(
    chalk.magenta(`\n🔌 Plugins: ${configured.length}/${plugins.length} trỏ Stali\n`)
  );
  for (const p of plugins) {
    const icon = p.configuredForStali ? chalk.green("✓") : chalk.yellow("○");
    const state = p.configuredForStali
      ? chalk.green("Stali OK")
      : p.exists
      ? chalk.yellow("chưa trỏ Stali")
      : chalk.gray("chưa có file");
    console.log(
      `${icon} ${chalk.white(p.pluginName)} (${p.patchStyle}) — ${state}${p.model ? chalk.gray(` (${p.model})`) : ""}`
    );
    if (p.endpoint) console.log(chalk.gray(`   ${p.endpoint}`));
    console.log(chalk.gray(`   ${p.configPath}`));
  }
}

export async function runDoctor(jsonOut?: boolean, fixOpts?: {
  apiKey?: string;
  fix?: boolean;
  dryRun?: boolean;
  force?: boolean;
  tools?: string;
  model?: string;
}) {
  if (fixOpts?.fix) {
    const apiKey = fixOpts.apiKey;
    if (!apiKey) {
      console.error(chalk.red("❌ doctor --fix cần API key (-k hoặc token đã lưu)."));
      process.exit(1);
    }
    const toolInputs = fixOpts.tools
      ? fixOpts.tools.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;
    const cfg = await loadStaliConfig();
    const { items, allOk } = await runDoctorFix({
      apiKey,
      model: fixOpts.model,
      baseUrl: cfg?.baseUrl,
      toolInputs,
      dryRun: fixOpts.dryRun,
      force: fixOpts.force,
    });

    if (fixOpts.dryRun) {
      console.log(chalk.bold.cyan("\n🔍 Doctor fix (dry-run)\n"));
    } else {
      console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR — FIX\n"));
    }
    for (const item of items) {
      const icon = item.success ? chalk.green("✓") : chalk.red("✗");
      console.log(`${icon} ${chalk.white(item.toolName || item.toolId)} — ${item.message}`);
    }
    console.log("");
    process.exit(allOk ? 0 : 1);
  }

  const payload = await buildDoctorJsonOutput();
  if (jsonOut) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const statuses = payload.tools;
  const configured = statuses.filter((s) => s.configuredForStali);

  console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR\n"));
  console.log(chalk.gray(`API: ${payload.meta.modelsEndpoint}\n`));
  console.log(
    chalk.green(`✅ Đã trỏ Stali: ${configured.length}/${statuses.length} công cụ\n`)
  );

  for (const s of statuses) {
    const icon = s.configuredForStali ? chalk.green("✓") : chalk.yellow("○");
    const state = s.configuredForStali
      ? chalk.green("Stali OK")
      : s.exists
      ? chalk.yellow("chưa trỏ Stali")
      : chalk.gray("chưa có file");
    console.log(
      `${icon} ${chalk.white(s.toolName)} — ${state}${s.model ? chalk.gray(` (${s.model})`) : ""}`
    );
    if (s.endpoint) {
      console.log(chalk.gray(`   ${s.endpoint}`));
    }
    console.log(chalk.gray(`   ${s.configPath}`));
  }

  printPluginSection(payload.plugins);
  console.log("");
}

/** JSON tương thích ngược cho alias `plugins doctor` (v3). */
export function toLegacyPluginsDoctorJson(payload: DoctorJsonOutput) {
  return {
    meta: {
      baseUrl: payload.meta.baseUrl,
      openAiBaseUrl: payload.meta.openAiBaseUrl,
      anthropicBaseUrl: payload.meta.anthropicBaseUrl,
      modelsEndpoint: payload.meta.modelsEndpoint,
      pluginCount: payload.meta.pluginsTotal,
      deprecated: "plugins doctor là alias v3 — dùng `stali doctor --json`",
      preferCommand: "stali doctor",
    },
    plugins: payload.plugins,
  };
}

/** Alias v3 — thay `plugins doctor` subcommand đầy đủ. */
export async function runPluginsDoctorAlias(jsonOut?: boolean): Promise<number> {
  console.error(
    chalk.yellow("\n⚠  plugins doctor là alias → stali doctor (v3.0)\n")
  );
  const payload = await buildDoctorJsonOutput();
  if (jsonOut) {
    console.log(JSON.stringify(toLegacyPluginsDoctorJson(payload), null, 2));
    if (payload.plugins.length === 0) return 1;
    return payload.plugins.every((p) => p.configuredForStali) ? 0 : 1;
  }
  if (payload.plugins.length === 0) {
    console.log(chalk.yellow("\nKhông có plugin — stali plugins list --init\n"));
    return 1;
  }
  console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR — PLUGINS\n"));
  console.log(chalk.gray(`API: ${payload.meta.modelsEndpoint}`));
  printPluginSection(payload.plugins);
  console.log(chalk.gray("Xem tools + plugins: stali doctor\n"));
  return payload.plugins.every((p) => p.configuredForStali) ? 0 : 1;
}

export function combinedDoctorHash(payload: DoctorJsonOutput): string {
  const toolHash = doctorSnapshotHash(payload.tools);
  const pluginHash = payload.plugins
    .map(
      (p) =>
        `${p.pluginId}:${p.configuredForStali ? "1" : "0"}:${p.model || ""}:${p.endpoint || ""}`
    )
    .join("|");
  return `${toolHash}#${pluginHash}`;
}

export async function runDoctorWatch(intervalSec: number, jsonOut?: boolean, notify?: boolean) {
  const sec = Math.max(3, intervalSec);
  let running = true;
  let prevHash = "";
  const stop = () => {
    running = false;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (running) {
    if (!jsonOut) {
      const locale = getLocale() === "en" ? "en-US" : "vi-VN";
      console.log(
        chalk.gray(
          `\n[${new Date().toLocaleTimeString(locale)}] ${t("doctor_watch_hint")} (${sec}s)`
        )
      );
    }
    const payload = await buildDoctorJsonOutput();
    const statuses = payload.tools;
    const hash = combinedDoctorHash(payload);
    if (notify && prevHash && hash !== prevHash) {
      const configured = statuses.filter((s) => s.configuredForStali).length;
      const pConfigured = payload.plugins.filter((p) => p.configuredForStali).length;
      console.log(chalk.yellow(`\n${t("doctor_changed")}\n`));
      notifyChange(
        "stali-cli doctor",
        `${configured}/${statuses.length} tools, ${pConfigured}/${payload.plugins.length} plugins`
      );
    }
    prevHash = hash;

    if (jsonOut) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      const configured = statuses.filter((s) => s.configuredForStali);
      console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR\n"));
      console.log(
        chalk.green(`✅ ${configured.length}/${statuses.length} tools`)
      );
      if (payload.plugins.length > 0) {
        const pOk = payload.plugins.filter((p) => p.configuredForStali).length;
        console.log(chalk.magenta(`🔌 ${pOk}/${payload.plugins.length} plugins\n`));
      } else {
        console.log("");
      }
      for (const s of statuses) {
        const icon = s.configuredForStali ? chalk.green("✓") : chalk.yellow("○");
        console.log(`${icon} ${chalk.white(s.toolName)}${s.model ? chalk.gray(` (${s.model})`) : ""}`);
      }
    }

    if (!running) break;
    await new Promise((r) => setTimeout(r, sec * 1000));
  }
  process.exit(0);
}
