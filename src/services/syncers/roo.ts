import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchVsCodeAgentJsonTool, restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

/** Đường dẫn cũ (SAI) — Roo là extension VS Code, không đọc ~/.vscode. */
export const ROO_CONFIG_PATH = path.join(
  os.homedir(),
  ".vscode",
  "roo_settings.json"
);

/** Chọn đúng thư mục globalStorage của IDE đã cài extension Roo. */
async function rooPath(): Promise<string> {
  const info = await resolveToolConfigPath("roo");
  return info?.chosen ?? ROO_CONFIG_PATH;
}

export async function patchRooSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchVsCodeAgentJsonTool(
    "roo",
    "Roo Code (VS Code)",
    await rooPath(),
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetRooSettings(): Promise<SyncerResult> {
  return restoreToolConfig(await rooPath());
}
