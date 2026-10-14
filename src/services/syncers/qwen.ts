import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchJsoncFile } from "../../utils/file";
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

    // Vá tại chỗ: giữ chú thích + mọi key khác trong settings.json.
    const ok = await patchJsoncFile(configPath, {
      set: [
        {
          path: ["security", "auth"],
          value: { selectedType: "openai", apiKey: apiKey.trim(), baseUrl: urls.openAiBaseUrl },
        },
        { path: ["model"], value: { name: model } },
      ],
    });
    if (!ok) {
      return {
        toolId: "qwen",
        toolName: "Qwen Code",
        success: false,
        message: "settings.json hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath,
        backupPath: backupPath || undefined,
        error: `File ${configPath} không parse được. Sửa tay hoặc sao lưu rồi xoá, sau đó chạy lại.`,
      };
    }

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
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function resetQwenSettings(): Promise<SyncerResult> {
  return restoreToolConfig(QWEN_CONFIG_PATH);
}
