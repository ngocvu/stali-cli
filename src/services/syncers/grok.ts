import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchOpenAiTomlTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const GROK_CONFIG_PATH = path.join(os.homedir(), ".grok", "config.toml");

export async function patchGrokSettings(
  apiKey: string,
  model = "grok-4.6",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchOpenAiTomlTool(
    "grok-build",
    "Grok Build",
    GROK_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetGrokSettings(): Promise<SyncerResult> {
  return restoreToolConfig(GROK_CONFIG_PATH);
}
