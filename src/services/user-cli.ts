import chalk from "chalk";
import { VERSION } from "../version";
import { STALI_DASHBOARD_KEYS_URL } from "./auth-cli";

export function printUserQuickReference(): void {
  console.log(chalk.bold.cyan(`\n⚡ STALI CLI v${VERSION} — USER\n`));
  console.log(chalk.white("Cài & setup (khuyến nghị)"));
  console.log(chalk.cyan("  npm install -g stali-cli@latest"));
  console.log(chalk.cyan("  stali -k sk-stali-...          # nhanh nhất"));
  console.log(chalk.cyan("  stali setup -k sk-stali-...    # tương đương"));
  console.log(chalk.cyan("  stali onboard -k sk-stali-...  # alias setup\n"));
  console.log(chalk.white("Kiểm tra"));
  console.log(chalk.cyan("  stali status / stali ready     # trạng thái nhanh"));
  console.log(chalk.cyan("  stali check                    # mặc định nhanh (--full = đầy đủ)"));
  console.log(chalk.cyan("  stali doctor                   # chi tiết 13 tool\n"));
  console.log(chalk.white("Gateway"));
  console.log(chalk.cyan("  stali gw                       # auto cài app đang dùng"));
  console.log(chalk.cyan("  stali gateway scan             # xem app phát hiện\n"));
  console.log(chalk.gray(`API key: ${STALI_DASHBOARD_KEYS_URL}\n`));
}

export function deriveSetupNextCommand(result: {
  success: boolean;
  steps: { name: string; ok: boolean }[];
}): string {
  if (!result.success) {
    const auth = result.steps.find((s) => s.name === "auth login");
    if (auth && !auth.ok) return "stali setup -k sk-stali-...";
    const gw = result.steps.find((s) => s.name === "gateway auto");
    if (gw && !gw.ok) return "stali gw";
    return "stali doctor";
  }
  return "stali status";
}
