import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchOpenAiTomlTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const DEEPSEEK_CONFIG_PATH = path.join(os.homedir(), ".deepseek", "config.toml");

export async function patchDeepSeekSettings(
  apiKey: string,
  model = "deepseek-v4-flash",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchOpenAiTomlTool(
    "deepseek-tui",
    "DeepSeek TUI",
    DEEPSEEK_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetDeepSeekSettings(): Promise<SyncerResult> {
  return restoreToolConfig(DEEPSEEK_CONFIG_PATH);
}
