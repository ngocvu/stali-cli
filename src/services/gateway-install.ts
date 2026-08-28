import chalk from "chalk";
import { loadStaliConfig } from "./config";
import type { ValidateResult } from "./api";
import { runConfigureBatch, type ConfigureBatchItem } from "./configure-batch";
import {
  discoverInstalledTools,
  formatDiscoverySignal,
  type ToolDiscoveryEntry,
} from "./tool-discovery";
import { SUPPORTED_TOOLS } from "../constants/tools";
import { formatGatewayPlanJson, formatGatewayScanJson, type ScanCommand } from "./scan-json";

export interface GatewayScanOptions {
  json?: boolean;
  /** Phân biệt `stali scan` vs `stali gateway scan` trong JSON. */
  command?: ScanCommand;
}

export interface GatewayInstallOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  dryRun?: boolean;
  /** Không in banner kế hoạch — chạy ngay (CI/script). */
  yes?: boolean;
  /** Cấu hình cả 13 tool (bỏ qua quét) */
  all?: boolean;
  /** Ghi đè cả tool đã trỏ Stali */
  force?: boolean;
  continueOnError?: boolean;
  includePlugins?: boolean;
  /** Discovery đã quét (setup song song auth + scan). */
  discovery?: ToolDiscoveryEntry[];
  /** Validation đã có từ auth — bỏ GET /v1/models lần 2. */
  prefetchedValidation?: ValidateResult;
}

export interface GatewayPlanOptions {
  all?: boolean;
  force?: boolean;
}

export interface GatewayPlan {
  summary: {
    totalTools: number;
    installed: number;
    configured: number;
    pending: number;
  };
  targets: string[];
  skipped: Array<{ toolId: string; toolName: string; reason: string }>;
  tools: ToolDiscoveryEntry[];
}

export function resolveGatewayTargets(
  discovery: ToolDiscoveryEntry[],
  opts: GatewayPlanOptions
): { targets: string[]; skipped: GatewayPlan["skipped"] } {
  const skipped: GatewayPlan["skipped"] = [];
  let targets: string[];

  if (opts.all) {
    targets = SUPPORTED_TOOLS.map((t) => t.id);
    for (const tool of SUPPORTED_TOOLS) {
      const entry = discovery.find((d) => d.toolId === tool.id);
      if (!opts.force && entry?.configuredForStali) {
        skipped.push({
          toolId: tool.id,
          toolName: tool.name,
          reason: "already_configured",
        });
      }
    }
    if (!opts.force) {
      targets = targets.filter((id) => {
        const entry = discovery.find((d) => d.toolId === id);
        return !entry?.configuredForStali;
      });
    }
    return { targets, skipped };
  }

  const installed = discovery.filter((e) => e.installed);
  targets = installed.map((e) => e.toolId);

  for (const e of installed) {
    if (!opts.force && e.configuredForStali) {
      skipped.push({
        toolId: e.toolId,
        toolName: e.toolName,
        reason: "already_configured",
      });
    }
  }

  if (!opts.force) {
    targets = targets.filter((id) => {
      const e = discovery.find((d) => d.toolId === id);
      return !e?.configuredForStali;
    });
  }

  for (const e of discovery.filter((d) => !d.installed)) {
    skipped.push({
      toolId: e.toolId,
      toolName: e.toolName,
      reason: "not_installed",
    });
  }

  return { targets, skipped };
}

export async function planGatewayInstall(
  opts?: GatewayPlanOptions & { discovery?: ToolDiscoveryEntry[] }
): Promise<GatewayPlan> {
  const discovery = opts?.discovery ?? (await discoverInstalledTools());
  return buildGatewayPlan(discovery, opts);
}

/** Tạo kế hoạch gateway từ discovery đã quét (tránh quét lại). */
export function buildGatewayPlan(
  discovery: ToolDiscoveryEntry[],
  opts?: GatewayPlanOptions
): GatewayPlan {
  const installed = discovery.filter((e) => e.installed);
  const configured = installed.filter((e) => e.configuredForStali);
  const { targets, skipped } = resolveGatewayTargets(discovery, opts ?? {});

  return {
    summary: {
      totalTools: SUPPORTED_TOOLS.length,
      installed: installed.length,
      configured: configured.length,
      pending: installed.length - configured.length,
    },
    targets,
    skipped,
    tools: discovery,
  };
}

