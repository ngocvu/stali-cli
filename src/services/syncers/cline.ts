import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchVsCodeAgentJsonTool, restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const CLINE_CONFIG_PATH = path.join(
  os.homedir(),
  ".vscode",
  "cline_settings.json"
);

export async function patchClineSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchVsCodeAgentJsonTool(
    "cline",
    "Cline (VS Code)",
    CLINE_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetClineSettings(): Promise<SyncerResult> {
  return restoreToolConfig(CLINE_CONFIG_PATH);
}
