import chalk from "chalk";
import { runGatewayAuto, runGatewayInstall, runGatewayPlan, runGatewayScan } from "../services/gateway-install";

/** Khi không chỉ định subcommand: auto nếu đã có key, scan nếu chưa. */
export function resolveGatewayAction(sub: string | undefined, apiKey?: string): string {
  if (sub?.trim()) return sub.trim().toLowerCase();
  return apiKey?.trim() ? "auto" : "scan";
}

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
    yes?: boolean;
  },
  apiKey?: string
): Promise<void> {
  const action = resolveGatewayAction(sub, apiKey);

  if (action === "scan") {
    await runGatewayScan({ json: opts.json, command: "gateway-scan" });
    process.exit(0);
  }

  if (action === "plan") {
    await runGatewayPlan({
      json: opts.json,
      all: opts.all,
      force: opts.force,
    });
    process.exit(0);
  }

  if (action === "auto") {
    try {
      const { resolveIncludePluginsFromHome } = await import("../utils/include-plugins");
      const includePlugins = await resolveIncludePluginsFromHome({
        includePlugins: opts.includePlugins,
        noPlugins: opts.noPlugins,
      });
      const result = await runGatewayAuto({
        apiKey: apiKey?.trim() || "",
        model: opts.model,
        dryRun: opts.dryRun,
        all: opts.all,
        force: opts.force,
        continueOnError: opts.continueOnError,
        includePlugins,
        json: opts.json,
        yes: opts.yes,
      });
      const ok = result.install ? result.install.allOk : true;
      process.exit(ok ? 0 : 1);
    } catch {
      process.exit(1);
    }
  }

  if (action === "install") {
    if (!apiKey?.trim()) {
      if (opts.json) {
        console.log(
          JSON.stringify({ ok: false, error: "missing_api_key", dryRun: Boolean(opts.dryRun) }, null, 2)
        );
      } else {
        console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua stali auth login."));
      }
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
      yes: opts.yes,
    });

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            ok: allOk,
            dryRun: Boolean(opts.dryRun),
            targets,
            all: Boolean(opts.all),
            force: Boolean(opts.force),
            includePlugins,
            items,
          },
          null,
          2
        )
      );
      process.exit(allOk ? 0 : 1);
    }

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
  console.log(chalk.cyan("  stali gateway plan [--json] [--all] [--force]"));
  console.log(chalk.cyan("  stali gateway auto [-k] [--dry-run] [--json] [--all] [--force]"));
  console.log(chalk.cyan("  stali gateway install [-k] [--dry-run] [--json] [--all] [--force]\n"));
  process.exit(1);
}
