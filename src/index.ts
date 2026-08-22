import { Command } from "commander";
import React from "react";
import { render } from "ink";
import Table from "cli-table3";
import chalk from "chalk";
import { Wizard } from "./ui/Wizard";
import { loadStaliConfig, resetStaliConfig } from "./services/config";
import { fetchRealtimeModels, validateApiKeyAndFetchModels } from "./services/api";
import { formatPricingSummary, formatTokens } from "./utils/format";
import { syncTool, resetTool, runDoctorScan } from "./services/syncers";
import { buildToolConfigPreview } from "./services/syncers/preview";
import { selfUpdate } from "./services/self-update";
import { runConfigureBatch } from "./services/configure-batch";
import { renderCompletion } from "./commands/completion";
import { renderEnvExport, type ExportEnvFormat } from "./services/export-env";
import { runDoctorFix } from "./services/doctor-fix";
import { runUninstall } from "./services/uninstall";
import {
  authLogin,
  authLogout,
  authStatus,
  STALI_DASHBOARD_KEYS_URL,
} from "./services/auth-cli";
import { gatherCliInfo } from "./services/cli-info";
import { openUrlInBrowser } from "./utils/open-url";
import { renderAppGuide, listGuideIds } from "./constants/guides";
import { STALI_DOCS_URL } from "./constants/api";
import { runHealthCheck } from "./services/health-check";
import { fetchLatestVersion } from "./services/version-check";
import { loadStaliConfigOrCorrupt } from "./services/config";
import { maskToken } from "./utils/token";
import { restoreFromBackup, listBackupsForFile } from "./utils/backup";
import { getToolById, resolveToolId } from "./utils/tool-utils";
import { resolveHomePath } from "./utils/file";
import { VERSION } from "./version";
import { getStaliBinDir, getStaliCliInstallDir, getStaliHome, getStaliConfigPath } from "./constants/paths";
import { SUPPORTED_TOOLS } from "./constants/tools";
import { setLocale, resolveLocale, t, getLocale } from "./i18n";
import { runInit } from "./services/init-cli";
import { loadPlugins, writePluginsExample, getPluginsPath } from "./services/plugins";
import { doctorSnapshotHash, notifyChange } from "./services/notify";

const program = new Command();

async function resolveApiKey(explicit?: string): Promise<string | undefined> {
  if (explicit?.trim()) return explicit.trim();
  const cfg = await loadStaliConfig();
  return cfg?.apiKey?.trim() || undefined;
}

async function displayModelsTable(apiKey?: string) {
  const token = await resolveApiKey(apiKey);
  const models = await fetchRealtimeModels(token);

  if (models.length === 0) {
    console.log(chalk.red("\n❌ Không thể lấy danh sách model thời gian thực từ Stali API."));
    console.log(
      chalk.yellow(
        "Vui lòng kiểm tra kết nối mạng hoặc cung cấp API token hợp lệ với 'stali -k <token>' hoặc 'stali ls -k <token>'.\n"
      )
    );
    process.exit(1);
  }

  const table = new Table({
    head: [
      chalk.cyan("Tên Model"),
      chalk.cyan("Mã Model (ID)"),
      chalk.yellow("Giá Token / Lượt"),
      chalk.magenta("Context"),
      chalk.green("Giao thức"),
    ],
  });

  models.forEach((m) => {
    table.push([
      chalk.white(m.display_name),
      chalk.gray(m.id),
      chalk.yellow(formatPricingSummary(m.billing_unit, m.pricing)),
      chalk.magenta(formatTokens(m.context_window)),
      chalk.green(m.supported_endpoint_types.join(", ")),
    ]);
  });

  console.log(
    chalk.bold.magenta(
      `\n📊 BẢNG GIÁ MODEL STALI API (${models.length} models - https://api.stali.vn/v1/models):\n`
    )
  );
  console.log(table.toString());
  console.log(
    chalk.gray(
      "\n💡 Chạy 'stali' để mở wizard cấu hình cho 13 công cụ AI (Claude, Codex, OpenClaw, …).\n"
    )
  );
}

