import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { readTomlFile, writeTomlFile, readJsonFile, writeJsonFile, ensureParentDir } from "../../utils/file";
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
  const parsed = await readTomlFile(CODEX_CONFIG_PATH);
  const authData = await readJsonFile(CODEX_AUTH_PATH);
  if (!parsed) {
    return { configured: false };
  }
  const configured = Boolean(
    parsed.model_provider === "stali" || parsed.model_providers?.stali
  );
  return {
    configured,
    endpoint:
      parsed.model_providers?.stali?.base_url ||
      (configured ? defaultStaliUrls().openAiBaseUrl : undefined),
    model: parsed.model,
    subagentModel: parsed.agents?.subagent?.model,
    apiKey: authData?.OPENAI_API_KEY,
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

    // 2. Read existing TOML or create new
    const parsed = (await readTomlFile(CODEX_CONFIG_PATH)) || {};

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

    // 4. Write config.toml
    await ensureParentDir(CODEX_CONFIG_PATH);
    await writeTomlFile(CODEX_CONFIG_PATH, parsed);

    // 5. Update auth.json
    const authData = (await readJsonFile(CODEX_AUTH_PATH)) || {};
    authData.OPENAI_API_KEY = apiKey.trim();
    authData.auth_mode = "apikey";
    await writeJsonFile(CODEX_AUTH_PATH, authData);

    return {
      toolId: "codex",
      toolName: "OpenAI Codex CLI",
      success: true,
      message: "Cấu hình OpenAI Codex CLI thành công!",
      configPath: CODEX_CONFIG_PATH,
      backupPath: backupPath || undefined,
    };
  } catch (error: any) {
    return {
      toolId: "codex",
      toolName: "OpenAI Codex CLI",
      success: false,
      message: "Lỗi khi cấu hình OpenAI Codex CLI",
      error: error?.message || String(error),
    };
  }
}

export async function resetCodexSettings(): Promise<SyncerResult> {
  try {
    const backupPath = await createTimestampBackup(CODEX_CONFIG_PATH);
    const parsed = (await readTomlFile(CODEX_CONFIG_PATH)) || {};
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
      toolName: "OpenAI Codex CLI",
      success: true,
      message: "Đã reset cấu hình OpenAI Codex CLI về mặc định!",
      configPath: CODEX_CONFIG_PATH,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "codex",
      toolName: "OpenAI Codex CLI",
      success: false,
      message: "Lỗi khi reset OpenAI Codex CLI",
      error: e?.message || String(e),
    };
  }
}
