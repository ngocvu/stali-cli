import { describe, expect, test } from "bun:test";
import { formatUserStatusJson } from "./status-json";
import type { CliInfoSnapshot } from "./cli-info";

describe("formatUserStatusJson", () => {
  test("schema v2 fields", () => {
    const info = {
      version: "3.41.0",
      gateway: {
        installed: 1,
        configured: 0,
        pending: 1,
        pendingGateway: ["claude"],
        pendingGatewayCount: 1,
        tools: [{ id: "claude", name: "Claude", signals: "binary", configured: false }],
      },
      pendingGateway: ["claude"],
      pendingGatewayCount: 1,
      schemaVersion: 2 as const,
      setup: { ready: false, authOk: true, gatewayPending: 1, nextCommand: "stali gw" },
      auth: { hasKey: true, valid: true, masked: "sk-stali-…" },
    } satisfies Partial<CliInfoSnapshot> as CliInfoSnapshot;

    const json = formatUserStatusJson(info, "ready");
    expect(json.command).toBe("ready");
    expect(json.pendingGateway).toEqual(["claude"]);
    expect(json.pendingGatewayCount).toBe(1);
    expect(json.ok).toBe(false);
  });
});
