import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchDroidJsonTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const DROID_CONFIG_PATH = path.join(os.homedir(), ".droid", "config.json");

export async function patchDroidSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchDroidJsonTool(
    "droid",
    "Droid CLI",
    DROID_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetDroidSettings(): Promise<SyncerResult> {
  return restoreToolConfig(DROID_CONFIG_PATH);
}
