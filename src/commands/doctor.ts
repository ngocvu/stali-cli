import chalk from "chalk";
import { loadStaliConfig } from "../services/config";
import { runDoctorFix } from "../services/doctor-fix";
import { runPluginsDoctorFix } from "../services/plugin-doctor-fix";
import { runPluginsDoctor, type PluginHealthStatus } from "../services/plugin-doctor";
import { runDoctorScan } from "../services/syncers";
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

export interface DoctorViewOptions {
  pluginsOnly?: boolean;
  toolsOnly?: boolean;
}

export async function buildDoctorJsonOutput(
  opts?: DoctorViewOptions
): Promise<DoctorJsonOutput> {
  const cfg = await loadStaliConfig();
  const urls = resolveStaliUrls(cfg?.baseUrl);

  if (opts?.pluginsOnly) {
    const pluginReport = await runPluginsDoctor();
    const pluginsConfigured = pluginReport.plugins.filter((p) => p.configuredForStali).length;
    return {
      meta: {
        baseUrl: cfg?.baseUrl || urls.openAiBaseUrl,
        openAiBaseUrl: urls.openAiBaseUrl,
        anthropicBaseUrl: urls.anthropicBaseUrl,
        modelsEndpoint: urls.modelsEndpoint,
        toolsConfigured: 0,
        toolsTotal: 0,
        pluginsConfigured,
        pluginsTotal: pluginReport.plugins.length,
      },
      tools: [],
      plugins: pluginReport.plugins,
    };
  }

  if (opts?.toolsOnly) {
    const tools = await runDoctorScan({ urls });
    const toolsConfigured = tools.filter((s) => s.configuredForStali).length;
    return {
      meta: {
        baseUrl: cfg?.baseUrl || urls.openAiBaseUrl,
        openAiBaseUrl: urls.openAiBaseUrl,
        anthropicBaseUrl: urls.anthropicBaseUrl,
        modelsEndpoint: urls.modelsEndpoint,
        toolsConfigured,
        toolsTotal: tools.length,
        pluginsConfigured: 0,
        pluginsTotal: 0,
      },
      tools,
      plugins: [],
    };
  }

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

function printToolSection(statuses: ToolHealthStatus[], modelsEndpoint: string) {
  const configured = statuses.filter((s) => s.configuredForStali);
  console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR\n"));
  console.log(chalk.gray(`API: ${modelsEndpoint}\n`));
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
    if (s.endpoint) console.log(chalk.gray(`   ${s.endpoint}`));
    console.log(chalk.gray(`   ${s.configPath}`));
  }
}

export function computeDoctorExitCode(
  payload: DoctorJsonOutput,
  view?: DoctorViewOptions
): number {
  if (view?.pluginsOnly) {
    if (payload.plugins.length === 0) return 1;
    return payload.plugins.every((p) => p.configuredForStali) ? 0 : 1;
  }
  return 0;
}

/** JSON legacy shape (plugins doctor v2/v3). */
export function toLegacyPluginsDoctorJson(payload: DoctorJsonOutput) {
  return {
    meta: {
      baseUrl: payload.meta.baseUrl,
      openAiBaseUrl: payload.meta.openAiBaseUrl,
      anthropicBaseUrl: payload.meta.anthropicBaseUrl,
      modelsEndpoint: payload.meta.modelsEndpoint,
      pluginCount: payload.meta.pluginsTotal,
      preferCommand: "stali doctor --plugins-only",
    },
    plugins: payload.plugins,
  };
}

