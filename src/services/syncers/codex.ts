import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import {
  readTomlFileDetailed,
  writeTomlFile,
  readJsonFileDetailed,
  writeJsonFile,
} from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";
import { resolveStaliUrls as defaultStaliUrls } from "../../utils/stali-urls";

export const CODEX_DIR = path.join(os.homedir(), ".codex");
export const CODEX_CONFIG_PATH = path.join(CODEX_DIR, "config.toml");
export const CODEX_AUTH_PATH = path.join(CODEX_DIR, "auth.json");

export interface CodexStatus {
  configured: boolean;
  endpoint?: string;
  model?: string;
  subagentModel?: string;
  apiKey?: string;
}

export async function getCodexStatus(): Promise<CodexStatus> {
  const parsed = await readTomlFileDetailed<any>(CODEX_CONFIG_PATH);
  const authData = await readJsonFileDetailed<any>(CODEX_AUTH_PATH);
  if (!parsed.data) {
    return { configured: false };
  }
  const configured = Boolean(
    parsed.data.model_provider === "stali" || parsed.data.model_providers?.stali
  );
  return {
    configured,
    endpoint:
      parsed.data.model_providers?.stali?.base_url ||
      (configured ? defaultStaliUrls().openAiBaseUrl : undefined),
    model: parsed.data.model,
    subagentModel: parsed.data.agents?.subagent?.model,
    apiKey: authData.data?.OPENAI_API_KEY,
  };
}

export async function patchCodexSettings(
  apiKey: string,
  model = "req/gpt-5.6-sol",
  subagentModel?: string,
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  try {
    // 1. Backup config.toml and auth.json
    const backupPath = await createTimestampBackup(CODEX_CONFIG_PATH);
    await createTimestampBackup(CODEX_AUTH_PATH);

    // 2. Đọc TOML — DỪNG nếu file hỏng thay vì ghi đè làm mất config
    const tomlRead = await readTomlFileDetailed<Record<string, any>>(CODEX_CONFIG_PATH);
    if (tomlRead.corrupt) {
      return {
        toolId: "codex",
        toolName: "[OC] CLI",
        success: false,
        message: "config.toml hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath: CODEX_CONFIG_PATH,
        backupPath: backupPath || undefined,
        error: `File ${CODEX_CONFIG_PATH} không parse được. Sửa tay hoặc sao lưu rồi xoá, sau đó chạy lại.`,
      };
    }
    const parsed = tomlRead.data || {};

    // 3. Update fields matching 9router pattern
    parsed.model = model;
    parsed.model_provider = "stali";

    if (!parsed.model_providers) parsed.model_providers = {};
    parsed.model_providers.stali = {
      name: "Stali API",
      base_url: urls.openAiBaseUrl,
      wire_api: "responses",
    };

    if (!parsed.agents) parsed.agents = {};
    parsed.agents.subagent = {
      model: subagentModel?.trim() || model,
    };

    // 4. Write config.toml (nguyên tử)
    await writeTomlFile(CODEX_CONFIG_PATH, parsed);

    // 5. Update auth.json — cũng phải kiểm tra hỏng trước khi ghi
    const authRead = await readJsonFileDetailed<Record<string, any>>(CODEX_AUTH_PATH);
    if (authRead.corrupt) {
      return {
        toolId: "codex",
        toolName: "[OC] CLI",
        success: false,
        message: "auth.json hỏng định dạng — đã cập nhật config.toml, CHƯA ghi auth.json",
        configPath: CODEX_AUTH_PATH,
        backupPath: backupPath || undefined,
        error: `File ${CODEX_AUTH_PATH} không parse được. Sửa tay hoặc sao lưu rồi xoá, sau đó chạy lại.`,
      };
    }
    const authData = authRead.data || {};
    authData.OPENAI_API_KEY = apiKey.trim();
    authData.auth_mode = "apikey";
    await writeJsonFile(CODEX_AUTH_PATH, authData);

    return {
      toolId: "codex",
      toolName: "[OC] CLI",
      success: true,
      message: "Cấu hình [OC] CLI thành công!",
      configPath: CODEX_CONFIG_PATH,
      backupPath: backupPath || undefined,
    };
  } catch (error: any) {
    return {
      toolId: "codex",
      toolName: "[OC] CLI",
      success: false,
      message: "Lỗi khi cấu hình [OC] CLI",
      error: error?.message || String(error),
    };
  }
}

export async function resetCodexSettings(): Promise<SyncerResult> {
  try {
    const backupPath = await createTimestampBackup(CODEX_CONFIG_PATH);
    const tomlRead = await readTomlFileDetailed<Record<string, any>>(CODEX_CONFIG_PATH);
    if (tomlRead.corrupt) {
      return {
        toolId: "codex",
        toolName: "[OC] CLI",
        success: false,
        message: "config.toml hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath: CODEX_CONFIG_PATH,
        backupPath: backupPath || undefined,
        error: `File ${CODEX_CONFIG_PATH} không parse được.`,
      };
    }
    const parsed = tomlRead.data || {};
    if (parsed.model_providers?.stali) {
      delete parsed.model_providers.stali;
    }
    if (parsed.model_provider === "stali") {
      delete parsed.model_provider;
    }
    if (parsed.agents?.subagent) {
      delete parsed.agents.subagent;
    }
    await writeTomlFile(CODEX_CONFIG_PATH, parsed);
    return {
      toolId: "codex",
      toolName: "[OC] CLI",
      success: true,
      message: "Đã reset cấu hình [OC] CLI về mặc định!",
      configPath: CODEX_CONFIG_PATH,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "codex",
      toolName: "[OC] CLI",
      success: false,
      message: "Lỗi khi reset [OC] CLI",
      error: e?.message || String(e),
    };
  }
}
