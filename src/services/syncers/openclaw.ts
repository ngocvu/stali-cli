import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchAnthropicEnvJsonTool, restoreToolConfig } from "./common";
import { detectAnthropicEnvJsonStatus } from "./status";

export const OPENCLAW_CONFIG_PATH = path.join(os.homedir(), ".openclaw", "config.json");

export async function patchOpenClawSettings(
  apiKey: string,
  model = "claude-fable-5"
): Promise<SyncerResult> {
  return patchAnthropicEnvJsonTool(
    "openclaw",
    "OpenClaw",
    OPENCLAW_CONFIG_PATH,
    apiKey,
    model
  );
}

export async function resetOpenClawSettings(): Promise<SyncerResult> {
  return restoreToolConfig(OPENCLAW_CONFIG_PATH);
}

export async function getOpenClawStatus() {
  return detectAnthropicEnvJsonStatus(OPENCLAW_CONFIG_PATH);
}
