import chalk from "chalk";
import { validateApiKeyAndFetchModels } from "../services/api";
import { loadStaliConfig } from "../services/config";
import { syncTool, resetTool } from "../services/syncers";
import { buildToolConfigPreview } from "../services/syncers/preview";
import { SUPPORTED_TOOLS } from "../constants/tools";
import { getToolById, resolveToolId } from "../utils/tool-utils";
import { resolveHomePath } from "../utils/file";
import { restoreFromBackup, listBackupsForFile } from "../utils/backup";

export async function runConfigure(
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

  const cfg = await loadStaliConfig();
  const baseUrl = cfg?.baseUrl;

  const validation = dryRun
    ? { valid: true, defaultModel: tool.defaultModel }
    : await validateApiKeyAndFetchModels(apiKey, { baseUrl });
  if (!validation.valid) {
    console.error(chalk.red(`❌ ${(validation as { error?: string }).error || "Token không hợp lệ"}`));
    process.exit(1);
  }

  const resolvedModel =
    model ||
    (validation as { defaultModel?: string }).defaultModel ||
    tool.defaultModel;

  if (dryRun) {
    const preview = buildToolConfigPreview(toolId, apiKey, resolvedModel, baseUrl);
    console.log(chalk.bold.cyan(`\n🔍 Dry-run: ${tool.name} → ${tool.configFile}\n`));
    console.log(JSON.stringify(preview, null, 2));
    console.log(chalk.gray("\n(Không ghi file — bỏ --dry-run để áp dụng)\n"));
    process.exit(0);
  }

  const result = await syncTool(toolId, apiKey, resolvedModel, { baseUrl });
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

export async function runRestore(toolInput: string, backupPath?: string) {
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
