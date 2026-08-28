import { access, readdir } from "fs/promises";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { SUPPORTED_TOOLS } from "../constants/tools";
import {
  TOOL_BINARY_NAMES,
  TOOL_HOME_MARKERS,
  TOOL_VSCODE_EXTENSIONS,
} from "../constants/tool-binaries";
import { resolveHomePath } from "../utils/file";
import { getToolById } from "../utils/tool-utils";
import { runDoctorScan, type ToolHealthStatus } from "./syncers";

export type DiscoverySignal = "binary" | "config" | "vscode" | "home" | "process";

export interface ToolDiscoveryEntry {
  toolId: string;
  toolName: string;
  installed: boolean;
  signals: Partial<Record<DiscoverySignal, boolean>>;
  configuredForStali: boolean;
  binaryPath?: string;
  configPath: string;
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

async function hasVsCodeExtension(markers: string[]): Promise<boolean> {
  const roots = [
    path.join(os.homedir(), ".vscode", "extensions"),
    path.join(os.homedir(), ".cursor", "extensions"),
  ];
  for (const root of roots) {
    try {
      const entries = await readdir(root);
      const lower = entries.map((e) => e.toLowerCase());
      if (markers.some((m) => lower.some((e) => e.includes(m.toLowerCase())))) {
        return true;
      }
    } catch {
      /* skip */
    }
  }
  return false;
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
  for (const marker of markers) {
    const dir = path.join(home, marker);
    if (await dirHasEntries(dir)) return true;
  }
  return false;
}

/** Phát hiện process đang chạy (Cursor, Claude Code, v.v.) — không cần binary trong PATH. */
export function probeRunningProcess(toolId: string): boolean {
  const names = TOOL_BINARY_NAMES[toolId] || [];
  const tool = getToolById(toolId);
  const candidates = [
    ...new Set([...(names || []), tool?.command].filter(Boolean) as string[]),
  ].map((n) => n.toLowerCase());
  if (candidates.length === 0) return false;

  if (process.platform === "win32") {
    const r = spawnSync("tasklist", [], {
      encoding: "utf8",
      shell: true,
      windowsHide: true,
      timeout: 5000,
    });
    const out = (r.stdout || "").toLowerCase();
    return candidates.some((n) => out.includes(`${n}.exe`) || out.includes(n));
  }

  const r = spawnSync("ps", ["-A", "-o", "comm="], { encoding: "utf8", timeout: 5000 });
  if (r.status !== 0) return false;
  const lines = (r.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
  return candidates.some(
    (name) =>
      lines.some(
        (line) => line === name || line.endsWith(`/${name}`) || line.includes(name)
      )
  );
}

export async function discoverTool(
  toolId: string,
  health?: ToolHealthStatus
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
  const binary = await probeBinary(toolId);
  const vscodeMarkers = TOOL_VSCODE_EXTENSIONS[toolId];
  const vscode = vscodeMarkers ? await hasVsCodeExtension(vscodeMarkers) : false;
  const home = await probeHomeMarkers(toolId);
  const running = probeRunningProcess(toolId);

  const signals: Partial<Record<DiscoverySignal, boolean>> = {};
  if (binary.found) signals.binary = true;
  if (config) signals.config = true;
  if (vscode) signals.vscode = true;
  if (home) signals.home = true;
  if (running) signals.process = true;

  const installed = Boolean(binary.found || config || vscode || home || running);

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

/** Quét toàn bộ 13 tool — binary, config, VS Code extension, thư mục home. */
export async function discoverInstalledTools(): Promise<ToolDiscoveryEntry[]> {
  const health = await runDoctorScan();
  const byId = new Map(health.map((h) => [h.toolId, h]));
  const results: ToolDiscoveryEntry[] = [];
  for (const tool of SUPPORTED_TOOLS) {
    results.push(await discoverTool(tool.id, byId.get(tool.id)));
  }
  return results;
}

export async function discoverInstalledToolIds(): Promise<string[]> {
  const entries = await discoverInstalledTools();
  return entries.filter((e) => e.installed).map((e) => e.toolId);
}

export function formatDiscoverySignal(signals: Partial<Record<DiscoverySignal, boolean>>): string {
  const parts: string[] = [];
  if (signals.binary) parts.push("binary");
  if (signals.config) parts.push("config");
  if (signals.vscode) parts.push("vscode");
  if (signals.home) parts.push("home");
  if (signals.process) parts.push("process");
  return parts.length > 0 ? parts.join("+") : "—";
}
