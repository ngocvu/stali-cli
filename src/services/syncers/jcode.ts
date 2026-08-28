import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchOpenAiTomlTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const JCODE_CONFIG_PATH = path.join(os.homedir(), ".jcode", "config.toml");

export async function patchJcodeSettings(
  apiKey: string,
  model = "claude-opus-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchOpenAiTomlTool(
    "jcode",
    "jcode",
    JCODE_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetJcodeSettings(): Promise<SyncerResult> {
  return restoreToolConfig(JCODE_CONFIG_PATH);
}