async function runPaths() {
  console.log(chalk.bold.cyan("\n📁 STALI PATHS\n"));
  console.log(`${chalk.white("Home")}     ${getStaliHome()}`);
  console.log(`${chalk.white("CLI")}      ${getStaliCliInstallDir()}`);
  console.log(`${chalk.white("Bin")}      ${getStaliBinDir()}`);
  console.log(`${chalk.white("Config")}   ${getStaliConfigPath()}`);
  console.log(chalk.gray("\nThêm vào PATH nếu lệnh stali chưa nhận:"));
  console.log(chalk.yellow(`  export PATH="${getStaliBinDir()}:$PATH"`));
  console.log("");
}

async function runToolsList() {
  const statuses = await runDoctorScan();
  console.log(chalk.bold.cyan("\n🔧 STALI CLI — 13 công cụ hỗ trợ\n"));
  for (const s of statuses) {
    const icon = s.configuredForStali ? chalk.green("✓") : chalk.yellow("○");
    console.log(
      `${icon} ${chalk.white(s.toolId.padEnd(14))} ${chalk.gray(s.toolName)}`
    );
    console.log(chalk.gray(`     ${s.configPath}`));
  }
  console.log(chalk.gray("\nCấu hình: stali configure <toolId> -k sk-stali-...\n"));
}

