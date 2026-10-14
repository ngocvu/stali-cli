import path from "path";
import os from "os";
import { SyncerResult } from "../../types";
import { patchOpenAiProviderJsonTool, restoreToolConfig } from "./common";
import { resolveToolConfigPath } from "./paths";
import type { SyncOptions } from "./sync-options";
import { resolveSyncUrls } from "./sync-options";

/** Đường dẫn cũ (SAI) — OpenCode dùng XDG, không dùng ~/.opencode. */
export const OPENCODE_CONFIG_PATH = path.join(os.homedir(), ".opencode", "config.json");

/**
 * OpenCode đọc cấu hình theo XDG: `$XDG_CONFIG_HOME/opencode/config.json`
 * (mặc định `~/.config/opencode/config.json`). Đã kiểm chứng: chạy
 * `opencode --version` với HOME giả thì tool tự tạo `~/.config/opencode`.
 */
async function opencodePath(): Promise<string> {
  const info = await resolveToolConfigPath("opencode");
  return info?.chosen ?? OPENCODE_CONFIG_PATH;
}

export async function patchOpenCodeSettings(
  apiKey: string,
  model = "gpt-5.6-sol",
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  return patchOpenAiProviderJsonTool(
    "opencode",
    "OpenCode",
    await opencodePath(),
    apiKey,
    model,
    undefined,
    resolveSyncUrls(syncOptions)
  );
}

export async function resetOpenCodeSettings(): Promise<SyncerResult> {
  return restoreToolConfig(await opencodePath());
}
