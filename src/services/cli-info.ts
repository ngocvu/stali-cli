import { spawnSync } from "child_process";
import fs from "fs/promises";
import { VERSION } from "../version";
import {
  getStaliBinDir,
  getStaliCliInstallDir,
  getStaliConfigPath,
  getStaliHome,
} from "../constants/paths";
import { authStatus } from "./auth-cli";
import { runPluginsDoctor } from "./plugin-doctor";
import { detectInstallMode, type InstallMode } from "./install-mode";
import {
  discoverInstalledTools,
  formatDiscoverySignal,
  type ToolDiscoveryEntry,
} from "./tool-discovery";
import { fetchNpmLatestVersion, type VersionCheckResult } from "./version-check";

export interface CliGatewaySummary {
  installed: number;
  configured: number;
  pending: number;
  tools: Array<{
    id: string;
    name: string;
    signals: string;
    configured: boolean;
  }>;
}

export interface CliInfoSnapshot {
  version: string;
  platform: string;
  nodeVersion: string;
  bunVersion?: string;
  installMode: InstallMode;
  installDetail?: string;
  installVersion?: string;
  staliHome: string;
  cliInstallDir: string;
  binDir: string;
  configPath: string;
  configExists: boolean;
  auth: {
    hasKey: boolean;
    valid?: boolean;
    masked?: string;
  };
  doctor: {
    configured: number;
    total: number;
  };
  plugins: {
    configured: number;
    total: number;
  };
  npm?: VersionCheckResult;
  gateway: CliGatewaySummary;
  /** true khi không validate auth / npm (stali info --json mặc định) */
  offline?: boolean;
}

export interface GatherCliInfoOptions {
  /** Không gọi mạng (auth validate, npm latest). Mặc định true khi `--json`. */
  offline?: boolean;
  /** Kiểm tra API key qua mạng (chậm). */
  validateAuth?: boolean;
  /** Lấy phiên bản npm mới nhất. */
  checkNpm?: boolean;
  /** Bỏ qua scan chi tiết plugin (chỉ đếm). */
  skipPluginScan?: boolean;
  /** Bỏ spawn `bun --version`. */
  skipBunVersion?: boolean;
}

async function summarizePluginsFast(): Promise<{ configured: number; total: number }> {
  const { loadPlugins } = await import("./plugins");
  const plugins = await loadPlugins();
  return { configured: 0, total: plugins.length };
}

function summarizeGateway(entries: ToolDiscoveryEntry[]): CliGatewaySummary {
  const installedEntries = entries.filter((e) => e.installed);
  const configured = installedEntries.filter((e) => e.configuredForStali).length;
  return {
    installed: installedEntries.length,
    configured,
    pending: installedEntries.length - configured,
    tools: installedEntries.map((e) => ({
      id: e.toolId,
      name: e.toolName,
      signals: formatDiscoverySignal(e.signals),
      configured: e.configuredForStali,
    })),
  };
}

function detectBunVersion(): string | undefined {
  const bun = process.env.BUN_BIN || "bun";
  const r = spawnSync(bun, ["--version"], { encoding: "utf8", timeout: 5000 });
  return r.stdout?.trim() || undefined;
}

export async function gatherCliInfo(options?: GatherCliInfoOptions): Promise<CliInfoSnapshot> {
  const offline = options?.offline ?? false;
  const validateAuth = options?.validateAuth ?? !offline;
  const checkNpm = options?.checkNpm ?? !offline;
  const skipPluginScan = options?.skipPluginScan ?? offline;
  const skipBun = options?.skipBunVersion ?? offline;

  const configPath = getStaliConfigPath();
  const configExists = await fs
    .access(configPath)
    .then(() => true)
    .catch(() => false);

  const authPromise = validateAuth
    ? authStatus()
    : authStatus({ localOnly: true });

  const pluginPromise = skipPluginScan
    ? summarizePluginsFast()
    : runPluginsDoctor().then((r) => ({
        configured: r.plugins.filter((p) => p.configuredForStali).length,
        total: r.plugins.length,
      }));

  const npmPromise = checkNpm
    ? fetchNpmLatestVersion()
    : Promise.resolve(undefined as VersionCheckResult | undefined);

  const [auth, pluginSummary, installInfo, gatewayEntries, npm] = await Promise.all([
    authPromise,
    pluginPromise,
    detectInstallMode(),
    discoverInstalledTools(),
    npmPromise,
  ]);
  const configured = gatewayEntries.filter((e) => e.configuredForStali).length;

  return {
    version: VERSION,
    platform: `${process.platform} ${process.arch}`,
    nodeVersion: process.version,
    bunVersion: skipBun ? undefined : detectBunVersion(),
    installMode: installInfo.mode,
    installDetail: installInfo.detail,
    installVersion: installInfo.version,
    staliHome: getStaliHome(),
    cliInstallDir: getStaliCliInstallDir(),
    binDir: getStaliBinDir(),
    configPath,
    configExists,
    auth: {
      hasKey: auth.hasKey,
      valid: auth.valid,
      masked: auth.masked,
    },
    doctor: {
      configured,
      total: gatewayEntries.length,
    },
    plugins: {
      configured: pluginSummary.configured,
      total: pluginSummary.total,
    },
    npm: npm ?? undefined,
    gateway: summarizeGateway(gatewayEntries),
    offline: offline || (!validateAuth && !checkNpm),
  };
}
