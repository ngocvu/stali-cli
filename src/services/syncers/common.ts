import { SyncerResult } from "../../types";
import {
  STALI_ANTHROPIC_BASE_URL,
  STALI_OPENAI_BASE_URL,
} from "../../constants/api";
import {
  readJsonFile,
  writeJsonFile,
  readTomlFile,
  writeTomlFile,
} from "../../utils/file";
import { createTimestampBackup, listBackupsForFile, restoreFromBackup } from "../../utils/backup";

export interface PatchOptions {
  requireBackup?: boolean;
}

async function ensureBackup(
  configPath: string,
  requireBackup: boolean
): Promise<string | null> {
  return createTimestampBackup(configPath, {
    requireExistingBackup: requireBackup,
  });
}

export async function restoreToolConfig(configPath: string): Promise<SyncerResult> {
  const backups = await listBackupsForFile(configPath);
  if (backups.length === 0) {
    return {
      toolId: "restore",
      toolName: "Restore",
      success: false,
      message: `Không tìm thấy backup cho ${configPath}`,
      configPath,
      error: "NO_BACKUP",
    };
  }

  try {
    const { restored, target } = await restoreFromBackup(backups[0], configPath);
    return {
      toolId: "restore",
      toolName: "Restore",
      success: true,
      message: `Đã khôi phục từ ${restored}`,
      configPath: target,
      backupPath: restored,
    };
  } catch (e: any) {
    return {
      toolId: "restore",
      toolName: "Restore",
      success: false,
      message: "Không thể khôi phục backup",
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function patchAnthropicEnvJsonTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model?: string,
  options?: PatchOptions
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const data = (await readJsonFile(configPath)) || {};
    const env = { ...(data.env || {}) };

    env.ANTHROPIC_BASE_URL = STALI_ANTHROPIC_BASE_URL;
    env.ANTHROPIC_AUTH_TOKEN = apiKey.trim();
    env.API_TIMEOUT_MS = "600000";
    delete env.ANTHROPIC_API_KEY;

    if (model) {
      env.ANTHROPIC_MODEL = model;
      env.ANTHROPIC_DEFAULT_FABLE_MODEL = model;
      env.ANTHROPIC_DEFAULT_OPUS_MODEL = model;
      env.ANTHROPIC_DEFAULT_SONNET_MODEL = model;
      env.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
    }

    data.env = env;
    data.hasCompletedOnboarding = true;
    if (model) data.model = model;

    await writeJsonFile(configPath, data);
    return {
      toolId,
      toolName,
      success: true,
      message: `Cấu hình ${toolName} thành công!`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId,
      toolName,
      success: false,
      message: `Lỗi cấu hình ${toolName}`,
      error: e?.message || String(e),
    };
  }
}

export async function patchOpenAiProviderJsonTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model?: string,
  options?: PatchOptions
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const data = (await readJsonFile(configPath)) || {};
    const resolvedModel = model || "gpt-5.6-sol";

    data.provider = {
      ...(data.provider || {}),
      stali: {
        npm: "@ai-sdk/openai-compatible",
        name: "Stali API",
        options: {
          baseURL: STALI_OPENAI_BASE_URL,
          apiKey: apiKey.trim(),
        },
        models: {
          [resolvedModel]: { name: resolvedModel },
        },
      },
    };
    data.defaultProvider = "stali";
    data.model = resolvedModel;

    await writeJsonFile(configPath, data);
    return {
      toolId,
      toolName,
      success: true,
      message: `Cấu hình ${toolName} thành công!`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId,
      toolName,
      success: false,
      message: `Lỗi cấu hình ${toolName}`,
      error: e?.message || String(e),
    };
  }
}

export async function patchVsCodeAgentJsonTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model = "claude-fable-5",
  options?: PatchOptions
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const data = (await readJsonFile(configPath)) || {};

    data.apiProvider = "anthropic";
    data.anthropicApiKey = apiKey.trim();
    data.anthropicBaseUrl = STALI_ANTHROPIC_BASE_URL;
    data.anthropicModelId = model;
    data.openAiModelId = model;

    await writeJsonFile(configPath, data);
    return {
      toolId,
      toolName,
      success: true,
      message: `Cấu hình ${toolName} thành công!`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId,
      toolName,
      success: false,
      message: `Lỗi cấu hình ${toolName}`,
      error: e?.message || String(e),
    };
  }
}

export async function patchOpenAiTomlTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model?: string,
  options?: PatchOptions
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const data = (await readTomlFile(configPath)) || {};

    data.provider = "openai";
    data.base_url = STALI_OPENAI_BASE_URL;
    data.api_key = apiKey.trim();
    if (model) data.model = model;

    await writeTomlFile(configPath, data);
    return {
      toolId,
      toolName,
      success: true,
      message: `Cấu hình ${toolName} thành công!`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId,
      toolName,
      success: false,
      message: `Lỗi cấu hình ${toolName}`,
      error: e?.message || String(e),
    };
  }
}

export async function patchDroidJsonTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model = "claude-fable-5",
  options?: PatchOptions
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const data = (await readJsonFile(configPath)) || {};

    data.provider = {
      type: "openai",
      baseUrl: STALI_OPENAI_BASE_URL,
      apiKey: apiKey.trim(),
    };
    data.model = model;

    await writeJsonFile(configPath, data);
    return {
      toolId,
      toolName,
      success: true,
      message: `Cấu hình ${toolName} thành công!`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId,
      toolName,
      success: false,
      message: `Lỗi cấu hình ${toolName}`,
      error: e?.message || String(e),
    };
  }
}

export async function patchCoworkJsonTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model = "gpt-5.6-sol",
  options?: PatchOptions
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const data = (await readJsonFile(configPath)) || {};

    data.openai = {
      baseUrl: STALI_OPENAI_BASE_URL,
      apiKey: apiKey.trim(),
      model,
    };
    data.defaultModel = model;

    await writeJsonFile(configPath, data);
    return {
      toolId,
      toolName,
      success: true,
      message: `Cấu hình ${toolName} thành công!`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId,
      toolName,
      success: false,
      message: `Lỗi cấu hình ${toolName}`,
      error: e?.message || String(e),
    };
  }
}
