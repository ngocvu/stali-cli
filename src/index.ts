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
import { restoreFromBackup, listBackupsForFile } from "./utils/backup";
import { getToolById } from "./utils/tool-utils";
import { resolveHomePath } from "./utils/file";
import { VERSION } from "./version";
import { SUPPORTED_TOOLS } from "./constants/tools";

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

async function runDoctor() {
  const statuses = await runDoctorScan();
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
    console.log(chalk.gray(`   ${s.configPath}`));
  }
  console.log("");
}

async function runConfigure(toolId: string, apiKey: string, model?: string) {
  const tool = getToolById(toolId);
  if (!tool) {
    console.error(chalk.red(`❌ Tool không hợp lệ: ${toolId}`));
    console.log(chalk.gray(`Các tool hỗ trợ: ${SUPPORTED_TOOLS.map((t) => t.id).join(", ")}`));
    process.exit(1);
  }

  const validation = await validateApiKeyAndFetchModels(apiKey);
  if (!validation.valid) {
    console.error(chalk.red(`❌ ${validation.error || "Token không hợp lệ"}`));
    process.exit(1);
  }

  const resolvedModel =
    model ||
    validation.defaultModel ||
    tool.defaultModel;

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

async function runRestore(toolId: string, backupPath?: string) {
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
  .option("-k, --key <token>", "Stali API Token để xác thực trực tiếp")
  .option("-m, --models", "Xem nhanh danh sách và bảng giá model thời gian thực")
  .option("-r, --reset", "Xóa token đã lưu trong ~/.stali/config.json để đăng nhập lại")
  .option("--logout", "Đăng xuất / xóa token đã lưu")
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
  .command("doctor")
  .description("Kiểm tra công cụ nào đã trỏ Stali API")
  .action(async () => {
    await runDoctor();
    process.exit(0);
  });

program
  .command("configure <tool>")
  .description("Cấu hình non-interactive cho một công cụ AI")
  .option("-m, --model <model>", "Model Stali API")
  .action(async (tool: string, opts: { model?: string }) => {
    const globals = program.opts<{ key?: string }>();
    const apiKey = await resolveApiKey(globals.key);
    if (!apiKey) {
      console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua wizard trước."));
      process.exit(1);
    }
    await runConfigure(tool, apiKey, opts.model);
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
