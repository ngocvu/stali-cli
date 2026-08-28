import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchOpenAiProviderJsonTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const OPENCODE_CONFIG_PATH = path.join(os.homedir(), ".opencode", "config.json");

export async function patchOpenCodeSettings(
  apiKey: string,
  model = "gpt-5.6-sol",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchOpenAiProviderJsonTool(
    "opencode",
    "OpenCode",
    OPENCODE_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetOpenCodeSettings(): Promise<SyncerResult> {
  return restoreToolConfig(OPENCODE_CONFIG_PATH);
}
