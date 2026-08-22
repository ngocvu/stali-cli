import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchDroidJsonTool, restoreToolConfig } from "./common";

export const DROID_CONFIG_PATH = path.join(os.homedir(), ".droid", "config.json");

export async function patchDroidSettings(
  apiKey: string,
  model = "claude-fable-5"
): Promise<SyncerResult> {
  return patchDroidJsonTool(
    "droid",
    "Droid CLI",
    DROID_CONFIG_PATH,
    apiKey,
    model
  );
}

export async function resetDroidSettings(): Promise<SyncerResult> {
  return restoreToolConfig(DROID_CONFIG_PATH);
}
