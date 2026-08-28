import { describe, expect, test } from "bun:test";
import { planGatewayInstall, resolveGatewayTargets, buildGatewayPlan } from "./gateway-install";
import type { ToolDiscoveryEntry } from "./tool-discovery";

function entry(
  toolId: string,
  installed: boolean,
  configured: boolean
): ToolDiscoveryEntry {
  return {
    toolId,
    toolName: toolId,
    installed,
    configuredForStali: configured,
    signals: installed ? { config: true } : {},
    configPath: `~/.${toolId}/config`,
  };
}

describe("gateway plan", () => {
  test("resolveGatewayTargets skips configured", () => {
    const discovery = [entry("claude", true, true), entry("codex", true, false)];
    const { targets, skipped } = resolveGatewayTargets(discovery, {});
    expect(targets).toEqual(["codex"]);
    expect(skipped.some((s) => s.toolId === "claude" && s.reason === "already_configured")).toBe(
      true
    );
  });

  test("resolveGatewayTargets --force includes configured", () => {
    const discovery = [entry("claude", true, true)];
    const { targets } = resolveGatewayTargets(discovery, { force: true });
    expect(targets).toEqual(["claude"]);
  });

  test("buildGatewayPlan from discovery", () => {
    const discovery = [entry("claude", true, true), entry("codex", true, false)];
    const plan = buildGatewayPlan(discovery, {});
    expect(plan.targets).toEqual(["codex"]);
    expect(plan.summary.installed).toBe(2);
    expect(plan.summary.configured).toBe(1);
  });

  test("planGatewayInstall returns summary", async () => {
    const plan = await planGatewayInstall();
    expect(plan.summary.totalTools).toBe(13);
    expect(Array.isArray(plan.targets)).toBe(true);
    expect(Array.isArray(plan.tools)).toBe(true);
  });
});