async function runDoctor(jsonOut?: boolean, fixOpts?: {
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
    const { items, allOk } = await runDoctorFix({
      apiKey,
      model: fixOpts.model,
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

  const statuses = await runDoctorScan();
  if (jsonOut) {
    console.log(JSON.stringify(statuses, null, 2));
    return;
  }
  const configured = statuses.filter((s) => s.configuredForStali);

  console.log(chalk.bold.cyan("\n🩺 STALI DOCTOR\n"));
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

async function runDoctorWatch(intervalSec: number, jsonOut?: boolean, notify?: boolean) {
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
    const statuses = await runDoctorScan();
    const hash = doctorSnapshotHash(statuses);
    if (notify && prevHash && hash !== prevHash) {
      const configured = statuses.filter((s) => s.configuredForStali).length;
      console.log(chalk.yellow(`\n${t("doctor_changed")}\n`));
      notifyChange("stali-cli doctor", `${configured}/${statuses.length} tools → Stali`);
    }
    prevHash = hash;

    if (jsonOut) {
      console.log(JSON.stringify(statuses, null, 2));
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

async function runBackupsList(toolInput?: string) {
  if (!toolInput) {
    console.log(chalk.bold.cyan("\n📦 STALI BACKUPS\n"));
    for (const tool of SUPPORTED_TOOLS) {
      const target = resolveHomePath(tool.configFile);
      const backups = await listBackupsForFile(target);
      if (backups.length === 0) continue;
      console.log(chalk.white(`${tool.name} (${tool.id})`));
      backups.slice(0, 5).forEach((b) => console.log(chalk.gray(`  • ${b}`)));
    }
    console.log(chalk.gray("\nChi tiết: stali backups list -t <tool>\n"));
    return;
  }
  const toolId = resolveToolId(toolInput);
  const tool = getToolById(toolId);
  if (!tool) {
    console.error(chalk.red(`❌ Tool không hợp lệ: ${toolInput}`));
    process.exit(1);
  }
  const target = resolveHomePath(tool.configFile);
  const backups = await listBackupsForFile(target);
  console.log(chalk.bold.cyan(`\n📦 Backups — ${tool.name}\n`));
  console.log(chalk.gray(`File: ${target}\n`));
  if (backups.length === 0) {
    console.log(chalk.yellow("Không có backup .bak\n"));
    return;
  }
  backups.forEach((b, i) => {
    console.log(`${i === 0 ? chalk.green("→") : " "} ${b}${i === 0 ? chalk.green(" (mới nhất)") : ""}`);
  });
  console.log(chalk.gray("\nKhôi phục: stali restore -t " + toolId + "\n"));
}

async function runConfigure(
  toolInput: string,
  apiKey: string,
  model?: string,
  dryRun?: boolean
) {
  const toolId = resolveToolId(toolInput);
  const tool = getToolById(toolId);
  if (!tool) {
    console.error(chalk.red(`❌ Tool không hợp lệ: ${toolId}`));
    console.log(chalk.gray(`Các tool hỗ trợ: ${SUPPORTED_TOOLS.map((t) => t.id).join(", ")}`));
    process.exit(1);
  }

  const validation = dryRun
    ? { valid: true, defaultModel: tool.defaultModel }
    : await validateApiKeyAndFetchModels(apiKey);
  if (!validation.valid) {
    console.error(chalk.red(`❌ ${(validation as { error?: string }).error || "Token không hợp lệ"}`));
    process.exit(1);
  }

  const resolvedModel =
    model ||
    (validation as { defaultModel?: string }).defaultModel ||
    tool.defaultModel;

  if (dryRun) {
    const preview = buildToolConfigPreview(toolId, apiKey, resolvedModel);
    console.log(chalk.bold.cyan(`\n🔍 Dry-run: ${tool.name} → ${tool.configFile}\n`));
    console.log(JSON.stringify(preview, null, 2));
    console.log(chalk.gray("\n(Không ghi file — bỏ --dry-run để áp dụng)\n"));
    process.exit(0);
  }

  const result = await syncTool(toolId, apiKey, resolvedModel);
  if (result.success) {
    console.log(chalk.green(`\n✅ ${result.message}`));
    console.log(chalk.gray(`   File: ${result.configPath}`));
    if (result.backupPath) {
      console.log(chalk.gray(`   Backup: ${result.backupPath}`));
    }
    console.log(chalk.cyan(`   Model: ${resolvedModel}\n`));
    process.exit(0);
  }

  console.error(chalk.red(`\n❌ ${result.message}`));
  if (result.error) console.error(chalk.red(`   ${result.error}`));
  process.exit(1);
}

async function runRestore(toolInput: string, backupPath?: string) {
  const toolId = resolveToolId(toolInput);
  const tool = getToolById(toolId);
  if (!tool) {
    console.error(chalk.red(`❌ Tool không hợp lệ: ${toolId}`));
    process.exit(1);
  }

  if (backupPath) {
    const target = resolveHomePath(tool.configFile);
    const { restored, target: restoredTarget } = await restoreFromBackup(backupPath, target);
    console.log(chalk.green(`\n✅ Đã khôi phục ${restoredTarget} từ ${restored}\n`));
    return;
  }

  const result = await resetTool(toolId);
  if (result.success) {
    console.log(chalk.green(`\n✅ ${result.message}`));
    if (result.backupPath) console.log(chalk.gray(`   Từ backup: ${result.backupPath}\n`));
    return;
  }

  const configPath = resolveHomePath(tool.configFile);
  const backups = await listBackupsForFile(configPath);
  console.error(chalk.red(`\n❌ ${result.message}`));
  if (backups.length > 0) {
    console.log(chalk.yellow("\nBackup có sẵn:"));
    backups.slice(0, 5).forEach((b) => console.log(chalk.gray(`  • ${b}`)));
  }
  process.exit(1);
}

program
  .name("stali")
  .description(
    "Interactive CLI tool and configuration manager for Stali API (https://api.stali.vn)"
  )
  .version(VERSION)
  .option("--lang <locale>", "Ngôn ngữ CLI: vi | en (hoặc STALI_LANG)")
  .option("-k, --key <token>", "Stali API Token để xác thực trực tiếp")
  .option("--models", "Xem nhanh danh sách và bảng giá model thời gian thực")
  .option("-r, --reset", "Xóa token đã lưu trong ~/.stali/config.json để đăng nhập lại")
  .option("--logout", "Đăng xuất / xóa token đã lưu")
  .hook("preAction", (thisCommand, actionCommand) => {
    const globals = actionCommand.optsWithGlobals?.() ?? thisCommand.opts();
    const lang = globals.lang || process.env.STALI_LANG;
    if (lang) setLocale(resolveLocale(String(lang)));
  })
  .action(async (options) => {
    if (options.reset || options.logout) {
      await resetStaliConfig();
      console.log(chalk.green("✅ Đã xóa token đã lưu trong ~/.stali/config.json thành công."));
      process.exit(0);
    }

    if (options.models) {
      await displayModelsTable(options.key);
      process.exit(0);
    }

    render(React.createElement(Wizard, { initialKey: options.key }));
  });

program
  .command("ls")
  .description("Xem nhanh bảng giá model thời gian thực (tương đương stali --models)")
  .option("-k, --key <token>", "Stali API Token")
  .action(async (opts) => {
    const globals = program.opts<{ key?: string }>();
    await displayModelsTable(opts.key || globals.key);
    process.exit(0);
  });

program
  .command("check")
  .description("Kiểm tra nhanh: auth + doctor (exit 1 nếu lỗi)")
  .option("--strict", "Yêu cầu 13/13 tool đã trỏ Stali")
  .option("--json", "Xuất JSON")
  .action(async (opts: { strict?: boolean; json?: boolean }) => {
    const result = await runHealthCheck(opts.strict);
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    console.log(chalk.bold.cyan(`\n${t("check_title")}\n`));
    for (const msg of result.messages) {
      console.log(` • ${msg}`);
    }
    console.log(result.ok ? chalk.green(`\n${t("check_ok")}\n`) : chalk.red(`\n${t("check_fail")}\n`));
    process.exit(result.ok ? 0 : 1);
  });

program
  .command("init")
  .description("Khởi tạo nhanh: auth login + configure-all (11 tool) + check")
  .option("-k, --key <token>", "Stali API key")
  .option("--skip-configure", "Chỉ lưu API key, không configure-all")
  .action(async (opts: { key?: string; skipConfigure?: boolean }) => {
    const globals = program.opts<{ key?: string }>();
    const apiKey = opts.key || globals.key;
    if (!apiKey?.trim()) {
      console.error(chalk.red(`❌ ${t("missing_key")}`));
      console.log(chalk.cyan(`\n${STALI_DASHBOARD_KEYS_URL}\n`));
      process.exit(1);
    }
    console.log(chalk.bold.cyan(`\n${t("init_title")}\n`));
    const result = await runInit({
      apiKey: apiKey.trim(),
      skipConfigure: opts.skipConfigure,
    });
    for (const step of result.steps) {
      const icon = step.ok ? chalk.green("✓") : chalk.red("✗");
      console.log(`${icon} ${step.name}${step.detail ? chalk.gray(` — ${step.detail}`) : ""}`);
    }
    console.log(result.success ? chalk.green(`\n✅ ${t("init_done")}\n`) : chalk.red("\n❌ Init incomplete\n"));
    process.exit(result.success ? 0 : 1);
  });

program
  .command("plugins")
  .description("Plugin tùy chỉnh (~/.stali/plugins.json)")
  .option("--init", "Tạo file plugins.json mẫu nếu chưa có")
  .action(async (opts: { init?: boolean }) => {
    if (opts.init) {
      const p = await writePluginsExample();
      console.log(chalk.green(`\n✅ Created: ${p}\n`));
    }
    const plugins = await loadPlugins();
    console.log(chalk.bold.cyan(`\n${t("plugins_title")}\n`));
    console.log(chalk.gray(`File: ${getPluginsPath()}\n`));
    if (plugins.length === 0) {
      console.log(chalk.yellow(`${t("plugins_empty")}\n`));
      console.log(chalk.gray("Create sample: stali plugins --init\n"));
      process.exit(0);
    }
    for (const p of plugins) {
      console.log(`• ${chalk.white(p.name)} (${p.id}) — ${p.protocol}`);
      console.log(chalk.gray(`  ${p.configFile}${p.description ? ` — ${p.description}` : ""}`));
    }
    console.log(chalk.gray("\n(Plugins have no auto-syncer yet — use export-env / guide)\n"));
    process.exit(0);
  });

const configCmd = program
  .command("config")
  .description("Xem cấu hình ~/.stali/config.json (masked)");

configCmd
  .command("show")
  .description("Hiển thị config đã lưu (API key masked)")
  .option("--json", "Xuất JSON (key masked)")
  .action(async (opts: { json?: boolean }) => {
    const { config, corrupt } = await loadStaliConfigOrCorrupt();
    if (corrupt) {
      console.error(chalk.red("❌ ~/.stali/config.json bị lỗi định dạng"));
      process.exit(1);
    }
    if (!config) {
      console.log(chalk.yellow("\n○ Chưa có config — stali auth login -k sk-stali-...\n"));
      process.exit(1);
    }
    const masked = { ...config, apiKey: maskToken(config.apiKey) };
    if (opts.json) {
      console.log(JSON.stringify(masked, null, 2));
      process.exit(0);
    }
    console.log(chalk.bold.cyan("\n⚙️  STALI CONFIG\n"));
    console.log(JSON.stringify(masked, null, 2));
    console.log("");
    process.exit(0);
  });

program
  .command("backups")
  .description("Liệt kê file backup .bak của tool")
  .option("-t, --tool <toolId>", "Chỉ một tool")
  .action(async (opts: { tool?: string }) => {
    await runBackupsList(opts.tool);
    process.exit(0);
  });

program
  .command("info")
  .description("Thông tin cài đặt stali-cli, auth và doctor tóm tắt")
  .option("--json", "Xuất JSON")
  .action(async (opts: { json?: boolean }) => {
    const info = await gatherCliInfo();
    if (opts.json) {
      console.log(JSON.stringify(info, null, 2));
      process.exit(0);
    }
    console.log(chalk.bold.cyan("\n📋 STALI CLI INFO\n"));
    console.log(`${chalk.white("Version")}     ${info.version}`);
    console.log(`${chalk.white("Platform")}    ${info.platform}`);
    if (info.bunVersion) console.log(`${chalk.white("Bun")}         ${info.bunVersion}`);
    const ver = await fetchLatestVersion();
    if (ver.updateAvailable) {
      console.log(
        `${chalk.white("Update")}     ${chalk.yellow(`${ver.current} → ${ver.latest} (stali update)`)}`
      );
    } else if (ver.source !== "error" && ver.source !== "unavailable") {
      console.log(`${chalk.white("Update")}     ${chalk.green("đã mới nhất")} (${ver.latest})`);
    }
    console.log(`${chalk.white("Home")}        ${info.staliHome}`);
    console.log(`${chalk.white("CLI")}         ${info.cliInstallDir}`);
    console.log(`${chalk.white("Bin")}         ${info.binDir}`);
    console.log(`${chalk.white("Config")}      ${info.configPath}${info.configExists ? "" : chalk.gray(" (chưa có)")}`);
    const authLine = info.auth.hasKey
      ? info.auth.valid
        ? chalk.green(`✓ ${info.auth.masked}`)
        : chalk.yellow(`○ ${info.auth.masked} (không hợp lệ)`)
      : chalk.gray("○ chưa đăng nhập");
    console.log(`${chalk.white("Auth")}        ${authLine}`);
    console.log(
      `${chalk.white("Doctor")}      ${chalk.green(info.doctor.configured)}/${info.doctor.total} tool trỏ Stali`
    );
    console.log("");
    process.exit(0);
  });

const authCmd = program
  .command("auth")
  .description("Quản lý API key Stali (~/.stali/config.json)");

authCmd
  .command("login")
  .description("Validate và lưu API key")
  .option("-k, --key <token>", "Stali API key (sk-stali-...)")
  .action(async (opts: { key?: string }) => {
    const globals = program.opts<{ key?: string }>();
    const apiKey = opts.key || globals.key;
    if (!apiKey?.trim()) {
      console.error(chalk.red("❌ Thiếu API key. Dùng: stali auth login -k sk-stali-..."));
      console.log(chalk.cyan(`\nTạo key: ${STALI_DASHBOARD_KEYS_URL}\n`));
      process.exit(1);
    }
    const result = await authLogin(apiKey);
    if (result.success) {
      console.log(chalk.green(`\n✅ ${result.message}`));
      if (result.defaultModel) {
        console.log(chalk.gray(`   Model mặc định API: ${result.defaultModel}\n`));
      }
      process.exit(0);
    }
    console.error(chalk.red(`\n❌ ${result.message}\n`));
    process.exit(1);
  });

authCmd
  .command("status")
  .description("Kiểm tra token đã lưu")
  .option("--json", "Xuất JSON")
  .action(async (opts: { json?: boolean }) => {
    const status = await authStatus();
    if (opts.json) {
      console.log(JSON.stringify(status, null, 2));
      process.exit(status.hasKey && status.valid !== false ? 0 : 1);
    }
    console.log(chalk.bold.cyan("\n🔑 STALI AUTH STATUS\n"));
    if (status.corrupt) {
      console.log(chalk.red("❌ ~/.stali/config.json bị lỗi định dạng"));
      process.exit(1);
    }
    if (!status.hasKey) {
      console.log(chalk.yellow("○ Chưa lưu API key"));
      console.log(chalk.cyan(`\nTạo key: ${STALI_DASHBOARD_KEYS_URL}`));
      console.log(chalk.gray("Lưu: stali auth login -k sk-stali-...\n"));
      process.exit(1);
    }
    const valid = status.valid ? chalk.green("hợp lệ") : chalk.red("không hợp lệ");
    console.log(`Token: ${chalk.yellow(status.masked)} — ${valid}`);
    if (status.lastUpdated) console.log(chalk.gray(`Cập nhật: ${status.lastUpdated}`));
    if (status.error) console.log(chalk.red(`Lỗi: ${status.error}`));
    console.log("");
    process.exit(status.valid ? 0 : 1);
  });

authCmd
  .command("logout")
  .description("Xóa token đã lưu")
  .action(async () => {
    const ok = await authLogout();
    if (ok) {
      console.log(chalk.green("\n✅ Đã xóa token ~/.stali/config.json\n"));
      process.exit(0);
    }
    console.log(chalk.yellow("\n○ Không có config để xóa\n"));
    process.exit(0);
  });

program
  .command("open [target]")
  .description("Mở trình duyệt: keys | docs")
  .action(async (target?: string) => {
    const t = (target || "keys").toLowerCase();
    const url =
      t === "docs" || t === "doc"
        ? STALI_DOCS_URL
        : STALI_DASHBOARD_KEYS_URL;
    const opened = openUrlInBrowser(url);
    if (opened.ok) {
      console.log(chalk.green(`\n✅ Đã mở: ${url}\n`));
      process.exit(0);
    }
    console.log(chalk.yellow(`\n⚠️  Không mở được trình duyệt — truy cập thủ công:`));
    console.log(chalk.cyan(`   ${url}\n`));
    process.exit(1);
  });

program
  .command("guide <app>")
  .description("Hướng dẫn gắn Stali cho app không patch file (cursor, chatbox, n8n)")
  .action((app: string) => {
    const text = renderAppGuide(app);
    if (!text) {
      console.error(chalk.red(`❌ Không có guide cho: ${app}`));
      console.log(chalk.gray(`Có sẵn: ${listGuideIds().join(", ")}\n`));
      process.exit(1);
    }
    console.log(text);
    process.exit(0);
  });

program
  .command("paths")
  .description("Hiển thị thư mục ~/.stali (cli, bin, config)")
  .action(async () => {
    await runPaths();
    process.exit(0);
  });

program
  .command("tools")
  .description("Liệt kê 13 công cụ AI và file config tương ứng")
  .action(async () => {
    await runToolsList();
    process.exit(0);
  });

program
  .command("export-env <tool>")
  .description("In biến môi trường / snippet cấu hình để copy thủ công")
  .option("-m, --model <model>", "Model Stali")
  .option(
    "-f, --format <format>",
    "Định dạng: shell | dotenv | json | powershell",
    "shell"
  )
  .action(async (tool: string, opts: { model?: string; format?: string }) => {
    const globals = program.opts<{ key?: string }>();
    const apiKey = await resolveApiKey(globals.key);
    if (!apiKey) {
      console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua wizard."));
      process.exit(1);
    }
    const toolId = resolveToolId(tool);
    const toolDef = getToolById(toolId);
    if (!toolDef) {
      console.error(chalk.red(`❌ Tool không hợp lệ: ${tool}`));
      process.exit(1);
    }
    const fmt = (opts.format || "shell") as ExportEnvFormat;
    if (!["shell", "dotenv", "json", "powershell"].includes(fmt)) {
      console.error(chalk.red(`❌ Format không hợp lệ: ${fmt}`));
      process.exit(1);
    }
    const model = opts.model || toolDef.defaultModel;
    console.log(renderEnvExport(toolId, apiKey, model, fmt));
    process.exit(0);
  });

program
  .command("doctor")
  .description("Kiểm tra công cụ nào đã trỏ Stali API")
  .option("--json", "Xuất JSON (cho script/automation)")
  .option("--fix", "Tự cấu hình lại tool chưa trỏ Stali")
  .option("--dry-run", "Với --fix: chỉ liệt kê, không ghi file")
  .option("--force", "Với --fix: cấu hình lại cả tool đã OK")
  .option("--tools <list>", "Với --fix: chỉ các tool (cách nhau bởi dấu phẩy)")
  .option("-m, --model <model>", "Với --fix: model áp dụng")
  .option("--watch", "Theo dõi liên tục (Ctrl+C thoát)")
  .option("--notify", "Với --watch: chuông + desktop notify khi thay đổi")
  .option("-i, --interval <seconds>", "Với --watch: chu kỳ giây (mặc định 10)", "10")
  .action(async (opts: {
    json?: boolean;
    fix?: boolean;
    dryRun?: boolean;
    force?: boolean;
    tools?: string;
    model?: string;
    watch?: boolean;
    notify?: boolean;
    interval?: string;
  }) => {
    const globals = program.opts<{ key?: string }>();
    const apiKey = await resolveApiKey(globals.key);
    if (opts.watch && !opts.fix) {
      const sec = parseInt(opts.interval || "10", 10) || 10;
      await runDoctorWatch(sec, opts.json, opts.notify);
      return;
    }
    await runDoctor(opts.json, {
      apiKey,
      fix: opts.fix,
      dryRun: opts.dryRun,
      force: opts.force,
      tools: opts.tools,
      model: opts.model,
    });
    process.exit(0);
  });

program
  .command("update")
  .description("Cập nhật stali-cli từ GitHub (~/.stali/cli)")
  .option("--check", "Chỉ kiểm tra phiên bản mới (không cập nhật)")
  .action(async (opts: { check?: boolean }) => {
    if (opts.check) {
      const ver = await fetchLatestVersion();
      console.log(chalk.bold.cyan("\n⬆️  STALI CLI VERSION CHECK\n"));
      console.log(`Hiện tại: ${chalk.white(ver.current)}`);
      console.log(`Mới nhất:  ${chalk.white(ver.latest)}`);
      if (ver.updateAvailable) {
        console.log(chalk.yellow(`\n${t("update_available")}\n`));
        process.exit(1);
      }
      console.log(chalk.green(`\n${t("update_latest")}\n`));
      process.exit(0);
    }
    console.log(chalk.cyan("\n⬇️  Đang cập nhật stali-cli…\n"));
    const result = await selfUpdate();
    if (result.success) {
      console.log(chalk.green(`✅ ${result.message}`));
      console.log(chalk.gray(`   Chạy lại: stali --version\n`));
      process.exit(0);
    }
    console.error(chalk.red(`❌ ${result.message}`));
    if (result.error) console.error(chalk.red(`   ${result.error}`));
    process.exit(1);
  });

program
  .command("configure <tool>")
  .description("Cấu hình non-interactive cho một công cụ AI")
  .option("-m, --model <model>", "Model Stali API")
  .option("--dry-run", "Xem preview config, không ghi file")
  .action(async (tool: string, opts: { model?: string; dryRun?: boolean }) => {
    const globals = program.opts<{ key?: string }>();
    const apiKey = await resolveApiKey(globals.key);
    if (!apiKey) {
      console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua wizard trước."));
      process.exit(1);
    }
    await runConfigure(tool, apiKey, opts.model, opts.dryRun);
  });

program
  .command("configure-all")
  .description("Cấu hình hàng loạt nhiều công cụ AI (mặc định 11 tool, bỏ claude/codex)")
  .option("-m, --model <model>", "Model áp dụng cho tất cả tool (mặc định: theo protocol từng tool)")
  .option("--tools <list>", "Danh sách tool cách nhau bởi dấu phẩy (vd: openclaw,cline,codex)")
  .option("--dry-run", "Xem preview, không ghi file")
  .option("--continue-on-error", "Tiếp tục khi một tool lỗi")
  .option("--skip-advanced", "Bỏ qua claude/codex (mặc định bật khi không chỉ định --tools)")
  .action(
    async (opts: {
      model?: string;
      tools?: string;
      dryRun?: boolean;
      continueOnError?: boolean;
      skipAdvanced?: boolean;
    }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = await resolveApiKey(globals.key);
      if (!apiKey) {
        console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua wizard trước."));
        process.exit(1);
      }

      const toolInputs = opts.tools
        ? opts.tools.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined;
      const skipAdvanced = toolInputs ? false : opts.skipAdvanced !== false;

      const { items, allOk } = await runConfigureBatch({
        apiKey,
        model: opts.model,
        toolInputs,
        dryRun: opts.dryRun,
        continueOnError: opts.continueOnError,
        skipAdvanced,
      });

      if (opts.dryRun) {
        console.log(chalk.bold.cyan("\n🔍 Dry-run configure-all\n"));
        for (const item of items) {
          const icon = item.success ? chalk.green("✓") : chalk.red("✗");
          console.log(`${icon} ${chalk.white(item.toolName || item.toolId)} — ${item.message}`);
          if (item.preview) {
            console.log(chalk.gray(JSON.stringify(item.preview, null, 2).slice(0, 400) + "…"));
          }
        }
        console.log(chalk.gray("\n(Không ghi file — bỏ --dry-run để áp dụng)\n"));
        process.exit(allOk ? 0 : 1);
      }

      console.log(chalk.bold.cyan("\n⚙️  CONFIGURE-ALL\n"));
      let ok = 0;
      for (const item of items) {
        const icon = item.success ? chalk.green("✓") : chalk.red("✗");
        if (item.success) ok++;
        console.log(`${icon} ${chalk.white(item.toolName)} — ${item.message}`);
        if (item.configPath) console.log(chalk.gray(`   ${item.configPath}`));
      }
      console.log(
        chalk.green(`\n✅ Thành công: ${ok}/${items.length}\n`)
      );
      process.exit(allOk ? 0 : 1);
    }
  );

program
  .command("completion <shell>")
  .description("In script shell completion (bash | zsh | fish)")
  .action((shell: string) => {
    const script = renderCompletion(shell);
    if (!script) {
      console.error(chalk.red(`❌ Shell không hỗ trợ: ${shell}. Dùng: bash, zsh, fish`));
      process.exit(1);
    }
    console.log(script);
    process.exit(0);
  });

program
  .command("uninstall")
  .description("Gỡ stali-cli (wrapper ~/.stali/bin, tùy chọn giữ config/source)")
  .option("--keep-config", "Giữ ~/.stali/config.json (API key)")
  .option("--keep-source", "Giữ ~/.stali/cli (source)")
  .option("--purge-path", "Gỡ ~/.stali/bin khỏi User PATH (Windows)")
  .action(async (opts: { keepConfig?: boolean; keepSource?: boolean; purgePath?: boolean }) => {
    console.log(chalk.bold.yellow("\n🗑️  STALI CLI — UNINSTALL\n"));
    const result = await runUninstall({
      keepConfig: opts.keepConfig,
      keepSource: opts.keepSource,
      purgePath: opts.purgePath,
    });
    if (result.removed.length > 0) {
      console.log(chalk.green(`✅ ${result.message}\n`));
      console.log(chalk.gray("Đã xóa:"));
      result.removed.forEach((p) => console.log(chalk.gray(`  • ${p}`)));
    } else {
      console.log(chalk.yellow(result.message));
    }
    if (result.skipped.length > 0) {
      console.log(chalk.gray("\nGiữ lại:"));
      result.skipped.forEach((p) => console.log(chalk.gray(`  • ${p}`)));
    }
    if (result.pathNote) {
      console.log(chalk.cyan(`\n💡 ${result.pathNote}\n`));
    }
    process.exit(result.success ? 0 : 1);
  });

program
  .command("restore")
  .description("Khôi phục config từ backup gần nhất")
  .requiredOption("-t, --tool <toolId>", "ID công cụ (vd: claude, codex, openclaw)")
  .option("-b, --backup <path>", "Đường dẫn file .bak cụ thể")
  .action(async (opts: { tool: string; backup?: string }) => {
    await runRestore(opts.tool, opts.backup);
    process.exit(0);
  });

program.parse(process.argv);
