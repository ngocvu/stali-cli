import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchJsoncFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const QWEN_CONFIG_PATH = path.join(os.homedir(), ".qwen", "settings.json");

/** Chọn ~/.qwen/settings.json (đã kiểm chứng Qwen Code dùng file này). */
async function qwenPath(): Promise<string> {
  const info = await resolveToolConfigPath("qwen");
  return info?.chosen ?? QWEN_CONFIG_PATH;
}

/**
 * Cấu hình Qwen Code.
 *
 * Schema đã đối chiếu với `@qwen-code/qwen-code` (package thật, v0.25.1):
 *
 * ```jsonc
 * {
 *   "security": { "auth": { "selectedType": "openai", "apiKey": "sk-..." } },
 *   "model": { "name": "<model-id>", "baseUrl": "https://api.stali.vn/v1" }
 * }
 * ```
 *
 * Bằng chứng trong bundle của Qwen:
 *  - `settings.setValue("model.name", ...)`
 *  - `settings.setValue("model.baseUrl", ...)`
 *  - `settings.setValue(scope, "security.auth.selectedType", ...)`
 *  - i18n: `"security.auth.apiKey oder die Umgebungsvariable {{envKeyHint}}"`
 *  - `providerProtocol["<providerId>"] = "<protocol>"`
 *
 * LƯU Ý: base URL nằm ở `model.baseUrl` (KHÔNG phải `security.auth.baseUrl`).
 * Bản cũ chỉ ghi `security.auth.baseUrl` + `model.name` → Qwen không thấy
 * base URL nên vẫn gọi endpoint mặc định.
 */
export async function patchQwenSettings(
  apiKey: string,
  model = "stali/qwen3-codex",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  const configPath = await qwenPath();
  const key = apiKey.trim();

  try {
    const backupPath = await createTimestampBackup(configPath);

    const ok = await patchJsoncFile(configPath, {
      set: [
        // Kiểu xác thực: dùng API key (không phải OAuth của Qwen).
        { path: ["security", "auth", "selectedType"], value: "openai" },
        { path: ["security", "auth", "apiKey"], value: key },
        // Model + base URL — Qwen đọc ở đây, KHÔNG đọc security.auth.baseUrl.
        { path: ["model", "name"], value: model },
        { path: ["model", "baseUrl"], value: urls.openAiBaseUrl },
        // Khai báo provider để Qwen biết giao thức của endpoint Stali.
        { path: ["providerProtocol", "stali"], value: "openai" },
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
      message: `Cấu hình Qwen Code thành công! (${configPath})`,
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
  return restoreToolConfig(await qwenPath());
}
