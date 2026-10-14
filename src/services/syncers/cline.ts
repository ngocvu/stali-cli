import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchVsCodeAgentJsonTool, restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

/** Đường dẫn cũ (SAI) — Cline là extension VS Code, không đọc ~/.vscode. */
export const CLINE_CONFIG_PATH = path.join(os.homedir(), ".vscode", "cline_settings.json");

/**
 * Cline là extension VS Code: dữ liệu nằm trong
 * `<IDE>/User/globalStorage/saoudrizwan.claude-dev/cline_settings.json`.
 * `resolveToolConfigPath` tự chọn IDE đã cài (VS Code / Cursor / Windsurf…).
 */
async function clinePath(): Promise<string> {
  const info = await resolveToolConfigPath("cline");
  return info?.chosen ?? CLINE_CONFIG_PATH;
}

export async function patchClineSettings(
  apiKey: string,
  model = "",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  const configPath = await clinePath();
  return patchVsCodeAgentJsonTool(
    "cline",
    "Cline (VS Code)",
    configPath,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetClineSettings(): Promise<SyncerResult> {
  return restoreToolConfig(await clinePath());
}
