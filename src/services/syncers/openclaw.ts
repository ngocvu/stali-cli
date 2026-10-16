import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchJsoncFile, readJsonFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { STALI_PROVIDER_ID } from "../../constants/tool-providers";
import { restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import { isStaliLikeUrl } from "../../utils/stali-urls";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

/** Đường dẫn cũ (SAI) — OpenClaw đọc `openclaw.json`, không đọc `config.json`. */
export const OPENCLAW_CONFIG_PATH = path.join(os.homedir(), ".openclaw", "config.json");

/** Provider id dùng trong `models.providers.<id>`. */
export const OPENCLAW_PROVIDER_ID = STALI_PROVIDER_ID;

/** Chọn `~/.openclaw/openclaw.json` (đã kiểm chứng). */
async function openclawPath(): Promise<string> {
  const info = await resolveToolConfigPath("openclaw");
  return info?.chosen ?? path.join(os.homedir(), ".openclaw", "openclaw.json");
}

/**
 * Cấu hình OpenClaw.
 *
 * Schema đã đối chiếu docs + bundle `openclaw@2026.10.4`:
 *
 * ```json5
 * {
 *   "models": {
 *     "providers": {
 *       "stali": {
 *         "baseUrl": "https://api.stali.vn/v1",
 *         "apiKey": "sk-stali-...",
 *         "api": "openai-completions",
 *         "models": [{ "id": "<model>", "name": "<model>" }]
 *       }
 *     }
 *   },
 *   "agents": { "defaults": { "model": { "primary": "stali/<model>" } } }
 * }
 * ```
 *
 * Bằng chứng: docs khẳng định file là `~/.openclaw/openclaw.json` (JSON5) và
 * custom provider khai ở `models.providers.<id>` với `baseUrl`/`apiKey`/`api`;
 * bundle có các adapter `anthropic-messages`, `openai-completions`,
 * `openai-responses`. Model mặc định ở `agents.defaults.model.primary`.
 *
 * Bản cũ ghi `env.ANTHROPIC_BASE_URL` vào `~/.openclaw/config.json` — OpenClaw
 * KHÔNG đọc file đó, nên cấu hình Stali bị bỏ qua hoàn toàn.
 */
export async function patchOpenClawSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  const configPath = await openclawPath();
  const key = apiKey.trim();
  const modelId = model.trim() || "claude-fable-5";
  const ref = `${OPENCLAW_PROVIDER_ID}/${modelId}`;

  try {
    const backupPath = await createTimestampBackup(configPath);

    const ok = await patchJsoncFile(configPath, {
      set: [
        { path: ["models", "providers", OPENCLAW_PROVIDER_ID, "baseUrl"], value: urls.openAiBaseUrl },
        { path: ["models", "providers", OPENCLAW_PROVIDER_ID, "apiKey"], value: key },
        { path: ["models", "providers", OPENCLAW_PROVIDER_ID, "api"], value: "openai-completions" },
        {
          path: ["models", "providers", OPENCLAW_PROVIDER_ID, "models"],
          value: [{ id: modelId, name: modelId }],
        },
        { path: ["agents", "defaults", "model", "primary"], value: ref },
      ],
    });
    if (!ok) {
      return {
        toolId: "openclaw",
        toolName: "OpenClaw",
        success: false,
        message: "openclaw.json hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath,
        backupPath: backupPath || undefined,
        error: `File ${configPath} không parse được. Sửa tay hoặc sao lưu rồi xoá, sau đó chạy lại.`,
      };
    }

    return {
      toolId: "openclaw",
      toolName: "OpenClaw",
      success: true,
      message: `Cấu hình OpenClaw thành công! (${configPath})`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "openclaw",
      toolName: "OpenClaw",
      success: false,
      message: "Lỗi cấu hình OpenClaw",
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function resetOpenClawSettings(): Promise<SyncerResult> {
  return restoreToolConfig(await openclawPath());
}
