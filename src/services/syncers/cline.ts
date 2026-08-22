import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchVsCodeAgentJsonTool, restoreToolConfig } from "./common";

export const CLINE_CONFIG_PATH = path.join(
  os.homedir(),
  ".vscode",
  "cline_settings.json"
);

export async function patchClineSettings(
  apiKey: string,
  model = "claude-fable-5"
): Promise<SyncerResult> {
  return patchVsCodeAgentJsonTool(
    "cline",
    "Cline (VS Code)",
    CLINE_CONFIG_PATH,
    apiKey,
    model
  );
}

export async function resetClineSettings(): Promise<SyncerResult> {
  return restoreToolConfig(CLINE_CONFIG_PATH);
}
