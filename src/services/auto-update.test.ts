import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import { readAutoUpdateConfig, writeAutoUpdateConfig } from "./auto-update";

describe("auto-update config", () => {
  test("writeAutoUpdateConfig roundtrip", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-autoup-${Date.now()}`);
    try {
      await writeAutoUpdateConfig({ enabled: true, channel: "stable" });
      const cfg = await readAutoUpdateConfig();
      expect(cfg?.enabled).toBe(true);
      expect(cfg?.channel).toBe("stable");
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
