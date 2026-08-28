import type { ToolDiscoveryEntry } from "./tool-discovery";

export interface GatewayPendingSummary {
  installed: number;
  configured: number;
  pending: number;
  pendingGateway: string[];
  pendingGatewayCount: number;
}

export function summarizeGatewayPending(
  entries: ToolDiscoveryEntry[]
): GatewayPendingSummary {
  const installedEntries = entries.filter((e) => e.installed);
  const configured = installedEntries.filter((e) => e.configuredForStali).length;
  const pendingGateway = installedEntries
    .filter((e) => !e.configuredForStali)
    .map((e) => e.toolId);
  return {
    installed: installedEntries.length,
    configured,
    pending: installedEntries.length - configured,
    pendingGateway,
    pendingGatewayCount: pendingGateway.length,
  };
}
