import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { STALI_OPENAI_BASE_URL } from "../../constants/api";
import { readTomlFile, writeTomlFile } from "../../utils/file";
import { createTimestampBackup } from "../../utils/backup";
import { restoreToolConfig } from "./common";

export const DEEPSEEK_CONFIG_PATH = path.join(os.homedir(), ".deepseek", "config.toml");

export async function patchDeepSeekSettings(
  apiKey: string,
  model = "deepseek-v4-flash"
): Promise<SyncerResult> {
  const configPath = DEEPSEEK_CONFIG_PATH;
  try {
    const backupPath = await createTimestampBackup(configPath);
    const data = (await readTomlFile(configPath)) || {};
    data.provider = "openai";
    data.base_url = STALI_OPENAI_BASE_URL;
    data.api_key = apiKey.trim();
    data.model = model;
    await writeTomlFile(configPath, data);
    return {
      toolId: "deepseek-tui",
      toolName: "DeepSeek TUI",
      success: true,
      message: "Cấu hình DeepSeek TUI thành công!",
      configPath,
      backupPath: backupPath || undefined,
    };
  } catch (e: any) {
    return {
      toolId: "deepseek-tui",
      toolName: "DeepSeek TUI",
      success: false,
      message: "Lỗi cấu hình DeepSeek TUI",
      error: e?.message || String(e),
    };
  }
}

export async function resetDeepSeekSettings(): Promise<SyncerResult> {
  return restoreToolConfig(DEEPSEEK_CONFIG_PATH);
}
