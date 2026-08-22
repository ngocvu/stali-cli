import { StaliModelsResponseSchema, StaliModel } from "../types";
import { STALI_MODELS_ENDPOINT } from "../constants/api";
import { validateTokenFormat } from "../utils/token";

export interface ValidateResult {
  valid: boolean;
  models: StaliModel[];
  defaultModel: string;
  error?: string;
}

/**
 * Validate API key and fetch active models in real-time from Stali API
 */
export async function validateApiKeyAndFetchModels(
  apiKey: string
): Promise<ValidateResult> {
  const trimmedKey = apiKey.trim();
  const formatError = validateTokenFormat(trimmedKey);
  if (formatError) {
    return {
      valid: false,
      models: [],
      defaultModel: "",
      error: formatError,
    };
  }

  try {
    const res = await fetch(STALI_MODELS_ENDPOINT, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${trimmedKey}`,
        "x-api-key": trimmedKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // Non-JSON response
    }

    // Check for explicit error response format:
    // { "type": "error", "error": { "type": "authentication_error", "message": "API key không hợp lệ." } }
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
      error: "Định dạng dữ liệu model từ Stali API không hợp lệ hoặc danh sách rỗng.",
    };
  } catch (error: any) {
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      valid: false,
      models: [],
      defaultModel: "",
      error: isTimeout
        ? "Quá thời gian kết nối đến Stali API (Timeout 10s)."
        : (error?.message || "Không thể kết nối đến Stali API (https://api.stali.vn/v1/models)"),
    };
  }
}

/**
 * Fetch real-time models list for CLI table commands
 */
export async function fetchRealtimeModels(apiKey?: string): Promise<StaliModel[]> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey?.trim()) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
      headers["x-api-key"] = apiKey.trim();
    }

    const res = await fetch(STALI_MODELS_ENDPOINT, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const parsed = StaliModelsResponseSchema.safeParse(json);
    if (parsed.success) {
      return parsed.data.data;
    }
    return [];
  } catch {
    return [];
  }
}
