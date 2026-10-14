import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { resolveStaliUrls } from "../../utils/stali-urls";
import { readJsonFileDetailed, patchJsoncFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { loadStaliConfig } from "../config";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const CLAUDE_SETTINGS_PATH = path.join(
  os.homedir(),
  ".claude",
  "settings.json"
);

export interface ClaudeStatus {
  configured: boolean;
  endpoint?: string;
  apiKey?: string;
  defaultModel?: string;
  fableModel?: string;
  sonnetModel?: string;
  opusModel?: string;
  haikuModel?: string;
  maxContextTokens?: string;
}

export async function getClaudeStatus(): Promise<ClaudeStatus> {
  const existing = await readJsonFileDetailed<any>(CLAUDE_SETTINGS_PATH);
  if (!existing.data || !existing.data.env) {
    return { configured: false };
  }
  const env = existing.data.env;
  const configured = Boolean(env.ANTHROPIC_BASE_URL?.includes("stali"));
  return {
    configured,
    endpoint: env.ANTHROPIC_BASE_URL,
    apiKey: env.ANTHROPIC_AUTH_TOKEN,
    defaultModel: env.ANTHROPIC_MODEL,
    fableModel: env.ANTHROPIC_MODEL,
    sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    haikuModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    maxContextTokens: env.CLAUDE_CODE_MAX_CONTEXT_TOKENS,
  };
}

export async function patchClaudeSettings(
  apiKey: string,
  model?: string,
  modelType?: "fable" | "sonnet" | "opus" | "haiku" | "all",
  maxContextTokens?: string,
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  const settingsPath = CLAUDE_SETTINGS_PATH;

  try {
    // 1. Backup có timestamp (không đụng nếu file chưa tồn tại)
    const backupPath = await createTimestampBackup(settingsPath);

    // 2. Vá TẠI CHỖ — giữ nguyên chú thích, thứ tự key và mọi key lạ khác
    //    (permissions, hooks, statusLine…) mà người dùng đã cấu hình.
    const set: Array<{ path: (string | number)[]; value: unknown }> = [
      { path: ["env", "ANTHROPIC_BASE_URL"], value: urls.anthropicBaseUrl },
      { path: ["env", "ANTHROPIC_AUTH_TOKEN"], value: apiKey.trim() },
      { path: ["env", "API_TIMEOUT_MS"], value: "600000" },
      { path: ["hasCompletedOnboarding"], value: true },
    ];

    if (model) {
      if (modelType === "fable") {
        set.push({ path: ["env", "ANTHROPIC_MODEL"], value: model });
      } else if (modelType === "sonnet") {
        set.push({ path: ["env", "ANTHROPIC_DEFAULT_SONNET_MODEL"], value: model });
      } else if (modelType === "opus") {
        set.push({ path: ["env", "ANTHROPIC_DEFAULT_OPUS_MODEL"], value: model });
      } else if (modelType === "haiku") {
        set.push({ path: ["env", "ANTHROPIC_DEFAULT_HAIKU_MODEL"], value: model });
      } else {
        set.push(
          { path: ["env", "ANTHROPIC_MODEL"], value: model },
          { path: ["env", "ANTHROPIC_DEFAULT_SONNET_MODEL"], value: model },
          { path: ["env", "ANTHROPIC_DEFAULT_OPUS_MODEL"], value: model },
          { path: ["env", "ANTHROPIC_DEFAULT_HAIKU_MODEL"], value: model }
        );
      }
    }

    const remove: Array<(string | number)[]> = [["env", "ANTHROPIC_API_KEY"]];
    if (maxContextTokens !== undefined && !maxContextTokens) {
      remove.push(["env", "CLAUDE_CODE_MAX_CONTEXT_TOKENS"]);
    } else if (maxContextTokens) {
      set.push({
        path: ["env", "CLAUDE_CODE_MAX_CONTEXT_TOKENS"],
        value: String(maxContextTokens),
      });
    }

    const ok = await patchJsoncFile(settingsPath, { set, remove });
    if (!ok) {
      return {
        toolId: "claude",
        toolName: "[CC]",
        success: false,
        message: "settings.json hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath: settingsPath,
        backupPath: backupPath || undefined,
        error: `File ${settingsPath} không parse được. Sửa tay hoặc sao lưu rồi xoá, sau đó chạy lại.`,
      };
    }

    return {
      toolId: "claude",
      toolName: "[CC]",
      success: true,
      message: "Cấu hình [CC] thành công!",
      configPath: settingsPath,
      backupPath: backupPath || undefined,
    };
  } catch (error: any) {
    return {
      toolId: "claude",
      toolName: "[CC]",
      success: false,
      message: "Lỗi khi cấu hình [CC]",
      error: error?.message || String(error),
    };
  }
}

export interface ClaudeConfigPatch {
  fableModel?: string;
  sonnetModel?: string;
  opusModel?: string;
  haikuModel?: string;
  maxContextTokens?: string;
}

export async function saveClaudeFullSettings(
  apiKey: string,
  config: ClaudeConfigPatch
): Promise<SyncerResult> {
  const settingsPath = CLAUDE_SETTINGS_PATH;

  try {
    const backupPath = await createTimestampBackup(settingsPath);

    const cfg = await loadStaliConfig();
    const urls = resolveStaliUrls(cfg?.baseUrl);

    const set: Array<{ path: (string | number)[]; value: unknown }> = [
      { path: ["env", "ANTHROPIC_BASE_URL"], value: urls.anthropicBaseUrl },
      { path: ["env", "ANTHROPIC_AUTH_TOKEN"], value: apiKey.trim() },
      { path: ["env", "API_TIMEOUT_MS"], value: "600000" },
      { path: ["hasCompletedOnboarding"], value: true },
    ];
    if (config.fableModel) set.push({ path: ["env", "ANTHROPIC_MODEL"], value: config.fableModel });
    if (config.sonnetModel)
      set.push({ path: ["env", "ANTHROPIC_DEFAULT_SONNET_MODEL"], value: config.sonnetModel });
    if (config.opusModel)
      set.push({ path: ["env", "ANTHROPIC_DEFAULT_OPUS_MODEL"], value: config.opusModel });
    if (config.haikuModel)
      set.push({ path: ["env", "ANTHROPIC_DEFAULT_HAIKU_MODEL"], value: config.haikuModel });

    const remove: Array<(string | number)[]> = [["env", "ANTHROPIC_API_KEY"]];
    if (config.maxContextTokens !== undefined && !config.maxContextTokens) {
      remove.push(["env", "CLAUDE_CODE_MAX_CONTEXT_TOKENS"]);
    } else if (config.maxContextTokens) {
      set.push({
        path: ["env", "CLAUDE_CODE_MAX_CONTEXT_TOKENS"],
        value: String(config.maxContextTokens),
      });
    }

    const ok = await patchJsoncFile(settingsPath, { set, remove });
    if (!ok) {
      return {
        toolId: "claude",
        toolName: "[CC]",
        success: false,
        message: "settings.json hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath: settingsPath,
        backupPath: backupPath || undefined,
        error: `File ${settingsPath} không parse được.`,
      };
    }

    return {
      toolId: "claude",
      toolName: "[CC]",
      success: true,
      message: "Cấu hình [CC] thành công!",
      configPath: settingsPath,
      backupPath: backupPath || undefined,
    };
  } catch (error: any) {
    return {
      toolId: "claude",
      toolName: "[CC]",
      success: false,
      message: "Lỗi khi cấu hình [CC]",
      error: error?.message || String(error),
    };
  }
}

export async function resetClaudeSettings(): Promise<SyncerResult> {
  try {
    const backupPath = await createTimestampBackup(CLAUDE_SETTINGS_PATH);

    const ok = await patchJsoncFile(CLAUDE_SETTINGS_PATH, {
      remove: [
        ["env", "ANTHROPIC_BASE_URL"],
        ["env", "ANTHROPIC_AUTH_TOKEN"],
        ["env", "ANTHROPIC_MODEL"],
        ["env", "ANTHROPIC_DEFAULT_SONNET_MODEL"],
        ["env", "ANTHROPIC_DEFAULT_OPUS_MODEL"],
        ["env", "ANTHROPIC_DEFAULT_HAIKU_MODEL"],
        ["env", "CLAUDE_CODE_MAX_CONTEXT_TOKENS"],
        ["env", "API_TIMEOUT_MS"],
      ],
    });
    if (!ok) {
      return {
        toolId: "claude",
        toolName: "[CC]",
        success: false,
        message: "settings.json hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath: CLAUDE_SETTINGS_PATH,
        backupPath: backupPath || undefined,
        error: `File ${CLAUDE_SETTINGS_PATH} không parse được.`,
      };
    }

    return {
      toolId: "claude",
      toolName: "[CC]",
      success: true,
      message: "Đã reset cấu hình [CC] về mặc định!",
      configPath: CLAUDE_SETTINGS_PATH,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "claude",
      toolName: "[CC]",
      success: false,
      message: "Lỗi khi reset [CC]",
      error: e?.message || String(e),
    };
  }
}
