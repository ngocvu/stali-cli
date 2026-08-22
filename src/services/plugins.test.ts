import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { loadPlugins, writePluginsExample } from "../services/plugins";

describe("plugins", () => {
  test("loadPlugins empty when missing", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-plug-${Date.now()}`);
    try {
      expect(await loadPlugins()).toEqual([]);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("writePluginsExample creates file", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-plug-${Date.now()}-2`);
    process.env.STALI_HOME = home;
    try {
      const p = await writePluginsExample();
      expect(p).toContain("plugins.json");
      const plugins = await loadPlugins();
      expect(plugins.length).toBeGreaterThan(0);
      await fs.rm(home, { recursive: true, force: true });
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
