import { spawnSync } from "child_process";
import fs from "fs/promises";
import { VERSION } from "../version";
import {
  getStaliBinDir,
  getStaliCliInstallDir,
  getStaliConfigPath,
  getStaliHome,
} from "../constants/paths";
import { runDoctorScan } from "./syncers";
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
}

function detectBunVersion(): string | undefined {
  const bun = process.env.BUN_BIN || "bun";
  const r = spawnSync(bun, ["--version"], { encoding: "utf8", timeout: 5000 });
  return r.stdout?.trim() || undefined;
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

export async function gatherCliInfo(): Promise<CliInfoSnapshot> {
  const configPath = getStaliConfigPath();
  const configExists = await fs
    .access(configPath)
    .then(() => true)
    .catch(() => false);

  const [auth, doctorStatuses, pluginReport, installInfo, gatewayEntries, npm] =
    await Promise.all([
      authStatus(),
      runDoctorScan(),
      runPluginsDoctor(),
      detectInstallMode(),
      discoverInstalledTools(),
      fetchNpmLatestVersion(),
    ]);
  const configured = doctorStatuses.filter((s) => s.configuredForStali).length;
  const pluginsConfigured = pluginReport.plugins.filter((p) => p.configuredForStali).length;

  return {
    version: VERSION,
    platform: `${process.platform} ${process.arch}`,
    nodeVersion: process.version,
    bunVersion: detectBunVersion(),
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
      total: doctorStatuses.length,
    },
    plugins: {
      configured: pluginsConfigured,
      total: pluginReport.plugins.length,
    },
    npm,
    gateway: summarizeGateway(gatewayEntries),
  };
}
