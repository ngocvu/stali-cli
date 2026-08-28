import path from "path";
import { SyncerResult } from "../types";
import { resolveHomePath } from "../utils/file";
import type { PluginEntry } from "./plugins";
import {
  patchAnthropicEnvJsonTool,
  patchDroidJsonTool,
  patchOpenAiProviderJsonTool,
  patchOpenAiTomlTool,
  patchVsCodeAgentJsonTool,
} from "./syncers/common";
import type { SyncOptions } from "./syncers/sync-options";
import { resolveSyncUrls } from "./syncers/sync-options";

export type PluginPatchStyle =
  | "anthropic-env"
  | "openai-toml"
  | "openai-json"
  | "vscode-agent"
  | "opencode";

export function inferPluginPatchStyle(entry: PluginEntry): PluginPatchStyle {
  if (entry.patchStyle) return entry.patchStyle;
  const ext = path.extname(entry.configFile).toLowerCase();
  if (ext === ".toml") return "openai-toml";
  if (entry.protocol === "anthropic") return "anthropic-env";
  if (entry.protocol === "both") return "vscode-agent";
  return "openai-json";
}

export async function syncPluginEntry(
  entry: PluginEntry,
  apiKey: string,
  model?: string,
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const configPath = resolveHomePath(entry.configFile);
  const urls = resolveSyncUrls(syncOptions);
  const resolvedModel = model || entry.defaultModel || "claude-fable-5";
  const style = inferPluginPatchStyle(entry);

  switch (style) {
    case "anthropic-env":
      return patchAnthropicEnvJsonTool(
        entry.id,
        entry.name,
        configPath,
        apiKey,
        resolvedModel,
        undefined,
        urls
      );
    case "openai-toml":
      return patchOpenAiTomlTool(
        entry.id,
        entry.name,
        configPath,
        apiKey,
        resolvedModel,
        undefined,
        urls
      );
    case "vscode-agent":
      return patchVsCodeAgentJsonTool(
        entry.id,
        entry.name,
        configPath,
        apiKey,
        resolvedModel,
        undefined,
        urls
      );
    case "opencode":
      return patchOpenAiProviderJsonTool(
        entry.id,
        entry.name,
        configPath,
        apiKey,
        resolvedModel,
        undefined,
        urls
      );
    case "openai-json":
    default:
      return patchDroidJsonTool(
        entry.id,
        entry.name,
        configPath,
        apiKey,
        resolvedModel,
        undefined,
        urls
      );
  }
}

export interface PluginSyncItem {
  pluginId: string;
  pluginName: string;
  success: boolean;
  message: string;
  configPath?: string;
  backupPath?: string;
  error?: string;
}

export async function runPluginsSync(opts: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  pluginIds?: string[];
  dryRun?: boolean;
}): Promise<{ items: PluginSyncItem[]; allOk: boolean }> {
  const { loadPlugins } = await import("./plugins");
  const plugins = await loadPlugins();

  if (plugins.length === 0) {
    return {
      items: [
        {
          pluginId: "",
          pluginName: "",
          success: false,
          message: "Không có plugin trong ~/.stali/plugins.json",
          error: "NO_PLUGINS",
        },
      ],
      allOk: false,
    };
  }

  const targets = opts.pluginIds?.length
    ? plugins.filter((p) => opts.pluginIds!.includes(p.id))
    : plugins;

  if (targets.length === 0) {
    return {
      items: [
        {
          pluginId: "",
          pluginName: "",
          success: false,
          message: "Không tìm thấy plugin id hợp lệ",
          error: "NO_MATCH",
        },
      ],
      allOk: false,
    };
  }

  const items: PluginSyncItem[] = [];
  for (const entry of targets) {
    if (opts.dryRun) {
      items.push({
        pluginId: entry.id,
        pluginName: entry.name,
        success: true,
        message: `Dry-run → ${entry.configFile} (${inferPluginPatchStyle(entry)})`,
        configPath: resolveHomePath(entry.configFile),
      });
      continue;
    }

    const result = await syncPluginEntry(entry, opts.apiKey, opts.model, {
      baseUrl: opts.baseUrl,
    });
    items.push({
      pluginId: entry.id,
      pluginName: entry.name,
      success: result.success,
      message: result.message,
      configPath: result.configPath,
      backupPath: result.backupPath,
      error: result.error,
    });
  }

  return { items, allOk: items.every((i) => i.success) };
}
