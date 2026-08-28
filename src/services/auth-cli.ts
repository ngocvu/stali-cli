import { validateApiKeyAndFetchModels } from "./api";
import { loadStaliConfig, loadStaliConfigOrCorrupt, saveStaliConfig, resetStaliConfig } from "./config";
import { maskToken } from "../utils/token";
import { STALI_DOCS_URL } from "../constants/api";

export const STALI_DASHBOARD_KEYS_URL = "https://api.stali.vn/dashboard/keys";

export interface AuthLoginResult {
  success: boolean;
  message: string;
  defaultModel?: string;
}

export interface AuthStatusResult {
  hasKey: boolean;
  corrupt?: boolean;
  masked?: string;
  valid?: boolean;
  error?: string;
  lastUpdated?: string;
  baseUrl?: string;
}

export async function authLogin(
  apiKey: string,
  options?: { baseUrl?: string }
): Promise<AuthLoginResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { success: false, message: "API key trống" };
  }

  const config = await loadStaliConfig();
  const baseUrl = options?.baseUrl ?? config?.baseUrl;

  const validation = await validateApiKeyAndFetchModels(trimmed, { baseUrl });
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || "Token không hợp lệ",
    };
  }

  await saveStaliConfig({
    apiKey: trimmed,
    currentModel: validation.defaultModel,
    ...(baseUrl ? { baseUrl } : {}),
  });

  return {
    success: true,
    message: "Đã lưu API key vào ~/.stali/config.json",
    defaultModel: validation.defaultModel,
  };
}

export async function authStatus(): Promise<AuthStatusResult> {
  const { config, corrupt } = await loadStaliConfigOrCorrupt();
  if (corrupt) {
    return { hasKey: false, corrupt: true, error: "config.json bị lỗi định dạng" };
  }
  if (!config?.apiKey?.trim()) {
    return { hasKey: false };
  }

  const masked = maskToken(config.apiKey);
  const validation = await validateApiKeyAndFetchModels(config.apiKey, {
    baseUrl: config.baseUrl,
  });

  return {
    hasKey: true,
    masked,
    valid: validation.valid,
    error: validation.valid ? undefined : validation.error,
    lastUpdated: config.lastUpdated,
    baseUrl: config.baseUrl,
  };
}

export async function authLogout(): Promise<boolean> {
  return resetStaliConfig();
}

export function getAuthHelpText(): string {
  return `# Đăng nhập Stali API
# 1. Tạo key: ${STALI_DASHBOARD_KEYS_URL}
# 2. Lưu key:
stali auth login -k sk-stali-...
# 3. Kiểm tra:
stali auth status

# Docs: ${STALI_DOCS_URL}`;
}
