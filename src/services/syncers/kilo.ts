import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchVsCodeAgentJsonTool, restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const KILO_CONFIG_PATH = path.join(os.homedir(), ".kilo", "config.json");

/** Kilo Code là extension VS Code — ưu tiên thư mục globalStorage nếu có. */
async function kiloPath(): Promise<string> {
  const info = await resolveToolConfigPath("kilo");
  return info?.chosen ?? KILO_CONFIG_PATH;
}

export async function patchKiloSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchVsCodeAgentJsonTool(
    "kilo",
    "Kilo Code",
    await kiloPath(),
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetKiloSettings(): Promise<SyncerResult> {
  return restoreToolConfig(await kiloPath());
}
