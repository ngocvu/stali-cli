import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import {
  readAutoUpdateConfig,
  writeAutoUpdateConfig,
  getTaskSchedulerStatus,
  resolveStaliExecutableForScheduler,
  WINDOWS_TASK_NAME,
} from "./auto-update";

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

  test("getTaskSchedulerStatus on non-Windows", () => {
    if (process.platform === "win32") return;
    const s = getTaskSchedulerStatus();
    expect(s.installed).toBe(false);
    expect(s.taskName).toBe(WINDOWS_TASK_NAME);
  });

  test("resolveStaliExecutableForScheduler returns path", () => {
    const p = resolveStaliExecutableForScheduler();
    expect(p.length).toBeGreaterThan(0);
  });
});
