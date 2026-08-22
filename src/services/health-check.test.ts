import { describe, expect, test } from "bun:test";
import { runHealthCheck } from "../services/health-check";

describe("runHealthCheck", () => {
  test("không có key → authOk false", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = `/tmp/stali-health-${Date.now()}`;
    try {
      const r = await runHealthCheck(false);
      expect(r.authOk).toBe(false);
      expect(r.ok).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
