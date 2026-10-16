import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { readTomlFileDetailed, writeTomlFile, readJsonFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { STALI_PROVIDER_ID } from "../../constants/tool-providers";
import { restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import { isStaliLikeUrl } from "../../utils/stali-urls";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const GROK_CONFIG_PATH = path.join(os.homedir(), ".grok", "config.toml");

/** Provider id dùng trong `[model_providers.<id>]`. */
export const GROK_PROVIDER_ID = STALI_PROVIDER_ID;

async function grokPath(): Promise<string> {
  const info = await resolveToolConfigPath("grok-build");
  return info?.chosen ?? GROK_CONFIG_PATH;
}

/**
 * Cấu hình Grok CLI (xAI).
 *
 * Schema đã đối chiếu binary `@xai-official/grok@1.0.60` (grok-native):
 *
 * ```toml
 * [models]
 * default = "<model-id>"
 *
 * [model_providers.stali]
 * api_base_url = "https://api.stali.vn/v1"
 * api_key = "sk-stali-..."
 * api_backend = "chat_completions"   # "chat_completions" | "responses" | "messages"
 * ```
 *
 * Bằng chứng trong binary: bảng `[model_providers.<id>]` với các trường
 * `api_base_url`, `api_key`, `api_backend`, `env_key`, `extra_headers`;
 * `api_backend` nhận `chat_completions`/`responses`/`messages`; model mặc
 * định ở `[models].default` (cũng nhận qua `GROK_DEFAULT_MODEL`, `--model`).
 * Key cũng nhận qua `XAI_API_KEY`.
 *
 * Bản cũ ghi TOML phẳng `provider`/`base_url`/`api_key`/`model` — Grok CLI
 * không có các khoá đó nên cấu hình Stali bị bỏ qua.
 */
export async function patchGrokSettings(
  apiKey: string,
  model = "grok-4.6",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  const configPath = await grokPath();
  const modelId = model.trim() || "grok-4.6";

  try {
    const backupPath = await createTimestampBackup(configPath);

    const read = await readTomlFileDetailed<Record<string, any>>(configPath);
    if (read.corrupt) {
      return {
        toolId: "grok-build",
        toolName: "Grok Build",
        success: false,
        message: "config.toml hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath,
        backupPath: backupPath || undefined,
        error: `File ${configPath} không parse được. Sửa tay hoặc sao lưu rồi xoá, sau đó chạy lại.`,
      };
    }
    const data = read.data || {};

    if (!data.model_providers || typeof data.model_providers !== "object") {
      data.model_providers = {};
    }
    data.model_providers[GROK_PROVIDER_ID] = {
      ...(data.model_providers[GROK_PROVIDER_ID] || {}),
      api_base_url: urls.openAiBaseUrl,
      api_key: apiKey.trim(),
      api_backend: "chat_completions",
    };

    if (!data.models || typeof data.models !== "object") data.models = {};
    data.models.default = modelId;

    await writeTomlFile(configPath, data);

    return {
      toolId: "grok-build",
      toolName: "Grok Build",
      success: true,
      message: `Cấu hình Grok Build thành công! (${configPath})`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "grok-build",
      toolName: "Grok Build",
      success: false,
      message: "Lỗi cấu hình Grok Build",
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function resetGrokSettings(): Promise<SyncerResult> {
  try {
    const configPath = await grokPath();
    const backupPath = await createTimestampBackup(configPath);
    const read = await readTomlFileDetailed<Record<string, any>>(configPath);
    if (read.corrupt) {
      return {
        toolId: "grok-build",
        toolName: "Grok Build",
        success: false,
        message: "config.toml hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath,
        backupPath: backupPath || undefined,
        error: `File ${configPath} không parse được.`,
      };
    }
    const data = read.data || {};
    if (data.model_providers?.[GROK_PROVIDER_ID]) delete data.model_providers[GROK_PROVIDER_ID];
    if (data.models?.default) delete data.models.default;
    await writeTomlFile(configPath, data);
    return {
      toolId: "grok-build",
      toolName: "Grok Build",
      success: true,
      message: "Đã reset cấu hình Grok Build về mặc định!",
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "grok-build",
      toolName: "Grok Build",
      success: false,
      message: "Lỗi khi reset Grok Build",
      error: e?.message || String(e),
    };
  }
}
