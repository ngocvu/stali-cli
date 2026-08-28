import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { runPluginsDoctor } from "./plugin-doctor";

describe("plugin-doctor", () => {
  test("empty plugins.json → pluginCount 0", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-pdoc-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      const report = await runPluginsDoctor();
      expect(report.meta.pluginCount).toBe(0);
      expect(report.plugins).toHaveLength(0);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
    }
  });
});
