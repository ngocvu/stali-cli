import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { runPluginsDoctorFix } from "./plugin-doctor-fix";

describe("runPluginsDoctorFix", () => {
  test("không có plugins.json → fail", async () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = path.join(os.tmpdir(), `stali-plug-fix-${Date.now()}`);
    try {
      const r = await runPluginsDoctorFix({
        apiKey: "sk-stali-abcdefghijklmnopqrstuvwxyz",
        dryRun: true,
      });
      expect(r.allOk).toBe(false);
      expect(r.items[0]?.error).toBe("NO_PLUGINS");
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("dry-run với plugin mẫu", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-plug-fix2-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      await fs.mkdir(home, { recursive: true });
      await fs.writeFile(
        path.join(home, "plugins.json"),
        JSON.stringify({
          customTools: [
            {
              id: "demo",
              name: "Demo",
              protocol: "openai",
              configFile: ".demo/config.json",
            },
          ],
        }),
        "utf8"
      );
      const r = await runPluginsDoctorFix({
        apiKey: "sk-stali-abcdefghijklmnopqrstuvwxyz",
        dryRun: true,
      });
      expect(r.items.length).toBeGreaterThan(0);
      expect(r.items[0]?.pluginId).toBe("demo");
      expect(r.allOk).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
    }
  });
});
