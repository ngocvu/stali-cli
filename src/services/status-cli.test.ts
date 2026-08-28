import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import { gatherCliInfo } from "./cli-info";
import { formatUserStatusJson } from "./status-json";

describe("status-cli gateway fields", () => {
  test("gatherCliInfo gateway có pendingGateway", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-status-gw-${Date.now()}`);
    try {
      const info = await gatherCliInfo({ offline: true, skipPluginScan: true });
      expect(Array.isArray(info.gateway.pendingGateway)).toBe(true);
      expect(info.gateway.pendingGatewayCount).toBe(info.gateway.pendingGateway.length);
      expect(info.gateway.pendingGatewayCount).toBe(info.gateway.pending);
      expect(info.pendingGateway).toEqual(info.gateway.pendingGateway);
      expect(info.schemaVersion).toBe(2);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("formatUserStatusJson status vs ready", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-status-json-${Date.now()}`);
    try {
      const info = await gatherCliInfo({ offline: true, skipPluginScan: true });
      const status = formatUserStatusJson(info, "status");
      const ready = formatUserStatusJson(info, "ready");
      expect(status.command).toBe("status");
      expect(ready.command).toBe("ready");
      expect(status.schemaVersion).toBe(2);
      expect(Array.isArray(status.pendingGateway)).toBe(true);
      expect(status.pendingGatewayCount).toBe(info.pendingGatewayCount);
      expect((status.gateway as { tools: unknown[] }).tools).toEqual(info.gateway.tools);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
