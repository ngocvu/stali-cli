import {
  STALI_ANTHROPIC_BASE_URL,
  STALI_OPENAI_BASE_URL,
  STALI_MODELS_ENDPOINT,
} from "../constants/api";

export interface StaliResolvedUrls {
  openAiBaseUrl: string;
  anthropicBaseUrl: string;
  modelsEndpoint: string;
}

const DEFAULT_URLS: StaliResolvedUrls = {
  openAiBaseUrl: STALI_OPENAI_BASE_URL,
  anthropicBaseUrl: STALI_ANTHROPIC_BASE_URL,
  modelsEndpoint: STALI_MODELS_ENDPOINT,
};

/**
 * Derive OpenAI-compatible (/v1) and Anthropic base URLs from ~/.stali/config.json baseUrl.
 * Accepts either https://host or https://host/v1.
 */
export function resolveStaliUrls(baseUrl?: string): StaliResolvedUrls {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return DEFAULT_URLS;
  }

  const normalized = trimmed.replace(/\/+$/, "");
  let openAiBaseUrl = normalized;
  let anthropicBaseUrl = normalized;

  if (normalized.endsWith("/v1")) {
    anthropicBaseUrl = normalized.slice(0, -3);
  } else {
    openAiBaseUrl = `${normalized}/v1`;
  }

  return {
    openAiBaseUrl,
    anthropicBaseUrl,
    modelsEndpoint: `${openAiBaseUrl}/models`,
  };
}

export function isStaliLikeUrl(url?: string, urls?: StaliResolvedUrls): boolean {
  if (!url) return false;
  const resolved = urls ?? DEFAULT_URLS;
  return (
    url.includes("api.stali.vn") ||
    url.includes("stali") ||
    url === resolved.openAiBaseUrl ||
    url === resolved.anthropicBaseUrl ||
    url.startsWith(resolved.anthropicBaseUrl)
  );
}
