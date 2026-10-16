import { isStaliLikeUrl } from "../../utils/stali-urls";
import { readJsonFile, readTomlFile } from "../../utils/file";
import { STALI_PROVIDER_ID } from "../../constants/tool-providers";
import type { DoctorStatusContext } from "./status-context";

export interface ToolSyncStatus {
  configured: boolean;
  endpoint?: string;
  model?: string;
  apiKeyPresent?: boolean;
}

function matchStali(url?: string, ctx?: DoctorStatusContext): boolean {
  return isStaliLikeUrl(url, ctx?.urls);
}

export async function detectAnthropicEnvJsonStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const env = data?.env;
  if (!env || typeof env !== "object") {
    return { configured: false };
  }
  const configured = matchStali(env.ANTHROPIC_BASE_URL, ctx);
  return {
    configured,
    endpoint: env.ANTHROPIC_BASE_URL,
    model: env.ANTHROPIC_MODEL || data?.model,
    apiKeyPresent: Boolean(env.ANTHROPIC_AUTH_TOKEN),
  };
}

export async function detectOpenAiProviderJsonStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const stali = data?.provider?.stali;
  const endpoint = stali?.options?.baseURL;
  const configured =
    data?.defaultProvider === "stali" || matchStali(endpoint, ctx);
  return {
    configured,
    endpoint,
    model: data?.model,
    apiKeyPresent: Boolean(stali?.options?.apiKey),
  };
}

export async function detectVsCodeAgentJsonStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const configured = matchStali(data?.anthropicBaseUrl, ctx);
  return {
    configured,
    endpoint: data?.anthropicBaseUrl,
    model: data?.anthropicModelId || data?.openAiModelId,
    apiKeyPresent: Boolean(data?.anthropicApiKey),
  };
}

export async function detectOpenAiTomlStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readTomlFile(configPath);
  if (!data) return { configured: false };
  const endpoint = data.base_url || data.model_providers?.stali?.base_url;
  const configured =
    matchStali(endpoint, ctx) ||
    data.model_provider === "stali" ||
    Boolean(data.model_providers?.stali);
  return {
    configured,
    endpoint,
    model: data.model,
    apiKeyPresent: Boolean(data.api_key),
  };
}

export async function detectCodexTomlStatus(
  configPath: string,
  authPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readTomlFile(configPath);
  const auth = await readJsonFile(authPath);
  if (!data) return { configured: false, apiKeyPresent: Boolean(auth?.OPENAI_API_KEY) };
  const endpoint = data.model_providers?.stali?.base_url;
  const configured =
    data.model_provider === "stali" ||
    Boolean(data.model_providers?.stali) ||
    matchStali(endpoint, ctx);
  return {
    configured,
    endpoint,
    model: data.model,
    apiKeyPresent: Boolean(auth?.OPENAI_API_KEY),
  };
}

/**
 * Droid: BYOK custom model nằm trong `customModels[]` của
 * `~/.factory/settings.json` (khoá camelCase — đã đối chiếu docs + binary).
 */
export async function detectDroidJsonStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const models: any[] = Array.isArray(data?.customModels) ? data.customModels : [];
  const hit = models.find((m) => matchStali(m?.baseUrl, ctx));
  return {
    configured: Boolean(hit),
    endpoint: hit?.baseUrl,
    model: hit?.model,
    apiKeyPresent: Boolean(hit?.apiKey),
  };
}

/**
 * OpenClaw: provider khai ở `models.providers.<id>`, model mặc định ở
 * `agents.defaults.model.primary` — đã đối chiếu docs + bundle.
 */
export async function detectOpenClawStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const provider = data?.models?.providers?.[STALI_PROVIDER_ID];
  const ref: string | undefined = data?.agents?.defaults?.model?.primary;
  const model =
    typeof ref === "string" && ref.startsWith(`${STALI_PROVIDER_ID}/`)
      ? ref.slice(STALI_PROVIDER_ID.length + 1)
      : undefined;
  return {
    configured: Boolean(provider) || matchStali(provider?.baseUrl, ctx),
    endpoint: provider?.baseUrl,
    model,
    apiKeyPresent: Boolean(provider?.apiKey),
  };
}

/**
 * Grok CLI: `[model_providers.<id>]` + `[models].default` trong
 * `~/.grok/config.toml` — đã đối chiếu binary @xai-official/grok.
 */
export async function detectGrokTomlStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readTomlFile<any>(configPath);
  const provider = data?.model_providers?.[STALI_PROVIDER_ID];
  return {
    configured: Boolean(provider) || matchStali(provider?.api_base_url, ctx),
    endpoint: provider?.api_base_url,
    model: data?.models?.default,
    apiKeyPresent: Boolean(provider?.api_key),
  };
}

/**
 * jcode: `[providers.<id>]` + `[provider]` trong `~/.jcode/config.toml`
 * — đã đối chiếu binary @1jehuang/jcode.
 */
export async function detectJcodeTomlStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readTomlFile<any>(configPath);
  const provider = data?.providers?.[STALI_PROVIDER_ID];
  return {
    configured:
      data?.provider?.default_provider === STALI_PROVIDER_ID ||
      Boolean(provider) ||
      matchStali(provider?.base_url, ctx),
    endpoint: provider?.base_url,
    model: data?.provider?.default_model,
    apiKeyPresent: Boolean(provider?.api_key),
  };
}

/** Cowork: chưa xác minh được file cấu hình (là app desktop). */
export async function detectCoworkJsonStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const configured = matchStali(data?.openai?.baseUrl, ctx);
  return {
    configured,
    endpoint: data?.openai?.baseUrl,
    model: data?.openai?.model || data?.defaultModel,
    apiKeyPresent: Boolean(data?.openai?.apiKey),
  };
}

export async function detectQwenJsonStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const auth = data?.security?.auth;
  const configured = matchStali(auth?.baseUrl, ctx);
  return {
    configured,
    endpoint: auth?.baseUrl,
    model: data?.model?.name,
    apiKeyPresent: Boolean(auth?.apiKey),
  };
}