export async function runDoctor(
  jsonOut?: boolean,
  fixOpts?: {
    apiKey?: string;
    fix?: boolean;
    dryRun?: boolean;
    force?: boolean;
    tools?: string;
    model?: string;
    ids?: string;
  },
  view?: DoctorViewOptions,
  prometheusOut?: boolean
): Promise<number> {
  if (fixOpts?.fix) {
    const apiKey = fixOpts.apiKey;
    if (!apiKey) {
      console.error(chalk.red("❌ doctor --fix cần API key (-k hoặc token đã lưu)."));
      process.exit(1);
    }
    const cfg = await loadStaliConfig();
    const toolInputs = fixOpts.tools
      ? fixOpts.tools.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const printFixHeader = (title: string) => {
      if (fixOpts.dryRun) {
        console.log(chalk.bold.cyan(`\n🔍 Doctor fix (dry-run) — ${title}\n`));
      } else {
        console.log(chalk.bold.cyan(`\n🩺 STALI DOCTOR — FIX (${title})\n`));
      }
    };

    const printItems = (
      items: { success: boolean; message: string; toolName?: string; toolId?: string; pluginName?: string; pluginId?: string }[]
    ) => {
      for (const item of items) {
        const icon = item.success ? chalk.green("✓") : chalk.red("✗");
        const label =
          item.toolName ||
          item.pluginName ||
          item.toolId ||
          item.pluginId ||
          "stali";
        console.log(`${icon} ${chalk.white(label)} — ${item.message}`);
      }
      console.log("");
    };

    if (view?.pluginsOnly) {
      const pluginIds = fixOpts.ids
        ? fixOpts.ids.split(",").map((id) => id.trim()).filter(Boolean)
        : undefined;
      const { items, allOk } = await runPluginsDoctorFix({
        apiKey,
        model: fixOpts.model,
        baseUrl: cfg?.baseUrl,
        dryRun: fixOpts.dryRun,
        force: fixOpts.force,
        pluginIds,
      });
      printFixHeader("plugins");
      printItems(items);
      process.exit(allOk ? 0 : 1);
    }

    const { items: toolItems, allOk: toolsOk } = await runDoctorFix({
      apiKey,
      model: fixOpts.model,
      baseUrl: cfg?.baseUrl,
      toolInputs,
      dryRun: fixOpts.dryRun,
      force: fixOpts.force,
    });

    if (view?.toolsOnly) {
      printFixHeader("tools");
      printItems(toolItems);
      process.exit(toolsOk ? 0 : 1);
    }

    printFixHeader("tools");
    printItems(toolItems);

    const pluginReport = await runPluginsDoctor();
    if (pluginReport.plugins.length > 0) {
      const pluginIds = fixOpts.ids
        ? fixOpts.ids.split(",").map((id) => id.trim()).filter(Boolean)
        : undefined;
      const { items: pluginItems, allOk: pluginsOk } = await runPluginsDoctorFix({
        apiKey,
        model: fixOpts.model,
        baseUrl: cfg?.baseUrl,
        dryRun: fixOpts.dryRun,
        force: fixOpts.force,
        pluginIds,
      });
      printFixHeader("plugins");
      printItems(pluginItems);
      process.exit(toolsOk && pluginsOk ? 0 : 1);
    }

    process.exit(toolsOk ? 0 : 1);
  }

  const payload = await buildDoctorJsonOutput(view);

  if (prometheusOut) {
    console.log(formatDoctorPrometheus(payload, view));
    return computeDoctorExitCode(payload, view);
  }

  if (jsonOut) {
    const out = view?.pluginsOnly ? toLegacyPluginsDoctorJson(payload) : payload;
    console.log(JSON.stringify(out, null, 2));
    return computeDoctorExitCode(payload, view);
  }

  if (view?.pluginsOnly) {
    if (payload.plugins.length === 0) {
      console.log(chalk.yellow("\nKhông có plugin — stali plugins list --init\n"));
      return 1;
    }
    console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR — PLUGINS\n"));
    console.log(chalk.gray(`API: ${payload.meta.modelsEndpoint}`));
    printPluginSection(payload.plugins);
    console.log(chalk.gray("\nXem đầy đủ: stali doctor\n"));
    return computeDoctorExitCode(payload, view);
  }

  if (view?.toolsOnly) {
    printToolSection(payload.tools, payload.meta.modelsEndpoint);
    console.log(chalk.gray("\nXem plugins: stali doctor --plugins-only\n"));
    return 0;
  }

  printToolSection(payload.tools, payload.meta.modelsEndpoint);
  printPluginSection(payload.plugins);
  console.log("");
  return 0;
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

/** Hash theo phạm vi watch (--tools-only / --plugins-only). */
export function scopedDoctorHash(
  payload: DoctorJsonOutput,
  view?: DoctorViewOptions
): string {
  if (view?.pluginsOnly) {
    return payload.plugins
      .map(
        (p) =>
          `${p.pluginId}:${p.configuredForStali ? "1" : "0"}:${p.model || ""}:${p.endpoint || ""}`
      )
      .join("|");
  }
  if (view?.toolsOnly) {
    return doctorSnapshotHash(payload.tools);
  }
  return combinedDoctorHash(payload);
}

export function scopedNotifySummary(payload: DoctorJsonOutput, view?: DoctorViewOptions): string {
  if (view?.pluginsOnly) {
    const pOk = payload.plugins.filter((p) => p.configuredForStali).length;
    return `${pOk}/${payload.plugins.length} plugins`;
  }
  if (view?.toolsOnly) {
    const tOk = payload.tools.filter((s) => s.configuredForStali).length;
    return `${tOk}/${payload.tools.length} tools`;
  }
  const configured = payload.tools.filter((s) => s.configuredForStali).length;
  const pConfigured = payload.plugins.filter((p) => p.configuredForStali).length;
  return `${configured}/${payload.tools.length} tools, ${pConfigured}/${payload.plugins.length} plugins`;
}

/** Số tool/plugin đã trỏ Stali (theo scope). */
export function configuredScore(
  payload: DoctorJsonOutput,
  view?: DoctorViewOptions
): number {
  if (view?.pluginsOnly) {
    return payload.plugins.filter((p) => p.configuredForStali).length;
  }
  if (view?.toolsOnly) {
    return payload.tools.filter((s) => s.configuredForStali).length;
  }
  return (
    payload.tools.filter((s) => s.configuredForStali).length +
    payload.plugins.filter((p) => p.configuredForStali).length
  );
}

function scopeLabel(view?: DoctorViewOptions): string {
  if (view?.pluginsOnly) return "plugins";
  if (view?.toolsOnly) return "tools";
  return "full";
}

/** Prometheus text exposition (doctor metrics). */
export function formatDoctorPrometheus(
  payload: DoctorJsonOutput,
  view?: DoctorViewOptions
): string {
  const scope = scopeLabel(view);
  const configured = configuredScore(payload, view);
  const toolsTotal = payload.tools.length;
  const pluginsTotal = payload.plugins.length;
  const total =
    scope === "plugins" ? pluginsTotal : scope === "tools" ? toolsTotal : toolsTotal + pluginsTotal;
  const toolsConfigured = payload.tools.filter((s) => s.configuredForStali).length;
  const pluginsConfigured = payload.plugins.filter((p) => p.configuredForStali).length;

  const lines = [
    "# HELP stali_doctor_configured Items configured for Stali API",
    "# TYPE stali_doctor_configured gauge",
    `stali_doctor_configured{scope="${scope}"} ${configured}`,
    "# HELP stali_doctor_total Total items in scope",
    "# TYPE stali_doctor_total gauge",
    `stali_doctor_total{scope="${scope}"} ${total}`,
    "# HELP stali_doctor_tools_configured Tools pointing to Stali",
    "# TYPE stali_doctor_tools_configured gauge",
    `stali_doctor_tools_configured ${toolsConfigured}`,
    "# HELP stali_doctor_plugins_configured Plugins pointing to Stali",
    "# TYPE stali_doctor_plugins_configured gauge",
    `stali_doctor_plugins_configured ${pluginsConfigured}`,
  ];
  return lines.join("\n") + "\n";
}

export interface DoctorWatchLimits {
  maxCycles?: number;
  durationSec?: number;
}

export async function runDoctorWatch(
  intervalSec: number,
  jsonOut?: boolean,
  notify?: boolean,
  view?: DoctorViewOptions,
  limits?: DoctorWatchLimits,
  prometheusOut?: boolean
) {
  const sec = Math.max(1, intervalSec);
  let running = true;
  let cycles = 0;
  const startedAt = Date.now();
  let prevHash = "";
  let peakScore = 0;
  let degraded = false;
  const stop = () => {
    running = false;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  const finish = (code: number) => {
    process.exit(code);
  };

  const hitLimit = () => {
    if (limits?.maxCycles && cycles >= limits.maxCycles) return true;
    if (limits?.durationSec && Date.now() - startedAt >= limits.durationSec * 1000) return true;
    return false;
  };

  while (running) {
    if (!jsonOut && !prometheusOut) {
      const locale = getLocale() === "en" ? "en-US" : "vi-VN";
      console.log(
        chalk.gray(
          `\n[${new Date().toLocaleTimeString(locale)}] ${t("doctor_watch_hint")} (${sec}s)`
        )
      );
    }
    const payload = await buildDoctorJsonOutput(view);
    const statuses = payload.tools;
    const hash = scopedDoctorHash(payload, view);
    const score = configuredScore(payload, view);
    if (score > peakScore) peakScore = score;
    else if (score < peakScore) {
      degraded = true;
      if (jsonOut) {
        console.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            event: "doctor.degraded",
            hash,
            scope: view?.pluginsOnly ? "plugins" : view?.toolsOnly ? "tools" : "full",
            score,
            peakScore,
          })
        );
      }
    }
    if (notify && prevHash && hash !== prevHash) {
      console.log(chalk.yellow(`\n${t("doctor_changed")}\n`));
      notifyChange("stali-cli doctor", scopedNotifySummary(payload, view));
    }
    prevHash = hash;

    if (jsonOut) {
      const data = view?.pluginsOnly ? toLegacyPluginsDoctorJson(payload) : payload;
      const record = {
        ts: new Date().toISOString(),
        event: "doctor.snapshot",
        hash,
        scope: view?.pluginsOnly ? "plugins" : view?.toolsOnly ? "tools" : "full",
        score,
        peakScore,
        data,
      };
      console.log(JSON.stringify(record));
    } else if (prometheusOut) {
      console.log(formatDoctorPrometheus(payload, view));
    } else if (view?.pluginsOnly) {
      const pOk = payload.plugins.filter((p) => p.configuredForStali).length;
      console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR — PLUGINS\n"));
      console.log(chalk.magenta(`🔌 ${pOk}/${payload.plugins.length} plugins\n`));
    } else if (view?.toolsOnly) {
      const toolsOk = statuses.filter((s) => s.configuredForStali).length;
      console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR — TOOLS\n"));
      console.log(chalk.green(`✅ ${toolsOk}/${statuses.length} tools\n`));
    } else {
      const configured = statuses.filter((s) => s.configuredForStali);
      console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR\n"));
      console.log(chalk.green(`✅ ${configured.length}/${statuses.length} tools`));
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

    cycles++;
    if (hitLimit()) {
      running = false;
      break;
    }
    if (!running) break;
    await new Promise((r) => setTimeout(r, sec * 1000));
  }
  finish(degraded ? 1 : 0);
}
