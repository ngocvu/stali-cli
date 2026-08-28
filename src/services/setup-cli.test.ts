import { describe, expect, test } from "bun:test";
import { formatSetupJson } from "./setup-cli";
import type { InitResult } from "./init-cli";

describe("formatSetupJson", () => {
  test("includes gateway và pendingGatewayCount", () => {
    const result: InitResult = {
      success: true,
      durationMs: 120,
      steps: [{ name: "auth login", ok: true }],
      gateway: {
        installed: 2,
        configured: 1,
        pending: 1,
        pendingGateway: ["claude"],
        pendingGatewayCount: 1,
      },
    };
    const json = formatSetupJson(result);
    expect(json.pendingGatewayCount).toBe(1);
    expect(json.schemaVersion).toBe(2);
    expect(json.command).toBe("setup");
    expect(json.pendingGateway).toEqual(["claude"]);
    expect((json.gateway as { pendingGateway: string[] }).pendingGateway).toEqual(["claude"]);
  });
});
