import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchVsCodeAgentJsonTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const KILO_CONFIG_PATH = path.join(os.homedir(), ".kilo", "config.json");

export async function patchKiloSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchVsCodeAgentJsonTool(
    "kilo",
    "Kilo Code",
    KILO_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetKiloSettings(): Promise<SyncerResult> {
  return restoreToolConfig(KILO_CONFIG_PATH);
}
