import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchJsoncFile, readJsonFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import { isStaliLikeUrl } from "../../utils/stali-urls";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

/** Đường dẫn cũ (SAI) — Droid đọc `~/.factory/settings.json`. */
export const DROID_CONFIG_PATH = path.join(os.homedir(), ".droid", "config.json");

/** Chọn `~/.factory/settings.json` (đã kiểm chứng). */
async function droidPath(): Promise<string> {
  const info = await resolveToolConfigPath("droid");
  return info?.chosen ?? path.join(os.homedir(), ".factory", "settings.json");
}

/** Tên hiển thị của model Stali trong Droid. */
function droidDisplayName(modelId: string): string {
  return `Stali: ${modelId}`;
}

/**
 * Cấu hình Factory Droid (BYOK custom model).
 *
 * Schema đã đối chiếu docs BYOK + binary `droid@0.243.0`:
 *
 * ```json
 * {
 *   "customModels": [
 *     {
 *       "model": "<model-id>",
 *       "displayName": "Stali: <model-id>",
 *       "provider": "generic-chat-completion-api",
 *       "baseUrl": "https://api.stali.vn/v1",
 *       "apiKey": "sk-stali-..."
 *     }
 *   ]
 * }
 * ```
 *
 * Bằng chứng: docs BYOK nêu khoá camelCase `customModels` trong
 * `~/.factory/settings.json`; binary có `custom_models` + trường
 * `model`/`displayName`/`provider`/`baseUrl`/`apiKey`; enum provider gồm
 * `anthropic`, `openai`, `generic-chat-completion-api`. Stali phục vụ
 * Chat Completions nên dùng `generic-chat-completion-api`.
 *
 * Bản cũ ghi `provider: { type, baseUrl, apiKey }` + `model` vào
 * `~/.droid/config.json` — Droid KHÔNG đọc file đó.
 */
export async function patchDroidSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  const configPath = await droidPath();
  const key = apiKey.trim();
  const modelId = model.trim() || "claude-fable-5";

  try {
    const backupPath = await createTimestampBackup(configPath);

    // Giữ các custom model KHÁC của người dùng, chỉ thay/thêm entry Stali.
    const existing = await readJsonFile<any>(configPath);
    const prior: any[] = Array.isArray(existing?.customModels) ? existing.customModels : [];
    const kept = prior.filter((m) => m && m.model !== modelId);

    const entry = {
      model: modelId,
      displayName: droidDisplayName(modelId),
      provider: "generic-chat-completion-api",
      baseUrl: urls.openAiBaseUrl,
      apiKey: key,
    };

    const ok = await patchJsoncFile(configPath, {
      set: [{ path: ["customModels"], value: [entry, ...kept] }],
    });
    if (!ok) {
      return {
        toolId: "droid",
        toolName: "Droid CLI",
        success: false,
        message: "settings.json hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath,
        backupPath: backupPath || undefined,
        error: `File ${configPath} không parse được. Sửa tay hoặc sao lưu rồi xoá, sau đó chạy lại.`,
      };
    }

    return {
      toolId: "droid",
      toolName: "Droid CLI",
      success: true,
      message: `Cấu hình Droid CLI thành công! (${configPath})`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "droid",
      toolName: "Droid CLI",
      success: false,
      message: "Lỗi cấu hình Droid CLI",
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function resetDroidSettings(): Promise<SyncerResult> {
  return restoreToolConfig(await droidPath());
}
