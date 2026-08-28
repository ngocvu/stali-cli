import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type { PluginEntry } from "./plugins";
import { detectPatchStyleFromFile, suggestPluginPatchStyles } from "./plugin-suggest";

describe("plugin-suggest", () => {
  test("detectPatchStyleFromFile anthropic-env từ json.env", async () => {
    const dir = path.join(os.tmpdir(), `stali-suggest-${Date.now()}`);
    const configPath = path.join(dir, "settings.json");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify({ env: { ANTHROPIC_BASE_URL: "https://example.com" } })
    );
    const entry: Pick<PluginEntry, "protocol" | "configFile"> = {
      protocol: "openai",
      configFile: configPath,
    };
    const { style, reason } = await detectPatchStyleFromFile(configPath, entry);
    expect(style).toBe("anthropic-env");
    expect(reason).toContain("ANTHROPIC");
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("detectPatchStyleFromFile cowork từ openai.baseUrl", async () => {
    const dir = path.join(os.tmpdir(), `stali-suggest-cw-${Date.now()}`);
    const configPath = path.join(dir, "settings.json");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify({ openai: { baseUrl: "https://api.openai.com/v1" } })
    );
    const entry: Pick<PluginEntry, "protocol" | "configFile"> = {
      protocol: "openai",
      configFile: configPath,
    };
    const { style } = await detectPatchStyleFromFile(configPath, entry);
    expect(style).toBe("cowork");
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("detectPatchStyleFromFile suy protocol khi file chưa có", async () => {
    const configPath = path.join(os.tmpdir(), `stali-missing-${Date.now()}.json`);
    const entry: Pick<PluginEntry, "protocol" | "configFile"> = {
      protocol: "anthropic",
      configFile: configPath,
    };
    const { style } = await detectPatchStyleFromFile(configPath, entry);
    expect(style).toBe("anthropic-env");
  });

  test("suggestPluginPatchStyles từ plugins.json", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-suggest-home-${Date.now()}`);
    process.env.STALI_HOME = home;
    await fs.mkdir(home, { recursive: true });
    await fs.writeFile(
      path.join(home, "plugins.json"),
      JSON.stringify({
        customTools: [
          {
            id: "demo",
            name: "Demo",
            configFile: "~/.demo/config.json",
            protocol: "openai",
          },
        ],
      })
    );
    try {
      const suggestions = await suggestPluginPatchStyles();
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]?.pluginId).toBe("demo");
      expect(suggestions[0]?.suggestedPatchStyle).toBe("openai-json");
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(home, { recursive: true, force: true });
    }
  });
});
