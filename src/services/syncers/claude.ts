import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { resolveStaliUrls } from "../../utils/stali-urls";
import { readJsonFile, writeJsonFile, ensureParentDir } from "../../utils/file";
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
  const existing = await readJsonFile(CLAUDE_SETTINGS_PATH);
  if (!existing || !existing.env) {
    return { configured: false };
  }
  const env = existing.env;
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
    // 1. Create backup with timestamp if file exists
    const backupPath = await createTimestampBackup(settingsPath);

    // 2. Read existing settings
    const existing = (await readJsonFile(settingsPath)) || {};

    // 3. Prepare env block
    const env = { ...(existing.env || {}) };
    env.ANTHROPIC_BASE_URL = urls.anthropicBaseUrl;
    env.ANTHROPIC_AUTH_TOKEN = apiKey.trim();
    env.API_TIMEOUT_MS = "600000";

    // Clean conflicting ANTHROPIC_API_KEY
    delete env.ANTHROPIC_API_KEY;

    if (model) {
      if (modelType === "fable") {
        env.ANTHROPIC_MODEL = model;
      } else if (modelType === "sonnet") {
        env.ANTHROPIC_DEFAULT_SONNET_MODEL = model;
      } else if (modelType === "opus") {
        env.ANTHROPIC_DEFAULT_OPUS_MODEL = model;
      } else if (modelType === "haiku") {
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
      } else {
        env.ANTHROPIC_MODEL = model;
        env.ANTHROPIC_DEFAULT_SONNET_MODEL = model;
        env.ANTHROPIC_DEFAULT_OPUS_MODEL = model;
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
      }
    }

    if (maxContextTokens !== undefined) {
      if (maxContextTokens) {
        env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = String(maxContextTokens);
      } else {
        delete env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
      }
    }

    const updated = {
      ...existing,
      hasCompletedOnboarding: true,
      env,
    };

    // 4. Write back
    await ensureParentDir(settingsPath);
    await writeJsonFile(settingsPath, updated);

    return {
      toolId: "claude",
      toolName: "Claude Code",
      success: true,
      message: "Cấu hình Claude Code thành công!",
      configPath: settingsPath,
      backupPath: backupPath || undefined,
    };
  } catch (error: any) {
    return {
      toolId: "claude",
      toolName: "Claude Code",
      success: false,
      message: "Lỗi khi cấu hình Claude Code",
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
    const existing = (await readJsonFile(settingsPath)) || {};

    const cfg = await loadStaliConfig();
    const urls = resolveStaliUrls(cfg?.baseUrl);
    const env = { ...(existing.env || {}) };
    env.ANTHROPIC_BASE_URL = urls.anthropicBaseUrl;
    env.ANTHROPIC_AUTH_TOKEN = apiKey.trim();
    env.API_TIMEOUT_MS = "600000";

    delete env.ANTHROPIC_API_KEY;

    if (config.fableModel) env.ANTHROPIC_MODEL = config.fableModel;
    if (config.sonnetModel) env.ANTHROPIC_DEFAULT_SONNET_MODEL = config.sonnetModel;
    if (config.opusModel) env.ANTHROPIC_DEFAULT_OPUS_MODEL = config.opusModel;
    if (config.haikuModel) env.ANTHROPIC_DEFAULT_HAIKU_MODEL = config.haikuModel;

    if (config.maxContextTokens !== undefined) {
      if (config.maxContextTokens) {
        env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = String(config.maxContextTokens);
      } else {
        delete env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
      }
    }

    const updated = {
      ...existing,
      hasCompletedOnboarding: true,
      env,
    };

    await ensureParentDir(settingsPath);
    await writeJsonFile(settingsPath, updated);

    return {
      toolId: "claude",
      toolName: "Claude Code",
      success: true,
      message: "Cấu hình Claude Code thành công!",
      configPath: settingsPath,
      backupPath: backupPath || undefined,
    };
  } catch (error: any) {
    return {
      toolId: "claude",
      toolName: "Claude Code",
      success: false,
      message: "Lỗi khi cấu hình Claude Code",
      error: error?.message || String(error),
    };
  }
}

export async function resetClaudeSettings(): Promise<SyncerResult> {
  try {
    const backupPath = await createTimestampBackup(CLAUDE_SETTINGS_PATH);
    const existing = (await readJsonFile(CLAUDE_SETTINGS_PATH)) || {};
    if (existing.env) {
      delete existing.env.ANTHROPIC_BASE_URL;
      delete existing.env.ANTHROPIC_AUTH_TOKEN;
      delete existing.env.ANTHROPIC_MODEL;
      delete existing.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
      delete existing.env.ANTHROPIC_DEFAULT_OPUS_MODEL;
      delete existing.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      delete existing.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
      delete existing.env.API_TIMEOUT_MS;
    }
    await writeJsonFile(CLAUDE_SETTINGS_PATH, existing);
    return {
      toolId: "claude",
      toolName: "Claude Code",
      success: true,
      message: "Đã reset cấu hình Claude Code về mặc định!",
      configPath: CLAUDE_SETTINGS_PATH,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "claude",
      toolName: "Claude Code",
      success: false,
      message: "Lỗi khi reset Claude Code",
      error: e?.message || String(e),
    };
  }
}
