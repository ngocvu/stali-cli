import path from "path";
import os from "os";
import fs from "fs/promises";
import { SyncerResult } from "../../types";
import { restoreToolConfig } from "./common";
import { patchJsoncFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { resolveToolConfigPath } from "./paths";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

/** Đường dẫn cũ (giữ để tương thích) — DeepSeek CLI thật KHÔNG dùng đường dẫn này. */
export const DEEPSEEK_CONFIG_PATH = path.join(os.homedir(), ".deepseek", "config.toml");

/**
 * DeepSeek CLI dùng JSON trong `~/.config/deepseek-cli-nodejs/config.json`
 * (đã kiểm chứng: chạy `deepseek --version` với HOME giả thì tool tự tạo đúng
 * file này). Bản cũ ghi TOML vào `~/.deepseek/config.toml` — tool không đọc.
 */
async function deepseekPath(): Promise<string> {
  const info = await resolveToolConfigPath("deepseek-tui");
  return info?.chosen ?? DEEPSEEK_CONFIG_PATH;
}

export async function patchDeepSeekSettings(
  apiKey: string,
  model = "deepseek-v4-flash",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const urls = resolveSyncUrls(syncOptions);
  const configPath = await deepseekPath();

  try {
    const backupPath = await createTimestampBackup(configPath);

    // File cấu hình thật là JSON (không phải TOML). Vá tại chỗ để giữ
    // mọi khoá khác mà DeepSeek CLI đã ghi.
    const ok = await patchJsoncFile(configPath, {
      set: [
        { path: ["provider"], value: "openai" },
        { path: ["base_url"], value: urls.openAiBaseUrl },
        { path: ["baseUrl"], value: urls.openAiBaseUrl },
        { path: ["api_key"], value: apiKey.trim() },
        { path: ["apiKey"], value: apiKey.trim() },
        { path: ["model"], value: model },
      ],
    });
    if (!ok) {
      return {
        toolId: "deepseek-tui",
        toolName: "DeepSeek TUI",
        success: false,
        message: "config.json hỏng định dạng — KHÔNG ghi đè để tránh mất cấu hình",
        configPath,
        backupPath: backupPath || undefined,
        error: `File ${configPath} không parse được.`,
      };
    }

    return {
      toolId: "deepseek-tui",
      toolName: "DeepSeek TUI",
      success: true,
      message: `Cấu hình DeepSeek TUI thành công! (${configPath})`,
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "deepseek-tui",
      toolName: "DeepSeek TUI",
      success: false,
      message: "Lỗi cấu hình DeepSeek TUI",
      configPath,
      error: e?.message || String(e),
    };
  }
}

export async function resetDeepSeekSettings(): Promise<SyncerResult> {
  return restoreToolConfig(await deepseekPath());
}

/** Có tồn tại thư mục cấu hình DeepSeek CLI thật không. */
export async function deepseekConfigExists(): Promise<boolean> {
  try {
    await fs.access(await deepseekPath());
    return true;
  } catch {
    return false;
  }
}
