import { SUPPORTED_TOOLS } from "../constants/tools";
import { summarizeGatewayPending } from "./gateway-summary";
import type { ToolDiscoveryEntry } from "./tool-discovery";

export type ScanCommand = "scan" | "gateway-scan";

export interface GatewayPlanJsonInput {
  summary: {
    totalTools: number;
    installed: number;
    configured: number;
    pending: number;
  };
  targets: string[];
  skipped: Array<{ toolId: string; toolName: string; reason: string }>;
  tools: ToolDiscoveryEntry[];
}

/** JSON thống nhất cho `stali scan --json` và `stali gateway scan --json`. */
export function formatGatewayScanJson(
  tools: ToolDiscoveryEntry[],
  command: ScanCommand = "scan"
): Record<string, unknown> {
  const summary = summarizeGatewayPending(tools);
  return {
    command,
    schemaVersion: 2,
    summary: {
      totalTools: SUPPORTED_TOOLS.length,
      installed: summary.installed,
      configured: summary.configured,
      pending: summary.pending,
    },
    pendingGateway: summary.pendingGateway,
    pendingGatewayCount: summary.pendingGatewayCount,
    tools,
  };
}

/** JSON v2 cho `stali gateway plan --json`. */
export function formatGatewayPlanJson(plan: GatewayPlanJsonInput): Record<string, unknown> {
  const pending = summarizeGatewayPending(plan.tools);
  return {
    command: "gateway-plan",
    schemaVersion: 2,
    pendingGateway: pending.pendingGateway,
    pendingGatewayCount: pending.pendingGatewayCount,
    summary: plan.summary,
    targets: plan.targets,
    skipped: plan.skipped,
    tools: plan.tools,
  };
}
