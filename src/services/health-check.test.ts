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
      expect(r.scope).toBe("full");
      expect(Array.isArray(r.pendingGateway)).toBe(true);
      expect(r.pendingGatewayCount).toBe(r.pendingGateway.length);
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
      const r = await runHealthCheck({ strict: true });
      expect(r.strict).toBe(true);
      expect(r.pluginsTotal).toBe(0);
      expect(r.ok).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
    }
  });

  test("--tools-only → scope tools, không scan plugin", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-health-tools-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      await fs.mkdir(home, { recursive: true });
      const r = await runHealthCheck({ toolsOnly: true });
      expect(r.scope).toBe("tools");
      expect(r.doctorTotal).toBeGreaterThan(0);
      expect(r.pluginsTotal).toBe(0);
      expect(r.messages.some((m) => m.startsWith("Plugins:"))).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
    }
  });

  test("--plugins-only → scope plugins, không scan tools", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-health-plug-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      await fs.mkdir(home, { recursive: true });
      const r = await runHealthCheck({ pluginsOnly: true });
      expect(r.scope).toBe("plugins");
      expect(r.doctorTotal).toBe(0);
      expect(r.messages.some((m) => m.startsWith("Doctor:"))).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
    }
  });
});
