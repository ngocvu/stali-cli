import chalk from "chalk";
import type { InitOptions, InitResult } from "./init-cli";
import { STALI_DASHBOARD_KEYS_URL } from "./auth-cli";
import { VERSION } from "../version";
import { deriveSetupNextCommand, ONBOARDING_DOC_URL } from "./user-cli";

export function formatSetupJson(result: InitResult): Record<string, unknown> {
  const pendingGateway = result.gateway?.pendingGateway ?? [];
  const pendingGatewayCount = result.gateway?.pendingGatewayCount ?? 0;
  return {
    command: "setup",
    schemaVersion: 2,
    ok: result.success,
    version: VERSION,
    durationMs: result.durationMs,
    nextCommand: deriveSetupNextCommand(result),
    steps: result.steps,
    pendingGateway,
    pendingGatewayCount,
    gateway: result.gateway,
    onboardingDoc: ONBOARDING_DOC_URL,
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
  const next = deriveSetupNextCommand(result);
  if (result.success) {
    const timing =
      result.durationMs !== undefined ? chalk.gray(` (${result.durationMs}ms)`) : "";
    console.log(chalk.green(`\n✅ ${done}${timing}\n`));
    console.log(chalk.gray("Tiếp theo:"));
    console.log(chalk.cyan(`  ${next}`));
    console.log(chalk.cyan("  stali doctor           # kiểm tra chi tiết"));
    console.log(chalk.gray(`  Hướng dẫn: ${ONBOARDING_DOC_URL}`));
    console.log(chalk.cyan(`  ${STALI_DASHBOARD_KEYS_URL}`));
    console.log("");
  } else {
    console.log(chalk.red("\n❌ Setup chưa hoàn tất — xem bước lỗi ở trên.\n"));
    console.log(chalk.cyan(`→ Thử: ${next}\n`));
    console.log(chalk.gray(`API key: ${STALI_DASHBOARD_KEYS_URL}\n`));
  }
}

export async function runSetupCommand(
  apiKey: string,
  opts: {
    skipConfigure?: boolean;
    includePlugins?: boolean;
    noPlugins?: boolean;
    allApps?: boolean;
    json?: boolean;
    title?: string;
    done?: string;
  }
): Promise<number> {
  const { runUserSetup } = await import("./init-cli");
  const result = await runUserSetup({
    apiKey: apiKey.trim(),
    skipConfigure: opts.skipConfigure,
    includePlugins: opts.includePlugins,
    noPlugins: opts.noPlugins,
    installedOnly: !opts.allApps,
  } satisfies InitOptions);
  if (opts.json) {
    console.log(JSON.stringify(formatSetupJson(result), null, 2));
  } else {
    printSetupResult(result, { title: opts.title, done: opts.done });
  }
  return result.success ? 0 : 1;
}
