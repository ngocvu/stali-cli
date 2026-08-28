import chalk from "chalk";
import { runGatewayInstall, runGatewayScan } from "../services/gateway-install";

export async function runGatewayCommand(
  sub: string | undefined,
  opts: {
    json?: boolean;
    dryRun?: boolean;
    all?: boolean;
    force?: boolean;
    model?: string;
    continueOnError?: boolean;
    includePlugins?: boolean;
    noPlugins?: boolean;
  },
  apiKey?: string
): Promise<void> {
  const action = (sub || "scan").toLowerCase();

  if (action === "scan") {
    await runGatewayScan({ json: opts.json });
    process.exit(0);
  }

  if (action === "install") {
    if (!apiKey?.trim()) {
      console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua stali auth login."));
      process.exit(1);
    }

    const { resolveIncludePluginsFromHome } = await import("../utils/include-plugins");
    const includePlugins = await resolveIncludePluginsFromHome({
      includePlugins: opts.includePlugins,
      noPlugins: opts.noPlugins,
    });

    const { items, allOk, targets } = await runGatewayInstall({
      apiKey: apiKey.trim(),
      model: opts.model,
      dryRun: opts.dryRun,
      all: opts.all,
      force: opts.force,
      continueOnError: opts.continueOnError,
      includePlugins,
    });

    if (opts.dryRun) {
      console.log(chalk.bold.cyan("\n🔍 Gateway install (dry-run)\n"));
    } else {
      console.log(chalk.bold.cyan("\n🌐 STALI GATEWAY INSTALL\n"));
      if (targets.length > 0) {
        console.log(chalk.gray(`Targets: ${targets.join(", ")}\n`));
      }
    }

    for (const item of items) {
      const icon = item.success ? chalk.green("✓") : chalk.red("✗");
      console.log(`${icon} ${chalk.white(item.toolName || item.toolId)} — ${item.message}`);
      if (item.configPath) console.log(chalk.gray(`   ${item.configPath}`));
    }
    console.log("");
    process.exit(allOk ? 0 : 1);
  }

  console.error(chalk.red(`❌ Lệnh gateway không hợp lệ: ${action}`));
  console.log(chalk.cyan("  stali gateway scan [--json]"));
  console.log(chalk.cyan("  stali gateway install [-k] [--dry-run] [--all] [--force]\n"));
  process.exit(1);
}
