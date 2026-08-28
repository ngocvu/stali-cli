import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchVsCodeAgentJsonTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const ROO_CONFIG_PATH = path.join(
  os.homedir(),
  ".vscode",
  "roo_settings.json"
);

export async function patchRooSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchVsCodeAgentJsonTool(
    "roo",
    "Roo Code (VS Code)",
    ROO_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetRooSettings(): Promise<SyncerResult> {
  return restoreToolConfig(ROO_CONFIG_PATH);
}
