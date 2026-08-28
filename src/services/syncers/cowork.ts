import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchCoworkJsonTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const COWORK_CONFIG_PATH = path.join(os.homedir(), ".cowork", "settings.json");

export async function patchCoworkSettings(
  apiKey: string,
  model = "gpt-5.6-sol",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchCoworkJsonTool(
    "cowork",
    "Cowork",
    COWORK_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetCoworkSettings(): Promise<SyncerResult> {
  return restoreToolConfig(COWORK_CONFIG_PATH);
}
