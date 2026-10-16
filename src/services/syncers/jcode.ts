import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { readTomlFileDetailed, writeTomlFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { STALI_PROVIDER_ID } from "../../constants/tool-providers";
import { restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import { isStaliLikeUrl } from "../../utils/stali-urls";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const JCODE_CONFIG_PATH = path.join(os.homedir(), ".jcode", "config.toml");

/** Provider id dùng trong `[providers.<id>]`. */
export const JCODE_PROVIDER_ID = STALI_PROVIDER_ID;

async function jcodePath(): Promise<string> {
  const info = await resolveToolConfigPath("jcode");
  return info?.chosen ?? JCODE_CONFIG_PATH;
}

/**
 * Cấu hình jcode (agent Rust của @1jehuang/jcode).
 *
 * Schema đã đối chiếu binary `@1jehuang/jcode-darwin-arm64@1.2.0`:
 *
 * ```toml
 * [provider]
 * default_provider = "stali"
 * default_model = "<model-id>"
 *
 * [providers.stali]
 * type = "openai-compatible"
 * base_url = "https://api.stali.vn/v1"
 * api_key = "sk-stali-..."
 *
 * [[providers.stali.models]]
 * id = "<model-id>"
 * ```
 *
 * Bằng chứng trong binary: `[provider]` có `default_provider`/`default_model`;
 * `[providers.<name>]` có `type` (`openai-compatible` | `anthropic-compatible`),
 * `base_url`, `api_key`, `api_key_env`, `env_file`; danh sách model ở
 * `[[providers.<name>.models]]` với trường `id`/`context_window`.
 *
 * Bản cũ ghi TOML phẳng `provider`/`base_url`/`api_key`/`model` — jcode không
 * có các khoá đó nên cấu hình Stali bị bỏ qua.
 */
export async function patchJcodeSettings(
  apiKey: string,
  model = "claude-opus-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  const configPath = await jcodePath();
  const modelId = model.trim() || "claude-opus-5";

  try {
    const backupPath = await createTimestampBackup(configPath);

    const read = await readTomlFileDetailed<Record<string, any>>(configPath);
    if (read.corrupt) {
      return {
        toolId: "jcode",
        toolName: "jcode",
        success: false,
        message: "config.toml hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath,
        backupPath: backupPath || undefined,
        error: `File ${configPath} không parse được. Sửa tay hoặc sao lưu rồi xoá, sau đó chạy lại.`,
      };
    }
    const data = read.data || {};

    if (!data.provider || typeof data.provider !== "object") data.provider = {};
    data.provider.default_provider = JCODE_PROVIDER_ID;
    data.provider.default_model = modelId;

    if (!data.providers || typeof data.providers !== "object") data.providers = {};
    const priorModels = Array.isArray(data.providers[JCODE_PROVIDER_ID]?.models)
      ? data.providers[JCODE_PROVIDER_ID].models
      : [];
    const kept = priorModels.filter((m: any) => m && m.id !== modelId);
    data.providers[JCODE_PROVIDER_ID] = {
      ...(data.providers[JCODE_PROVIDER_ID] || {}),
      type: "openai-compatible",
      base_url: urls.openAiBaseUrl,
      api_key: apiKey.trim(),
      models: [{ id: modelId }, ...kept],
    };

    await writeTomlFile(configPath, data);

    return {
      toolId: "jcode",
      toolName: "jcode",
      success: true,
      message: `Cấu hình jcode thành công! (${configPath})`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "jcode",
      toolName: "jcode",
      success: false,
      message: "Lỗi cấu hình jcode",
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function resetJcodeSettings(): Promise<SyncerResult> {
  try {
    const configPath = await jcodePath();
    const backupPath = await createTimestampBackup(configPath);
    const read = await readTomlFileDetailed<Record<string, any>>(configPath);
    if (read.corrupt) {
      return {
        toolId: "jcode",
        toolName: "jcode",
        success: false,
        message: "config.toml hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath,
        backupPath: backupPath || undefined,
        error: `File ${configPath} không parse được.`,
      };
    }
    const data = read.data || {};
    if (data.providers?.[JCODE_PROVIDER_ID]) delete data.providers[JCODE_PROVIDER_ID];
    if (data.provider?.default_provider === JCODE_PROVIDER_ID) delete data.provider.default_provider;
    if (data.provider?.default_model) delete data.provider.default_model;
    await writeTomlFile(configPath, data);
    return {
      toolId: "jcode",
      toolName: "jcode",
      success: true,
      message: "Đã reset cấu hình jcode về mặc định!",
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "jcode",
      toolName: "jcode",
      success: false,
      message: "Lỗi khi reset jcode",
      error: e?.message || String(e),
    };
  }
}
