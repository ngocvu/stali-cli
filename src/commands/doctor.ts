import chalk from "chalk";
import { loadStaliConfig } from "../services/config";
import { runDoctorFix } from "../services/doctor-fix";
import { runDoctorScan } from "../services/syncers";
import { doctorSnapshotHash, notifyChange } from "../services/notify";
import { resolveStaliUrls } from "../utils/stali-urls";
import { t, getLocale } from "../i18n";

export interface DoctorJsonOutput {
  meta: {
    baseUrl: string;
    openAiBaseUrl: string;
    anthropicBaseUrl: string;
    modelsEndpoint: string;
  };
  tools: Awaited<ReturnType<typeof runDoctorScan>>;
}

export async function buildDoctorJsonOutput(): Promise<DoctorJsonOutput> {
  const cfg = await loadStaliConfig();
  const urls = resolveStaliUrls(cfg?.baseUrl);
  const tools = await runDoctorScan({ urls });
  return {
    meta: {
      baseUrl: cfg?.baseUrl || urls.openAiBaseUrl,
      openAiBaseUrl: urls.openAiBaseUrl,
      anthropicBaseUrl: urls.anthropicBaseUrl,
      modelsEndpoint: urls.modelsEndpoint,
    },
    tools,
  };
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
  console.log("");
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
    const hash = doctorSnapshotHash(statuses);
    if (notify && prevHash && hash !== prevHash) {
      const configured = statuses.filter((s) => s.configuredForStali).length;
      console.log(chalk.yellow(`\n${t("doctor_changed")}\n`));
      notifyChange("stali-cli doctor", `${configured}/${statuses.length} tools → Stali`);
    }
    prevHash = hash;

    if (jsonOut) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      const configured = statuses.filter((s) => s.configuredForStali);
      console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR\n"));
      console.log(
        chalk.green(`✅ ${configured.length}/${statuses.length}\n`)
      );
      for (const s of statuses) {
        const icon = s.configuredForStali ? chalk.green("✓") : chalk.yellow("○");
        console.log(`${icon} ${chalk.white(s.toolName)}${s.model ? chalk.gray(` (${s.model})`) : ""}`);
      }
      console.log("");
    }

    if (!running) break;
    await new Promise((r) => setTimeout(r, sec * 1000));
  }
  process.exit(0);
}
