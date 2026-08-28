import path from "path";
import { SyncerResult } from "../types";
import { resolveHomePath } from "../utils/file";
import type { PluginEntry } from "./plugins";
import {
  patchAnthropicEnvJsonTool,
  patchCoworkJsonTool,
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
  | "opencode"
  | "cowork";

export function buildPluginConfigPreview(
  entry: PluginEntry,
  apiKey: string,
  model?: string,
  baseUrl?: string
): Record<string, unknown> {
  const urls = resolveSyncUrls({ baseUrl });
  const style = inferPluginPatchStyle(entry);
  const resolvedModel = model || entry.defaultModel || "claude-fable-5";
  const maskedKey = apiKey.trim().slice(0, 12) + "…";

  switch (style) {
    case "anthropic-env":
      return {
        patchStyle: style,
        env: { ANTHROPIC_BASE_URL: urls.anthropicBaseUrl, ANTHROPIC_API_KEY: maskedKey },
        model: resolvedModel,
      };
    case "openai-toml":
      return {
        patchStyle: style,
        base_url: urls.openAiBaseUrl,
        api_key: maskedKey,
        model: resolvedModel,
      };
    case "vscode-agent":
      return {
        patchStyle: style,
        anthropicBaseUrl: urls.anthropicBaseUrl,
        apiKey: maskedKey,
        anthropicModelId: resolvedModel,
      };
    case "opencode":
      return {
        patchStyle: style,
        defaultProvider: "stali",
        provider: { stali: { options: { baseURL: urls.openAiBaseUrl, apiKey: maskedKey } } },
        model: resolvedModel,
      };
    case "cowork":
      return {
        patchStyle: style,
        openai: { baseUrl: urls.openAiBaseUrl, apiKey: maskedKey, model: resolvedModel },
      };
    case "openai-json":
    default:
      return {
        patchStyle: style,
        provider: { type: "openai", baseUrl: urls.openAiBaseUrl, apiKey: maskedKey },
        model: resolvedModel,
      };
  }
}

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
    case "cowork":
      return patchCoworkJsonTool(
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

  const syncOne = async (entry: PluginEntry): Promise<PluginSyncItem> => {
    if (opts.dryRun) {
      return {
        pluginId: entry.id,
        pluginName: entry.name,
        success: true,
        message: `Dry-run → ${entry.configFile} (${inferPluginPatchStyle(entry)})`,
        configPath: resolveHomePath(entry.configFile),
      };
    }

    const result = await syncPluginEntry(entry, opts.apiKey, opts.model, {
      baseUrl: opts.baseUrl,
    });
    return {
      pluginId: entry.id,
      pluginName: entry.name,
      success: result.success,
      message: result.message,
      configPath: result.configPath,
      backupPath: result.backupPath,
      error: result.error,
    };
  };

  if (targets.length > 1 && !opts.dryRun) {
    items.push(...(await Promise.all(targets.map((entry) => syncOne(entry)))));
  } else {
    for (const entry of targets) {
      items.push(await syncOne(entry));
    }
  }

  return { items, allOk: items.every((i) => i.success) };
}
