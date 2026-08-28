import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchAnthropicEnvJsonTool, restoreToolConfig } from "./common";
import { detectAnthropicEnvJsonStatus } from "./status";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

export const OPENCLAW_CONFIG_PATH = path.join(os.homedir(), ".openclaw", "config.json");

export async function patchOpenClawSettings(
  apiKey: string,
  model = "claude-fable-5",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchAnthropicEnvJsonTool(
    "openclaw",
    "OpenClaw",
    OPENCLAW_CONFIG_PATH,
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetOpenClawSettings(): Promise<SyncerResult> {
  return restoreToolConfig(OPENCLAW_CONFIG_PATH);
}

export async function getOpenClawStatus() {
  return detectAnthropicEnvJsonStatus(OPENCLAW_CONFIG_PATH);
}
