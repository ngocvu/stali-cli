import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import { gatherCliInfo } from "./cli-info";

describe("status-cli gateway fields", () => {
  test("gatherCliInfo gateway có pendingGateway", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-status-gw-${Date.now()}`);
    try {
      const info = await gatherCliInfo({ offline: true, skipPluginScan: true });
      expect(Array.isArray(info.gateway.pendingGateway)).toBe(true);
      expect(info.gateway.pendingGatewayCount).toBe(info.gateway.pendingGateway.length);
      expect(info.gateway.pendingGatewayCount).toBe(info.gateway.pending);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
