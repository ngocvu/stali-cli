import { StaliModelsResponseSchema, StaliModel } from "../types";
import { resolveStaliUrls } from "../utils/stali-urls";

export interface ApiRequestOptions {
  baseUrl?: string;
}

export interface ValidateResult {
  valid: boolean;
  models: StaliModel[];
  defaultModel: string;
  error?: string;
}

export interface FetchModelsResult {
  models: StaliModel[];
  error?: string;
  endpoint?: string;
}

function authHeaders(apiKey: string): Record<string, string> {
  const trimmed = apiKey.trim();
  return {
    Authorization: `Bearer ${trimmed}`,
    "x-api-key": trimmed,
  };
}

/**
 * Validate API key and fetch active models in real-time from Stali API
 */
export async function validateApiKeyAndFetchModels(
  apiKey: string,
  options?: ApiRequestOptions
): Promise<ValidateResult> {
  const trimmedKey = apiKey.trim();
  const { validateTokenFormat } = await import("../utils/token");
  const formatError = validateTokenFormat(trimmedKey);
  if (formatError) {
    return {
      valid: false,
      models: [],
      defaultModel: "",
      error: formatError,
    };
  }

  const urls = resolveStaliUrls(options?.baseUrl);

  try {
    const res = await fetch(urls.modelsEndpoint, {
      method: "GET",
      headers: authHeaders(trimmedKey),
      signal: AbortSignal.timeout(10000),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // Non-JSON response
    }

    if (json?.type === "error" || json?.error) {
      const errorMsg =
        json.error?.message ||
        json.message ||
        (json.error?.type === "authentication_error"
          ? "API key không hợp lệ."
          : `Lỗi xác thực: ${json.error?.type || "Unknown error"}`);

      return {
        valid: false,
        models: [],
        defaultModel: "",
        error: errorMsg,
      };
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          valid: false,
          models: [],
          defaultModel: "",
          error: "API key không hợp lệ.",
        };
      }
      return {
        valid: false,
        models: [],
        defaultModel: "",
        error: `Lỗi từ Stali API (HTTP ${res.status}: ${res.statusText})`,
      };
    }

    if (json) {
      const parsed = StaliModelsResponseSchema.safeParse(json);

      if (parsed.success && parsed.data.data.length > 0) {
        return {
          valid: true,
          models: parsed.data.data,
          defaultModel: parsed.data.default_model || parsed.data.data[0].id,
        };
      }
    }

    return {
      valid: false,
      models: [],
      defaultModel: "",
      error:
        "Định dạng dữ liệu model từ Stali API không hợp lệ hoặc danh sách rỗng.",
    };
  } catch (error: any) {
    const isTimeout =
      error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      valid: false,
      models: [],
      defaultModel: "",
      error: isTimeout
        ? "Quá thời gian kết nối đến Stali API (Timeout 10s)."
        : error?.message ||
          `Không thể kết nối đến Stali API (${urls.modelsEndpoint})`,
    };
  }
}

/**
 * Fetch real-time models list for CLI table commands
 */
export async function fetchRealtimeModels(
  apiKey?: string,
  options?: ApiRequestOptions
): Promise<FetchModelsResult> {
  const urls = resolveStaliUrls(options?.baseUrl);

  try {
    const headers: Record<string, string> = {};
    if (apiKey?.trim()) {
      Object.assign(headers, authHeaders(apiKey));
    }

    const res = await fetch(urls.modelsEndpoint, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          models: [],
          error: "API key không hợp lệ.",
          endpoint: urls.modelsEndpoint,
        };
      }
      return {
        models: [],
        error: `Lỗi từ Stali API (HTTP ${res.status}: ${res.statusText})`,
        endpoint: urls.modelsEndpoint,
      };
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return {
        models: [],
        error: "Phản hồi không phải JSON hợp lệ từ Stali API.",
        endpoint: urls.modelsEndpoint,
      };
    }

    const parsed = StaliModelsResponseSchema.safeParse(json);
    if (parsed.success) {
      return { models: parsed.data.data, endpoint: urls.modelsEndpoint };
    }

    return {
      models: [],
      error: "Định dạng danh sách model từ Stali API không hợp lệ.",
      endpoint: urls.modelsEndpoint,
    };
  } catch (error: any) {
    const isTimeout =
      error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      models: [],
      error: isTimeout
        ? "Quá thời gian kết nối đến Stali API (Timeout 10s)."
        : error?.message ||
          `Không thể kết nối đến Stali API (${urls.modelsEndpoint})`,
      endpoint: urls.modelsEndpoint,
    };
  }
}
