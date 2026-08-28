import { access, readdir } from "fs/promises";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { SUPPORTED_TOOLS } from "../constants/tools";
import {
  IDE_EXTENSION_ROOTS,
  TOOL_BINARY_NAMES,
  TOOL_HOME_MARKERS,
  TOOL_JETBRAINS_MARKERS,
  TOOL_MACOS_APPS,
  TOOL_PROCESS_MARKERS,
  TOOL_VSCODE_EXTENSIONS,
} from "../constants/tool-binaries";
import { resolveHomePath } from "../utils/file";
import { getToolById } from "../utils/tool-utils";
import { runDoctorScan, type ToolHealthStatus } from "./syncers";
import { loadProcessLines } from "./process-lines";

export type DiscoverySignal =
  | "binary"
  | "config"
  | "vscode"
  | "home"
  | "process"
  | "jetbrains"
  | "application";

export interface ToolDiscoveryEntry {
  toolId: string;
  toolName: string;
  installed: boolean;
  signals: Partial<Record<DiscoverySignal, boolean>>;
  configuredForStali: boolean;
  binaryPath?: string;
  configPath: string;
}

export interface DiscoveryScanContext {
  ideEntries: Set<string>;
  processLines: string[];
}

export interface DiscoverInstalledToolsOptions {
  /** Tái sử dụng kết quả doctor scan (tránh quét 2 lần trong `stali info`). */
  health?: ToolHealthStatus[];
  ctx?: DiscoveryScanContext;
}

