import chalk from "chalk";
import { gatherCliInfo } from "./cli-info";
import { STALI_DASHBOARD_KEYS_URL } from "./auth-cli";

export interface StatusDisplayOptions {
  json?: boolean;
  validateAuth?: boolean;
}

export async function runUserStatus(opts?: StatusDisplayOptions): Promise<number> {
  const info = await gatherCliInfo({
    offline: !opts?.validateAuth,
    validateAuth: opts?.validateAuth ?? false,
    checkNpm: false,
    skipPluginScan: true,
    skipBunVersion: true,
  });

  if (opts?.json) {
    console.log(
      JSON.stringify(
        {
          ok: info.setup?.ready ?? false,
          setup: info.setup,
          auth: info.auth,
          gateway: {
            installed: info.gateway.installed,
            configured: info.gateway.configured,
            pending: info.gateway.pending,
          },
          version: info.version,
        },
        null,
        2
      )
    );
    return info.setup?.ready ? 0 : 1;
  }

  console.log(chalk.bold.cyan("\n📋 STALI STATUS\n"));

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

  if (info.setup?.ready) {
    console.log(chalk.green("\n✅ Sẵn sàng — mở app AI và dùng ngay.\n"));
    console.log(chalk.gray("  stali doctor   # kiểm tra chi tiết\n"));
    return 0;
  }

  console.log(chalk.cyan(`\n→ Tiếp theo: ${info.setup?.nextCommand ?? "stali gw"}\n`));
  return 1;
}
