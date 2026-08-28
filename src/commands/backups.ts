import chalk from "chalk";
import { SUPPORTED_TOOLS } from "../constants/tools";
import { getToolById, resolveToolId } from "../utils/tool-utils";
import { resolveHomePath } from "../utils/file";
import { listBackupsForFile } from "../utils/backup";

export async function runBackupsList(toolInput?: string) {
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
