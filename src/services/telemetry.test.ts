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

  test("queue failed POST and flush on next command (sync path)", async () => {
    const prevHome = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-tel-q-${Date.now()}`);
    process.env.STALI_HOME = home;
    const original = globalThis.fetch;
    let mode: "fail" | "ok" = "fail";
    globalThis.fetch = (async () => {
      if (mode === "fail") throw new Error("network");
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    try {
      const { setTelemetryEnabled, recordCliTelemetrySync, readTelemetryQueueDepth } =
        await import("./telemetry");
      await setTelemetryEnabled(true);
      await recordCliTelemetrySync("info");
      expect(await readTelemetryQueueDepth()).toBe(1);
      mode = "ok";
      await recordCliTelemetrySync("doctor");
      expect(await readTelemetryQueueDepth()).toBe(0);
    } finally {
      globalThis.fetch = original;
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
      if (prevHome === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prevHome;
    }
  });

  test("recordCliTelemetry KHÔNG chặn lệnh khi mạng treo", async () => {
    const prevHome = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-tel-nb-${Date.now()}`);
    process.env.STALI_HOME = home;
    const original = globalThis.fetch;
    // fetch treo vĩnh viễn — mô phỏng mạng chết / bị chặn
    globalThis.fetch = ((_url: any, init: any) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener?.("abort", () =>
          reject(new Error("aborted"))
        );
      })) as unknown as typeof fetch;
    try {
      const { setTelemetryEnabled, recordCliTelemetry, readTelemetryQueueDepth } =
        await import("./telemetry");
      await setTelemetryEnabled(true);

      const started = Date.now();
      recordCliTelemetry("info");
      const elapsed = Date.now() - started;

      // Trả về gần như tức thì — không chờ mạng.
      expect(elapsed).toBeLessThan(150);

      // Chờ ghi queue xong (ghi local, không cần mạng).
      for (let i = 0; i < 50 && (await readTelemetryQueueDepth()) === 0; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      expect(await readTelemetryQueueDepth()).toBe(1);
    } finally {
      globalThis.fetch = original;
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
      if (prevHome === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prevHome;
    }
  });
});
