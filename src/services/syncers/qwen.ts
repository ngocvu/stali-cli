import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { readJsonFile, writeJsonFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const QWEN_CONFIG_PATH = path.join(os.homedir(), ".qwen", "settings.json");

export async function patchQwenSettings(
  apiKey: string,
  model = "stali/qwen3-codex",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  const configPath = QWEN_CONFIG_PATH;
  try {
    const backupPath = await createTimestampBackup(configPath);
    const data = (await readJsonFile(configPath)) || {};
    if (!data.security) data.security = {};
    data.security.auth = {
      selectedType: "openai",
      apiKey: apiKey.trim(),
      baseUrl: urls.openAiBaseUrl,
    };
    data.model = { name: model };
    await writeJsonFile(configPath, data);
    return {
      toolId: "qwen",
      toolName: "Qwen Code",
      success: true,
      message: "Cấu hình Qwen Code thành công!",
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "qwen",
      toolName: "Qwen Code",
      success: false,
      message: "Lỗi cấu hình Qwen Code",
      error: e?.message || String(e),
    };
  }
}

export async function resetQwenSettings(): Promise<SyncerResult> {
  return restoreToolConfig(QWEN_CONFIG_PATH);
}
