import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { runHealthCheck } from "../services/health-check";

describe("runHealthCheck", () => {
  test("không có key → authOk false", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = `/tmp/stali-health-${Date.now()}`;
    try {
      const r = await runHealthCheck(false);
      expect(r.authOk).toBe(false);
      expect(r.ok).toBe(false);
      expect(r.pluginsTotal).toBe(0);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("strict + không plugin → chỉ kiểm tra tools", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-health-strict-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      await fs.mkdir(home, { recursive: true });
      const r = await runHealthCheck(true);
      expect(r.strict).toBe(true);
      expect(r.pluginsTotal).toBe(0);
      expect(r.ok).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
    }
  });
});
