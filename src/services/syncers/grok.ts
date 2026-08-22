import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchOpenAiTomlTool, restoreToolConfig } from "./common";

export const GROK_CONFIG_PATH = path.join(os.homedir(), ".grok", "config.toml");

export async function patchGrokSettings(
  apiKey: string,
  model = "grok-4.6"
): Promise<SyncerResult> {
  return patchOpenAiTomlTool(
    "grok-build",
    "Grok Build",
    GROK_CONFIG_PATH,
    apiKey,
    model
  );
}

export async function resetGrokSettings(): Promise<SyncerResult> {
  return restoreToolConfig(GROK_CONFIG_PATH);
}
