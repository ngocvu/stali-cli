import chalk from "chalk";
import { runDoctorScan } from "../services/syncers";
import {
  getStaliBinDir,
  getStaliCliInstallDir,
  getStaliHome,
  getStaliConfigPath,
} from "../constants/paths";

export async function runPaths() {
  console.log(chalk.bold.cyan("\n📁 STALI PATHS\n"));
  console.log(`${chalk.white("Home")}     ${getStaliHome()}`);
  console.log(`${chalk.white("CLI")}      ${getStaliCliInstallDir()}`);
  console.log(`${chalk.white("Bin")}      ${getStaliBinDir()}`);
  console.log(`${chalk.white("Config")}   ${getStaliConfigPath()}`);
  console.log(chalk.gray("\nThêm vào PATH nếu lệnh stali chưa nhận:"));
  console.log(chalk.yellow(`  export PATH="${getStaliBinDir()}:$PATH"`));
  console.log("");
}

export async function runToolsList() {
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
