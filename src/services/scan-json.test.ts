import { describe, expect, test } from "bun:test";
import { formatGatewayScanJson, formatGatewayPlanJson } from "./scan-json";
import type { ToolDiscoveryEntry } from "./tool-discovery";

function entry(toolId: string, installed: boolean, configured: boolean): ToolDiscoveryEntry {
  return {
    toolId,
    toolName: toolId,
    installed,
    configuredForStali: configured,
    signals: installed ? { config: true } : {},
    configPath: `~/.${toolId}/config`,
  };
}

describe("formatGatewayScanJson", () => {
  test("schema v2 scan", () => {
    const tools = [entry("claude", true, false), entry("codex", false, false)];
    const json = formatGatewayScanJson(tools, "scan");
    expect(json.command).toBe("scan");
    expect(json.schemaVersion).toBe(2);
    expect(json.pendingGateway).toEqual(["claude"]);
    expect(json.pendingGatewayCount).toBe(1);
    expect((json.summary as { installed: number }).installed).toBe(1);
  });

  test("gateway-scan command", () => {
    const json = formatGatewayScanJson([], "gateway-scan");
    expect(json.command).toBe("gateway-scan");
  });
});

describe("formatGatewayPlanJson", () => {
  test("includes pendingGateway", () => {
    const tools = [entry("codex", true, false)];
    const json = formatGatewayPlanJson({
      summary: { totalTools: 13, installed: 1, configured: 0, pending: 1 },
      targets: ["codex"],
      skipped: [],
      tools,
    });
    expect(json.schemaVersion).toBe(2);
    expect(json.command).toBe("gateway-plan");
    expect(json.pendingGateway).toEqual(["codex"]);
  });
});
