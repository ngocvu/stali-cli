import chalk from "chalk";
import { gatherCliInfo } from "./cli-info";
import { STALI_DASHBOARD_KEYS_URL } from "./auth-cli";
import { formatUserStatusJson, type StatusCommand } from "./status-json";

export interface StatusDisplayOptions {
  json?: boolean;
  validateAuth?: boolean;
  /** `ready` đổi tiêu đề human + field `command` trong JSON */
  command?: StatusCommand;
}

export async function runUserStatus(opts?: StatusDisplayOptions): Promise<number> {
  const command = opts?.command ?? "status";
  const info = await gatherCliInfo({
    offline: !opts?.validateAuth,
    validateAuth: opts?.validateAuth ?? false,
    checkNpm: false,
    skipPluginScan: true,
    skipBunVersion: true,
  });

  if (opts?.json) {
    console.log(JSON.stringify(formatUserStatusJson(info, command), null, 2));
    return info.setup?.ready ? 0 : 1;
  }

  const title = command === "ready" ? "📋 STALI READY" : "📋 STALI STATUS";
  console.log(chalk.bold.cyan(`\n${title}\n`));

  if (!info.auth.hasKey) {
    console.log(chalk.yellow("○ Chưa có API key"));
    console.log(chalk.cyan(`\n  stali -k sk-stali-...`));
    console.log(chalk.gray(`  ${STALI_DASHBOARD_KEYS_URL}\n`));
    return 1;
  }

  const authLabel = info.auth.valid === false ? chalk.red("không hợp lệ") : chalk.green("OK");
  console.log(`API key: ${chalk.yellow(info.auth.masked ?? "—")} — ${authLabel}`);
  console.log(
    `Gateway: ${chalk.white(String(info.gateway.configured))}/${info.gateway.installed} app đã cấu hình` +
      (info.gateway.pending > 0 ? chalk.yellow(` · ${info.gateway.pending} cần cài`) : chalk.green(" · đủ"))
  );
  if (info.gateway.pendingGatewayCount > 0) {
    const names = info.gateway.tools
      .filter((t) => !t.configured)
      .map((t) => t.name)
      .join(", ");
    console.log(chalk.yellow(`  Gateway chờ: ${names || info.gateway.pendingGateway.join(", ")}`));
  }

  if (info.setup?.ready) {
    console.log(chalk.green("\n✅ Sẵn sàng — mở app AI và dùng ngay.\n"));
    console.log(chalk.gray("  stali doctor   # kiểm tra chi tiết\n"));
    return 0;
  }

  console.log(chalk.cyan(`\n→ Tiếp theo: ${info.setup?.nextCommand ?? "stali gw"}\n`));
  return 1;
}
