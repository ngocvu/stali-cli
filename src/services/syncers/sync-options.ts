import type { StaliResolvedUrls } from "../../utils/stali-urls";
import { resolveStaliUrls } from "../../utils/stali-urls";

export interface SyncOptions {
  baseUrl?: string;
}

export function resolveSyncUrls(options?: SyncOptions): StaliResolvedUrls {
  return resolveStaliUrls(options?.baseUrl);
}
