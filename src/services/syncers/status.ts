import { isStaliLikeUrl } from "../../utils/stali-urls";
import { readJsonFile, readTomlFile } from "../../utils/file";
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

export async function detectDroidJsonStatus(
  configPath: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const configured = matchStali(data?.provider?.baseUrl, ctx);
  return {
    configured,
    endpoint: data?.provider?.baseUrl,
    model: data?.model,
    apiKeyPresent: Boolean(data?.provider?.apiKey),
  };
}

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
