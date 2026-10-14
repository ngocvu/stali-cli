import { SyncerResult } from "../../types";
import { resolveStaliUrls, type StaliResolvedUrls } from "../../utils/stali-urls";
import {
  readJsonFileDetailed,
  patchJsoncFile,
  readTomlFileDetailed,
  writeTomlFile,
} from "../../utils/file";
import { createTimestampBackup, listBackupsForFile, restoreFromBackup } from "../../utils/backup";

export interface PatchOptions {
  requireBackup?: boolean;
}

/**
 * Lỗi khi file cấu hình của người dùng tồn tại nhưng hỏng định dạng.
 * Ném ra để syncer DỪNG thay vì ghi đè làm mất dữ liệu.
 */
export class CorruptConfigError extends Error {
  constructor(public readonly filePath: string) {
    super(
      `File cấu hình hỏng định dạng: ${filePath} — không ghi đè để tránh mất dữ liệu. ` +
        `Sửa tay (hoặc sao lưu rồi xoá) file này rồi chạy lại.`
    );
    this.name = "CorruptConfigError";
  }
}

/** Lỗi khi file TOML tồn tại nhưng hỏng — cũng không được ghi đè. */
export class CorruptTomlError extends Error {
  constructor(public readonly filePath: string) {
    super(
      `File TOML hỏng định dạng: ${filePath} — không ghi đè để tránh mất dữ liệu. ` +
        `Sửa tay (hoặc sao lưu rồi xoá) file này rồi chạy lại.`
    );
    this.name = "CorruptTomlError";
  }
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

/**
 * Đọc JSON cấu hình để GHI. Ném `CorruptConfigError` nếu file hỏng —
 * người gọi bắt lỗi và trả SyncerResult thất bại thay vì ghi đè.
 */
async function readJsonForWrite<T = any>(configPath: string): Promise<T> {
  const read = await readJsonFileDetailed<T>(configPath);
  if (read.corrupt) throw new CorruptConfigError(configPath);
  return (read.data ?? ({} as T)) as T;
}

/** Đọc TOML cấu hình để GHI, ném `CorruptTomlError` nếu hỏng. */
async function readTomlForWrite<T = any>(configPath: string): Promise<T> {
  const read = await readTomlFileDetailed<T>(configPath);
  if (read.corrupt) throw new CorruptTomlError(configPath);
  return (read.data ?? ({} as T)) as T;
}

export async function patchAnthropicEnvJsonTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model?: string,
  options?: PatchOptions,
  urls: StaliResolvedUrls = resolveStaliUrls()
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);

    // Vá tại chỗ: giữ chú thích + định dạng + key lạ của người dùng.
    const set: Array<{ path: (string | number)[]; value: unknown }> = [
      { path: ["env", "ANTHROPIC_BASE_URL"], value: urls.anthropicBaseUrl },
      { path: ["env", "ANTHROPIC_AUTH_TOKEN"], value: apiKey.trim() },
      { path: ["env", "API_TIMEOUT_MS"], value: "600000" },
      { path: ["hasCompletedOnboarding"], value: true },
    ];
    if (model) {
      set.push(
        { path: ["env", "ANTHROPIC_MODEL"], value: model },
        { path: ["env", "ANTHROPIC_DEFAULT_FABLE_MODEL"], value: model },
        { path: ["env", "ANTHROPIC_DEFAULT_OPUS_MODEL"], value: model },
        { path: ["env", "ANTHROPIC_DEFAULT_SONNET_MODEL"], value: model },
        { path: ["env", "ANTHROPIC_DEFAULT_HAIKU_MODEL"], value: model },
        { path: ["model"], value: model }
      );
    }
    const ok = await patchJsoncFile(configPath, {
      set,
      remove: [["env", "ANTHROPIC_API_KEY"]],
    });
    if (!ok) throw new CorruptConfigError(configPath);

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
      configPath,
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
  options?: PatchOptions,
  urls: StaliResolvedUrls = resolveStaliUrls()
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const resolvedModel = model || "gpt-5.6-sol";

    // Merge vào provider.stali hiện có (không xoá provider khác của người dùng).
    const data = await readJsonForWrite<Record<string, any>>(configPath);
    const stali = {
      ...(data.provider?.stali || {}),
      npm: "@ai-sdk/openai-compatible",
      name: "Stali API",
      options: {
        ...(data.provider?.stali?.options || {}),
        baseURL: urls.openAiBaseUrl,
        apiKey: apiKey.trim(),
      },
      models: {
        ...(data.provider?.stali?.models || {}),
        [resolvedModel]: { name: resolvedModel },
      },
    };

    const ok = await patchJsoncFile(configPath, {
      set: [
        { path: ["provider", "stali"], value: stali },
        { path: ["defaultProvider"], value: "stali" },
        { path: ["model"], value: resolvedModel },
      ],
    });
    if (!ok) throw new CorruptConfigError(configPath);

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
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function patchVsCodeAgentJsonTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model = "",
  options?: PatchOptions,
  urls: StaliResolvedUrls = resolveStaliUrls()
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const ok = await patchJsoncFile(configPath, {
      set: [
        { path: ["apiProvider"], value: "anthropic" },
        { path: ["anthropicApiKey"], value: apiKey.trim() },
        { path: ["anthropicBaseUrl"], value: urls.anthropicBaseUrl },
        { path: ["anthropicModelId"], value: model },
        { path: ["openAiModelId"], value: model },
      ],
    });
    if (!ok) throw new CorruptConfigError(configPath);

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
      configPath,
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
  options?: PatchOptions,
  urls: StaliResolvedUrls = resolveStaliUrls()
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const data = await readTomlForWrite<Record<string, any>>(configPath);

    data.provider = "openai";
    data.base_url = urls.openAiBaseUrl;
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
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function patchDroidJsonTool(
  toolId: string,
  toolName: string,
  configPath: string,
  apiKey: string,
  model = "",
  options?: PatchOptions,
  urls: StaliResolvedUrls = resolveStaliUrls()
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const ok = await patchJsoncFile(configPath, {
      set: [
        {
          path: ["provider"],
          value: { type: "openai", baseUrl: urls.openAiBaseUrl, apiKey: apiKey.trim() },
        },
        { path: ["model"], value: model },
      ],
    });
    if (!ok) throw new CorruptConfigError(configPath);

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
      configPath,
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
  options?: PatchOptions,
  urls: StaliResolvedUrls = resolveStaliUrls()
): Promise<SyncerResult> {
  try {
    const backupPath = await ensureBackup(configPath, options?.requireBackup ?? false);
    const ok = await patchJsoncFile(configPath, {
      set: [
        { path: ["openai"], value: { baseUrl: urls.openAiBaseUrl, apiKey: apiKey.trim(), model } },
        { path: ["defaultModel"], value: model },
      ],
    });
    if (!ok) throw new CorruptConfigError(configPath);

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
      configPath,
      error: e?.message || String(e),
    };
  }
}
