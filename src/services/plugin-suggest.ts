import { access } from "fs/promises";
import path from "path";
import type { PluginEntry } from "./plugins";
import { loadPlugins } from "./plugins";
import { inferPluginPatchStyle, type PluginPatchStyle } from "./plugin-sync";
import { resolveHomePath, readJsonFile, readTomlFile } from "../utils/file";

export interface PluginPatchSuggestion {
  pluginId: string;
  pluginName: string;
  configFile: string;
  configExists: boolean;
  currentPatchStyle?: PluginPatchStyle;
  suggestedPatchStyle: PluginPatchStyle;
  changed: boolean;
  reason: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Phân tích nội dung file config để gợi ý patchStyle. */
export async function detectPatchStyleFromFile(
  configPath: string,
  entry: Pick<PluginEntry, "protocol" | "configFile">
): Promise<{ style: PluginPatchStyle; reason: string }> {
  const ext = path.extname(entry.configFile).toLowerCase();
  const exists = await fileExists(configPath);
  if (!exists) {
    const inferred = inferPluginPatchStyle(entry as PluginEntry);
    return { style: inferred, reason: `file chưa tồn tại — suy từ protocol (${entry.protocol})` };
  }

  if (ext === ".toml") {
    const data = await readTomlFile(configPath);
    if (data?.base_url || data?.model_providers?.stali) {
      return { style: "openai-toml", reason: "toml có base_url hoặc model_providers.stali" };
    }
    return { style: "openai-toml", reason: "extension .toml" };
  }

  const data = await readJsonFile(configPath);
  if (!data || typeof data !== "object") {
    const inferred = inferPluginPatchStyle(entry as PluginEntry);
    return { style: inferred, reason: "JSON rỗng/không đọc được — suy từ protocol" };
  }

  if (data.env && (data.env.ANTHROPIC_BASE_URL !== undefined || data.env.ANTHROPIC_API_KEY !== undefined)) {
    return { style: "anthropic-env", reason: "json.env.ANTHROPIC_*" };
  }
  if (data.anthropicBaseUrl !== undefined || data.anthropicModelId !== undefined) {
    return { style: "vscode-agent", reason: "json.anthropicBaseUrl / anthropicModelId" };
  }
  if (data.openai?.baseUrl !== undefined || data.openai?.apiKey !== undefined) {
    return { style: "cowork", reason: "json.openai.baseUrl" };
  }
  if (data.defaultProvider === "stali" || data.provider?.stali) {
    return { style: "opencode", reason: "json.defaultProvider stali hoặc provider.stali" };
  }
  if (data.provider?.baseUrl !== undefined || data.provider?.type === "openai") {
    return { style: "openai-json", reason: "json.provider.baseUrl / type openai" };
  }
  if (entry.protocol === "anthropic") {
    return { style: "anthropic-env", reason: "protocol anthropic" };
  }
  if (entry.protocol === "both") {
    return { style: "vscode-agent", reason: "protocol both" };
  }
  return { style: "openai-json", reason: "mặc định openai-json" };
}

export async function suggestPluginPatchStyles(
  plugins?: PluginEntry[]
): Promise<PluginPatchSuggestion[]> {
  const list = plugins ?? (await loadPlugins());
  const out: PluginPatchSuggestion[] = [];

  for (const entry of list) {
    const configPath = resolveHomePath(entry.configFile);
    const exists = await fileExists(configPath);
    const { style, reason } = await detectPatchStyleFromFile(configPath, entry);
    const current = entry.patchStyle;
    out.push({
      pluginId: entry.id,
      pluginName: entry.name,
      configFile: entry.configFile,
      configExists: exists,
      currentPatchStyle: current,
      suggestedPatchStyle: style,
      changed: Boolean(current && current !== style),
      reason,
    });
  }

  return out;
}
