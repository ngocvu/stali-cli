import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import { runInit } from "../services/init-cli";

describe("init-cli", () => {
  test("auth fail → dừng sớm, không chạy configure-all", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-init-${Date.now()}`);
    process.env.STALI_HOME = home;
    const fakeKey = "sk-stali-" + "x".repeat(40);
    try {
      const result = await runInit({ apiKey: fakeKey, skipConfigure: true });
      expect(result.success).toBe(false);
      expect(result.steps.some((s) => s.name === "auth login" && !s.ok)).toBe(true);
      expect(result.steps.some((s) => s.name === "configure-all")).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
