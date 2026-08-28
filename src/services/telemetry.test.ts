import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  readTelemetryConfig,
  setTelemetryEnabled,
  writeTelemetryConfig,
} from "./telemetry";

describe("telemetry", () => {
  test("default disabled", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-tel-${Date.now()}`);
    try {
      const cfg = await readTelemetryConfig();
      expect(cfg.enabled).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("setTelemetryEnabled roundtrip", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-tel-${Date.now()}-2`);
    process.env.STALI_HOME = home;
    try {
      const on = await setTelemetryEnabled(true);
      expect(on.enabled).toBe(true);
      expect(on.consentAt).toBeTruthy();
      const read = await readTelemetryConfig();
      expect(read.enabled).toBe(true);
      await setTelemetryEnabled(false);
      expect((await readTelemetryConfig()).enabled).toBe(false);
    } finally {
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("writeTelemetryConfig persists", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-tel-${Date.now()}-3`);
    process.env.STALI_HOME = home;
    try {
      const p = await writeTelemetryConfig({ enabled: true, consentAt: "2026-01-01" });
      expect(p).toContain("telemetry.json");
      const raw = await fs.readFile(p, "utf8");
      expect(raw).toContain('"enabled": true');
    } finally {
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
