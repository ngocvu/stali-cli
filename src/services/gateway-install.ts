import chalk from "chalk";
import { loadStaliConfig } from "./config";
import { runConfigureBatch, type ConfigureBatchItem } from "./configure-batch";
import {
  discoverInstalledTools,
  formatDiscoverySignal,
  type ToolDiscoveryEntry,
} from "./tool-discovery";
import { SUPPORTED_TOOLS } from "../constants/tools";

export interface GatewayScanOptions {
  json?: boolean;
}

export interface GatewayInstallOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  dryRun?: boolean;
  /** Cấu hình cả 13 tool (bỏ qua quét) */
  all?: boolean;
  /** Ghi đè cả tool đã trỏ Stali */
  force?: boolean;
  continueOnError?: boolean;
  includePlugins?: boolean;
}

export async function runGatewayScan(opts?: GatewayScanOptions): Promise<ToolDiscoveryEntry[]> {
  const entries = await discoverInstalledTools();
  if (opts?.json) {
    console.log(JSON.stringify({ tools: entries }, null, 2));
    return entries;
  }

  const installed = entries.filter((e) => e.installed);
  const onStali = installed.filter((e) => e.configuredForStali);
  const needsGateway = installed.filter((e) => !e.configuredForStali);

  console.log(chalk.bold.cyan("\n🌐 STALI GATEWAY — QUÉT ỨNG DỤNG AI\n"));
  console.log(
    `Phát hiện: ${chalk.white(String(installed.length))}/${SUPPORTED_TOOLS.length} đang dùng · ` +
      `${chalk.green(String(onStali.length))} đã gateway · ` +
      `${chalk.yellow(String(needsGateway.length))} cần cài\n`
  );

  for (const e of entries) {
    if (!e.installed) {
      console.log(chalk.gray(`  ○ ${e.toolName} — không phát hiện`));
      continue;
    }
    const sig = formatDiscoverySignal(e.signals);
    const gw = e.configuredForStali ? chalk.green("gateway OK") : chalk.yellow("chưa gateway");
    console.log(`  ${e.configuredForStali ? chalk.green("✓") : chalk.yellow("!")} ${chalk.white(e.toolName)} ${chalk.gray(`(${sig})`)} — ${gw}`);
    if (e.binaryPath) console.log(chalk.gray(`      binary: ${e.binaryPath}`));
  }

  if (needsGateway.length > 0) {
    console.log(
      chalk.cyan(
        `\n💡 Cài gateway: stali gateway install -k sk-stali-...\n` +
          `   Hoặc: stali doctor --fix --installed-only\n`
      )
    );
  } else if (installed.length > 0) {
    console.log(chalk.green("\n✅ Mọi app đang dùng đã trỏ Stali gateway.\n"));
  } else {
    console.log(
      chalk.yellow(
        "\n⚠️  Không phát hiện app nào. Cài một CLI agent rồi chạy lại, hoặc: stali gateway install --all\n"
      )
    );
  }

  return entries;
}

export async function runGatewayInstall(
  opts: GatewayInstallOptions
): Promise<{ items: ConfigureBatchItem[]; allOk: boolean; targets: string[] }> {
  const discovery = await discoverInstalledTools();
  let targets: string[];

  if (opts.all) {
    targets = SUPPORTED_TOOLS.map((t) => t.id);
  } else {
    targets = discovery.filter((e) => e.installed).map((e) => e.toolId);
    if (!opts.force) {
      targets = targets.filter((id) => {
        const e = discovery.find((d) => d.toolId === id);
        return !e?.configuredForStali;
      });
    }
  }

  if (targets.length === 0) {
    const msg = opts.all
      ? "Không có tool để cấu hình"
      : "Không có app cần cài gateway (đã OK hoặc chưa phát hiện app nào)";
    return {
      items: [{ toolId: "", toolName: "", success: true, message: msg }],
      allOk: true,
      targets: [],
    };
  }

  const cfg = await loadStaliConfig();
  const batch = await runConfigureBatch({
    apiKey: opts.apiKey,
    model: opts.model,
    baseUrl: opts.baseUrl ?? cfg?.baseUrl,
    toolInputs: targets,
    dryRun: opts.dryRun,
    continueOnError: opts.continueOnError ?? true,
    skipAdvanced: false,
    includePlugins: opts.includePlugins,
  });

  return { ...batch, targets };
}
