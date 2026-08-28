import type { ConfigureBatchItem } from "./configure-batch";
import type { SyncerResult } from "../types";

export function mapGatewayItemsToSyncerResults(items: ConfigureBatchItem[]): SyncerResult[] {
  return items.map((item) => ({
    toolId: item.toolId || "gateway",
    toolName: item.toolName || "gateway",
    success: item.success,
    message: item.message,
    configPath: item.configPath,
    error: item.error,
  }));
}
