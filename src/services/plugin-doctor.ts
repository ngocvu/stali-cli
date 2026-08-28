import { access } from "fs/promises";
import { loadStaliConfig } from "./config";
import type { PluginEntry } from "./plugins";
import { loadPlugins } from "./plugins";
import {
  inferPluginPatchStyle,
  type PluginPatchStyle,
} from "./plugin-sync";
import { resolveHomePath, readJsonFile, readTomlFile } from "../utils/file";
import { isStaliLikeUrl, resolveStaliUrls } from "../utils/stali-urls";

export interface PluginHealthStatus {
  pluginId: string;
  pluginName: string;
  configPath: string;
  exists: boolean;
  configuredForStali: boolean;
  endpoint?: string;
  model?: string;
  patchStyle: PluginPatchStyle;
}

export interface PluginsDoctorOutput {
  meta: {
    baseUrl: string;
    openAiBaseUrl: string;
    anthropicBaseUrl: string;
    modelsEndpoint: string;
    pluginCount: number;
    /** @deprecated Dùng `stali doctor --json` (payload thống nhất tools+plugins) */
    deprecated?: string;
    preferCommand?: string;
  };
  plugins: PluginHealthStatus[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function detectPluginHealth(
  entry: PluginEntry,
  urls: ReturnType<typeof resolveStaliUrls>
): Promise<PluginHealthStatus> {
  const configPath = resolveHomePath(entry.configFile);
  const exists = await fileExists(configPath);
  const patchStyle = inferPluginPatchStyle(entry);

  if (!exists) {
    return {
      pluginId: entry.id,
      pluginName: entry.name,
      configPath,
      exists: false,
      configuredForStali: false,
      patchStyle,
    };
  }

  let endpoint: string | undefined;
  let model: string | undefined;
  let configured = false;

  switch (patchStyle) {
    case "anthropic-env": {
      const data = await readJsonFile(configPath);
      endpoint = data?.env?.ANTHROPIC_BASE_URL;
      model = data?.env?.ANTHROPIC_MODEL || data?.model;
      configured = isStaliLikeUrl(endpoint, urls);
      break;
    }
    case "openai-toml": {
      const data = await readTomlFile(configPath);
      endpoint = data?.base_url || data?.model_providers?.stali?.base_url;
      model = data?.model;
      configured =
        isStaliLikeUrl(endpoint, urls) ||
        data?.model_provider === "stali" ||
        Boolean(data?.model_providers?.stali);
      break;
    }
    case "vscode-agent": {
      const data = await readJsonFile(configPath);
      endpoint = data?.anthropicBaseUrl;
      model = data?.anthropicModelId || data?.openAiModelId;
      configured = isStaliLikeUrl(endpoint, urls);
      break;
    }
    case "opencode": {
      const data = await readJsonFile(configPath);
      endpoint = data?.provider?.stali?.options?.baseURL;
      model = data?.model;
      configured =
        data?.defaultProvider === "stali" || isStaliLikeUrl(endpoint, urls);
      break;
    }
    case "openai-json":
    default: {
      const data = await readJsonFile(configPath);
      endpoint = data?.provider?.baseUrl || data?.openai?.baseUrl;
      model = data?.model || data?.openai?.model || data?.defaultModel;
      configured = isStaliLikeUrl(endpoint, urls);
      break;
    }
  }

  return {
    pluginId: entry.id,
    pluginName: entry.name,
    configPath,
    exists: true,
    configuredForStali: configured,
    endpoint,
    model: model || entry.defaultModel,
    patchStyle,
  };
}

export async function runPluginsDoctor(): Promise<PluginsDoctorOutput> {
  const cfg = await loadStaliConfig();
  const urls = resolveStaliUrls(cfg?.baseUrl);
  const plugins = await loadPlugins();
  const statuses: PluginHealthStatus[] = [];

  for (const entry of plugins) {
    statuses.push(await detectPluginHealth(entry, urls));
  }

  return {
    meta: {
      baseUrl: cfg?.baseUrl || urls.openAiBaseUrl,
      openAiBaseUrl: urls.openAiBaseUrl,
      anthropicBaseUrl: urls.anthropicBaseUrl,
      modelsEndpoint: urls.modelsEndpoint,
      pluginCount: plugins.length,
      deprecated: "dùng `stali doctor --json` (plugins doctor là alias v3)",
      preferCommand: "stali doctor",
    },
    plugins: statuses,
  };
}