export async function runGatewayScan(opts?: GatewayScanOptions): Promise<ToolDiscoveryEntry[]> {
  const entries = await discoverInstalledTools();
  if (opts?.json) {
    console.log(
      JSON.stringify(formatGatewayScanJson(entries, opts.command ?? "scan"), null, 2)
    );
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
        `\n💡 Cài gateway: stali -k sk-stali-...  hoặc  stali gw\n` +
          `   Quét lại: stali scan\n`
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

export async function runGatewayPlan(opts?: {
  json?: boolean;
  all?: boolean;
  force?: boolean;
}): Promise<GatewayPlan> {
  const plan = await planGatewayInstall({ all: opts?.all, force: opts?.force });

  if (opts?.json) {
    console.log(JSON.stringify(formatGatewayPlanJson(plan), null, 2));
    return plan;
  }

  console.log(chalk.bold.cyan("\n📋 STALI GATEWAY — KẾ HOẠCH CÀI\n"));
  console.log(
    `Phát hiện: ${chalk.white(String(plan.summary.installed))}/${plan.summary.totalTools} · ` +
      `${chalk.green(String(plan.summary.configured))} đã gateway · ` +
      `${chalk.yellow(String(plan.targets.length))} sẽ cài\n`
  );

  if (plan.targets.length > 0) {
    console.log(chalk.white("Targets:"));
    for (const id of plan.targets) {
      const e = plan.tools.find((t) => t.toolId === id);
      const sig = e ? formatDiscoverySignal(e.signals) : "";
      console.log(`  • ${e?.toolName || id} ${chalk.gray(`(${sig})`)}`);
    }
    console.log(chalk.cyan(`\nChạy: stali gateway auto -k sk-stali-...\n`));
  } else {
    console.log(chalk.green("✅ Không có app cần cài gateway.\n"));
  }

  return plan;
}

export interface GatewayAutoOptions extends GatewayInstallOptions {
  json?: boolean;
}

export interface GatewayAutoResult {
  plan: GatewayPlan;
  install?: { items: ConfigureBatchItem[]; allOk: boolean; targets: string[] };
}

/** Quét app đang dùng → cài gateway cho mọi target (một lệnh). */
export async function runGatewayAuto(opts: GatewayAutoOptions): Promise<GatewayAutoResult> {
  const plan = opts.discovery
    ? buildGatewayPlan(opts.discovery, { all: opts.all, force: opts.force })
    : await planGatewayInstall({ all: opts.all, force: opts.force });

  if (plan.targets.length === 0) {
    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            dryRun: Boolean(opts.dryRun),
            plan,
            install: null,
            reason: "no_targets",
          },
          null,
          2
        )
      );
    } else {
      console.log(chalk.bold.cyan("\n⚡ STALI GATEWAY AUTO\n"));
      console.log(chalk.green("✅ Không có app cần cài gateway (đã OK hoặc chưa phát hiện).\n"));
      console.log(chalk.gray(`   Phát hiện ${plan.summary.installed}/${plan.summary.totalTools} app · ${plan.summary.configured} đã gateway\n`));
    }
    return { plan };
  }

  if (!opts.apiKey?.trim()) {
    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            error: "missing_api_key",
            dryRun: Boolean(opts.dryRun),
            plan,
            targets: plan.targets,
          },
          null,
          2
        )
      );
    } else {
      console.error(chalk.red("❌ Thiếu API key. Chạy: stali auth login -k sk-stali-..."));
    }
    throw new Error("missing_api_key");
  }

  if (!opts.json && !opts.yes) {
    console.log(chalk.bold.cyan("\n⚡ STALI GATEWAY AUTO\n"));
    console.log(
      `Phát hiện ${chalk.white(String(plan.summary.installed))} app · ` +
        `${chalk.yellow(String(plan.targets.length))} sẽ cài gateway\n`
    );
    for (const id of plan.targets) {
      const e = plan.tools.find((t) => t.toolId === id);
      const sig = e ? formatDiscoverySignal(e.signals) : "";
      console.log(`  • ${e?.toolName || id} ${chalk.gray(`(${sig})`)}`);
    }
    console.log("");
  } else if (!opts.json && opts.yes) {
    console.log(
      chalk.gray(
        `⚡ Gateway auto: ${plan.targets.length} target(s) — ${plan.targets.join(", ")}\n`
      )
    );
  }

  const install = await runGatewayInstall({ ...opts, discovery: opts.discovery ?? plan.tools });

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok: install.allOk,
          dryRun: Boolean(opts.dryRun),
          plan,
          install: {
            targets: install.targets,
            items: install.items,
          },
        },
        null,
        2
      )
    );
  } else if (!opts.dryRun) {
    for (const item of install.items) {
      const icon = item.success ? chalk.green("✓") : chalk.red("✗");
      console.log(`${icon} ${chalk.white(item.toolName || item.toolId)} — ${item.message}`);
    }
    console.log(
      install.allOk
        ? chalk.green("\n✅ Gateway auto hoàn tất.\n")
        : chalk.yellow("\n⚠️  Một số app chưa cài xong — chạy lại hoặc stali doctor --fix\n")
    );
  } else {
    console.log(chalk.cyan(`\n🔍 Dry-run: sẽ cài ${install.targets.join(", ")}\n`));
  }

  return { plan, install };
}

export async function runGatewayInstall(
  opts: GatewayInstallOptions
): Promise<{ items: ConfigureBatchItem[]; allOk: boolean; targets: string[] }> {
  const discovery = opts.discovery ?? (await discoverInstalledTools());
  const { targets } = resolveGatewayTargets(discovery, opts);

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
    prefetchedValidation: opts.prefetchedValidation,
    parallel: true,
  });

  return { ...batch, targets };
}
