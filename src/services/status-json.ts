import type { CliInfoSnapshot } from "./cli-info";

export type StatusCommand = "status" | "ready";

/** JSON thống nhất cho `stali status --json` và `stali ready --json`. */
export function formatUserStatusJson(
  info: CliInfoSnapshot,
  command: StatusCommand = "status"
): Record<string, unknown> {
  return {
    command,
    schemaVersion: 2,
    ok: info.setup?.ready ?? false,
    pendingGateway: info.gateway.pendingGateway,
    pendingGatewayCount: info.gateway.pendingGatewayCount,
    setup: info.setup,
    auth: info.auth,
    gateway: {
      installed: info.gateway.installed,
      configured: info.gateway.configured,
      pending: info.gateway.pending,
      pendingGateway: info.gateway.pendingGateway,
      pendingGatewayCount: info.gateway.pendingGatewayCount,
      tools: info.gateway.tools,
    },
    version: info.version,
  };
}
