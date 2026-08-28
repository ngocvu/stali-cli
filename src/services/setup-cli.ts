import chalk from "chalk";
import type { InitResult } from "./init-cli";
import { STALI_DASHBOARD_KEYS_URL } from "./auth-cli";

export function formatSetupJson(result: InitResult): Record<string, unknown> {
  return {
    ok: result.success,
    steps: result.steps,
  };
}

export function printSetupResult(result: InitResult, opts?: { title?: string; done?: string }): void {
  const title = opts?.title ?? "⚡ STALI SETUP";
  const done = opts?.done ?? "Stali API đã sẵn sàng — mở app AI và dùng ngay.";
  console.log(chalk.bold.cyan(`\n${title}\n`));
  for (const step of result.steps) {
    const icon = step.ok ? chalk.green("✓") : chalk.red("✗");
    console.log(`${icon} ${step.name}${step.detail ? chalk.gray(` — ${step.detail}`) : ""}`);
  }
  if (result.success) {
    console.log(chalk.green(`\n✅ ${done}\n`));
    console.log(chalk.gray("Tiếp theo:"));
    console.log(chalk.cyan("  stali doctor          # kiểm tra cấu hình"));
    console.log(chalk.cyan("  stali gw              # cài thêm gateway nếu cần"));
    console.log(chalk.cyan(`  ${STALI_DASHBOARD_KEYS_URL}`));
    console.log("");
  } else {
    console.log(chalk.red("\n❌ Setup chưa hoàn tất — xem bước lỗi ở trên.\n"));
    console.log(chalk.gray(`Lấy API key: ${STALI_DASHBOARD_KEYS_URL}\n`));
  }
}