function whichBinary(name: string): string | null {
  if (process.platform === "win32") {
    const r = spawnSync("where", [name], { encoding: "utf8", shell: true, windowsHide: true });
    if (r.status !== 0) return null;
    const line = (r.stdout || "").split(/\r?\n/).find((l) => l.trim())?.trim();
    return line || null;
  }
  const r = spawnSync("which", [name], { encoding: "utf8" });
  if (r.status !== 0) return null;
  return (r.stdout || "").trim() || null;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function dirHasEntries(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

export async function buildDiscoveryScanContext(): Promise<DiscoveryScanContext> {
  const home = os.homedir();
  const ideEntries = new Set<string>();
  await Promise.all(
    IDE_EXTENSION_ROOTS.map(async (rel) => {
      try {
        const entries = await readdir(path.join(home, rel));
        for (const e of entries) ideEntries.add(e.toLowerCase());
      } catch {
        /* skip */
      }
    })
  );
  return { ideEntries, processLines: loadProcessLines() };
}

export function hasIdeExtensionFromIndex(index: Set<string>, markers: string[]): boolean {
  if (markers.length === 0) return false;
  return markers.some((m) => {
    const needle = m.toLowerCase();
    for (const entry of index) {
      if (entry.includes(needle)) return true;
    }
    return false;
  });
}

export function probeRunningProcessFromList(lines: string[], toolId: string): boolean {
  const names = TOOL_BINARY_NAMES[toolId] || [];
  const tool = getToolById(toolId);
  const candidates = [
    ...new Set([...(names || []), tool?.command].filter(Boolean) as string[]),
  ].map((n) => n.toLowerCase());
  const markers = (TOOL_PROCESS_MARKERS[toolId] || []).map((m) => m.toLowerCase());
  const haystack = lines.join("\n");

  if (markers.length > 0 && markers.some((m) => haystack.includes(m))) {
    return true;
  }

  if (candidates.length === 0) return false;

  if (process.platform === "win32") {
    const out = haystack;
    return candidates.some((n) => out.includes(`${n}.exe`) || out.includes(n));
  }

  return candidates.some((name) =>
    lines.some((line) => line === name || line.endsWith(`/${name}`) || line.includes(name))
  );
}

async function probeMacosApplications(toolId: string): Promise<boolean> {
  if (process.platform !== "darwin") return false;
  const apps = TOOL_MACOS_APPS[toolId] || [];
  if (apps.length === 0) return false;
  const home = os.homedir();
  const roots = ["/Applications", path.join(home, "Applications")];
  for (const app of apps) {
    for (const root of roots) {
      if (await pathExists(path.join(root, app))) return true;
    }
  }
  return false;
}

/** Phát hiện process đang chạy — dùng buildDiscoveryScanContext() để gọi ps một lần. */
export function probeRunningProcess(toolId: string): boolean {
  return probeRunningProcessFromList(loadProcessLines(), toolId);
}

async function probeJetBrainsMarkers(toolId: string): Promise<boolean> {
  const markers = TOOL_JETBRAINS_MARKERS[toolId] || [];
  if (markers.length === 0) return false;
  const home = os.homedir();
  const checks = markers.map((marker) => pathExists(path.join(home, marker)));
  const results = await Promise.all(checks);
  return results.some(Boolean);
}

async function probeBinary(toolId: string): Promise<{ found: boolean; path?: string }> {
  const names = TOOL_BINARY_NAMES[toolId] || [];
  const tool = getToolById(toolId);
  const candidates = [...new Set([...(names || []), tool?.command].filter(Boolean) as string[])];
  for (const name of candidates) {
    const hit = whichBinary(name);
    if (hit) return { found: true, path: hit };
  }
  return { found: false };
}

async function probeHomeMarkers(toolId: string): Promise<boolean> {
  const markers = TOOL_HOME_MARKERS[toolId] || [];
  const home = os.homedir();
  const checks = markers.map((marker) => dirHasEntries(path.join(home, marker)));
  const results = await Promise.all(checks);
  return results.some(Boolean);
}

export async function discoverTool(
  toolId: string,
  health?: ToolHealthStatus,
  ctx?: DiscoveryScanContext
): Promise<ToolDiscoveryEntry> {
  const tool = getToolById(toolId);
  if (!tool) {
    return {
      toolId,
      toolName: toolId,
      installed: false,
      signals: {},
      configuredForStali: false,
      configPath: "",
    };
  }

  const configPath = resolveHomePath(tool.configFile);
  const config = health?.exists ?? (await pathExists(configPath));
  const vscodeMarkers = TOOL_VSCODE_EXTENSIONS[toolId];

  const [binary, home, jetbrains, macApp] = await Promise.all([
    probeBinary(toolId),
    probeHomeMarkers(toolId),
    probeJetBrainsMarkers(toolId),
    probeMacosApplications(toolId),
  ]);

  let vscodeHit = false;
  if (vscodeMarkers) {
    if (ctx) {
      vscodeHit = hasIdeExtensionFromIndex(ctx.ideEntries, vscodeMarkers);
    } else {
      const scan = await buildDiscoveryScanContext();
      vscodeHit = hasIdeExtensionFromIndex(scan.ideEntries, vscodeMarkers);
    }
  }

  const running = ctx
    ? probeRunningProcessFromList(ctx.processLines, toolId)
    : probeRunningProcess(toolId);

  const signals: Partial<Record<DiscoverySignal, boolean>> = {};
  if (binary.found) signals.binary = true;
  if (config) signals.config = true;
  if (vscodeHit) signals.vscode = true;
  if (home) signals.home = true;
  if (running) signals.process = true;
  if (jetbrains) signals.jetbrains = true;
  if (macApp) signals.application = true;

  const installed = Boolean(
    binary.found || config || vscodeHit || home || running || jetbrains || macApp
  );

  return {
    toolId: tool.id,
    toolName: tool.name,
    installed,
    signals,
    configuredForStali: health?.configuredForStali ?? false,
    binaryPath: binary.path,
    configPath,
  };
}

/** Quét toàn bộ 13 tool — binary, config, IDE extension, process (song song). */
export async function discoverInstalledTools(
  opts?: DiscoverInstalledToolsOptions
): Promise<ToolDiscoveryEntry[]> {
  const [health, ctx] = await Promise.all([
    opts?.health ? Promise.resolve(opts.health) : runDoctorScan(),
    opts?.ctx ? Promise.resolve(opts.ctx) : buildDiscoveryScanContext(),
  ]);
  const byId = new Map(health.map((h) => [h.toolId, h]));
  return Promise.all(
    SUPPORTED_TOOLS.map((tool) => discoverTool(tool.id, byId.get(tool.id), ctx))
  );
}

export async function discoverInstalledToolIds(
  opts?: DiscoverInstalledToolsOptions
): Promise<string[]> {
  const entries = await discoverInstalledTools(opts);
  return entries.filter((e) => e.installed).map((e) => e.toolId);
}

export function formatDiscoverySignal(signals: Partial<Record<DiscoverySignal, boolean>>): string {
  const parts: string[] = [];
  if (signals.binary) parts.push("binary");
  if (signals.config) parts.push("config");
  if (signals.vscode) parts.push("vscode");
  if (signals.home) parts.push("home");
  if (signals.process) parts.push("process");
  if (signals.jetbrains) parts.push("jetbrains");
  if (signals.application) parts.push("app");
  return parts.length > 0 ? parts.join("+") : "—";
}
