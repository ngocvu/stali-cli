import {
  STALI_ANTHROPIC_BASE_URL,
  STALI_OPENAI_BASE_URL,
} from "../../constants/api";
import { readJsonFile, readTomlFile } from "../../utils/file";

export interface ToolSyncStatus {
  configured: boolean;
  endpoint?: string;
  model?: string;
  apiKeyPresent?: boolean;
}

function isStaliUrl(url?: string): boolean {
  return Boolean(url?.includes("api.stali.vn") || url?.includes("stali"));
}

export async function detectAnthropicEnvJsonStatus(
  configPath: string
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const env = data?.env;
  if (!env || typeof env !== "object") {
    return { configured: false };
  }
  const configured = isStaliUrl(env.ANTHROPIC_BASE_URL);
  return {
    configured,
    endpoint: env.ANTHROPIC_BASE_URL,
    model: env.ANTHROPIC_MODEL || data?.model,
    apiKeyPresent: Boolean(env.ANTHROPIC_AUTH_TOKEN),
  };
}

export async function detectOpenAiProviderJsonStatus(
  configPath: string
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const stali = data?.provider?.stali;
  const configured =
    data?.defaultProvider === "stali" ||
    Boolean(stali?.options?.baseURL?.includes("stali"));
  return {
    configured,
    endpoint: stali?.options?.baseURL,
    model: data?.model,
    apiKeyPresent: Boolean(stali?.options?.apiKey),
  };
}

export async function detectVsCodeAgentJsonStatus(
  configPath: string
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const configured = isStaliUrl(data?.anthropicBaseUrl);
  return {
    configured,
    endpoint: data?.anthropicBaseUrl,
    model: data?.anthropicModelId || data?.openAiModelId,
    apiKeyPresent: Boolean(data?.anthropicApiKey),
  };
}

export async function detectOpenAiTomlStatus(
  configPath: string
): Promise<ToolSyncStatus> {
  const data = await readTomlFile(configPath);
  if (!data) return { configured: false };
  const configured =
    isStaliUrl(data.base_url) ||
    data.model_provider === "stali" ||
    Boolean(data.model_providers?.stali);
  return {
    configured,
    endpoint: data.base_url || data.model_providers?.stali?.base_url,
    model: data.model,
    apiKeyPresent: Boolean(data.api_key),
  };
}

export async function detectCodexTomlStatus(
  configPath: string,
  authPath: string
): Promise<ToolSyncStatus> {
  const data = await readTomlFile(configPath);
  const auth = await readJsonFile(authPath);
  if (!data) return { configured: false, apiKeyPresent: Boolean(auth?.OPENAI_API_KEY) };
  const configured =
    data.model_provider === "stali" || Boolean(data.model_providers?.stali);
  return {
    configured,
    endpoint: data.model_providers?.stali?.base_url,
    model: data.model,
    apiKeyPresent: Boolean(auth?.OPENAI_API_KEY),
  };
}

export async function detectDroidJsonStatus(
  configPath: string
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const configured = isStaliUrl(data?.provider?.baseUrl);
  return {
    configured,
    endpoint: data?.provider?.baseUrl,
    model: data?.model,
    apiKeyPresent: Boolean(data?.provider?.apiKey),
  };
}

export async function detectCoworkJsonStatus(
  configPath: string
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const configured = isStaliUrl(data?.openai?.baseUrl);
  return {
    configured,
    endpoint: data?.openai?.baseUrl,
    model: data?.openai?.model || data?.defaultModel,
    apiKeyPresent: Boolean(data?.openai?.apiKey),
  };
}

export async function detectQwenJsonStatus(
  configPath: string
): Promise<ToolSyncStatus> {
  const data = await readJsonFile(configPath);
  const auth = data?.security?.auth;
  const configured = isStaliUrl(auth?.baseUrl);
  return {
    configured,
    endpoint: auth?.baseUrl,
    model: data?.model?.name,
    apiKeyPresent: Boolean(auth?.apiKey),
  };
}
