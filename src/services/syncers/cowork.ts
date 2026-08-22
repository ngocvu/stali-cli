import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchCoworkJsonTool, restoreToolConfig } from "./common";

export const COWORK_CONFIG_PATH = path.join(os.homedir(), ".cowork", "settings.json");

export async function patchCoworkSettings(
  apiKey: string,
  model = "gpt-5.6-sol"
): Promise<SyncerResult> {
  return patchCoworkJsonTool(
    "cowork",
    "Cowork",
    COWORK_CONFIG_PATH,
    apiKey,
    model
  );
}

export async function resetCoworkSettings(): Promise<SyncerResult> {
  return restoreToolConfig(COWORK_CONFIG_PATH);
}
