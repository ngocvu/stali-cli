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
import { restoreFromBackup, listBackupsForFile } from "./utils/backup";
import { getToolById, resolveToolId } from "./utils/tool-utils";
import { resolveHomePath } from "./utils/file";
import { VERSION } from "./version";
import { getStaliBinDir, getStaliCliInstallDir, getStaliHome, getStaliConfigPath } from "./constants/paths";
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
  .option("-k, --key <token>", "Stali API Token để xác thực trực tiếp")
  .option("--models", "Xem nhanh danh sách và bảng giá model thời gian thực")
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
  .action(async (opts: {
    json?: boolean;
    fix?: boolean;
    dryRun?: boolean;
    force?: boolean;
    tools?: string;
    model?: string;
  }) => {
    const globals = program.opts<{ key?: string }>();
    const apiKey = await resolveApiKey(globals.key);
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
  .action(async () => {
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
  .action(async (opts: { keepConfig?: boolean; keepSource?: boolean }) => {
    console.log(chalk.bold.yellow("\n🗑️  STALI CLI — UNINSTALL\n"));
    const result = await runUninstall({
      keepConfig: opts.keepConfig,
      keepSource: opts.keepSource,
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
