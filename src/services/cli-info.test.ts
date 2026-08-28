import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import { gatherCliInfo } from "./cli-info";

describe("cli-info", () => {
  test("gatherCliInfo includes installMode", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-info-${Date.now()}`);
    try {
      const info = await gatherCliInfo({ offline: true });
      expect(info.installMode).toBeDefined();
      expect(["standalone", "git", "source", "npm-global", "unknown"]).toContain(info.installMode);
      expect(info.version).toMatch(/^\d+\.\d+\.\d+/);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("gatherCliInfo offline fast", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-info-fast-${Date.now()}`);
    const t0 = performance.now();
    try {
      const info = await gatherCliInfo({ offline: true });
      const ms = performance.now() - t0;
      expect(info.installMode).toBeDefined();
      expect(info.gateway).toBeDefined();
      expect(info.telemetry).toBeDefined();
      expect(typeof info.telemetry?.enabled).toBe("boolean");
      expect(ms).toBeLessThan(500);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
