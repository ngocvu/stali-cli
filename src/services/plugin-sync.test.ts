import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { inferPluginPatchStyle, syncPluginEntry, buildPluginConfigPreview, runPluginsSync } from "./plugin-sync";
import type { PluginEntry } from "./plugins";

describe("plugin-sync", () => {
  test("inferPluginPatchStyle theo protocol và extension", () => {
    const toml: PluginEntry = {
      id: "x",
      name: "X",
      configFile: "~/.x/config.toml",
      protocol: "openai",
    };
    expect(inferPluginPatchStyle(toml)).toBe("openai-toml");

    const anthropic: PluginEntry = {
      id: "y",
      name: "Y",
      configFile: "~/.y/config.json",
      protocol: "anthropic",
    };
    expect(inferPluginPatchStyle(anthropic)).toBe("anthropic-env");
  });

  test("buildPluginConfigPreview masks key", () => {
    const entry: PluginEntry = {
      id: "x",
      name: "X",
      configFile: "~/.x/config.json",
      protocol: "openai",
      patchStyle: "openai-json",
    };
    const preview = buildPluginConfigPreview(entry, "sk-stali-" + "a".repeat(40));
    expect(JSON.stringify(preview)).toContain("…");
    expect(JSON.stringify(preview)).toContain("api.stali.vn");
  });

  test("cowork patchStyle", () => {
    const entry: PluginEntry = {
      id: "c",
      name: "C",
      configFile: "~/.cowork/settings.json",
      protocol: "openai",
      patchStyle: "cowork",
    };
    expect(inferPluginPatchStyle(entry)).toBe("cowork");
  });

  test("syncPluginEntry ghi file (isolated HOME)", async () => {
    const prev = process.env.HOME;
    const home = path.join(os.tmpdir(), `stali-plugin-home-${Date.now()}`);
    await fs.mkdir(path.join(home, ".my-agent"), { recursive: true });
    process.env.HOME = home;
    process.env.USERPROFILE = home;

    const entry: PluginEntry = {
      id: "my-agent",
      name: "My Agent",
      configFile: path.join(home, ".my-agent", "config.json"),
      protocol: "openai",
      patchStyle: "openai-json",
      defaultModel: "gpt-5.6-sol",
    };

    try {
      const result = await syncPluginEntry(
        entry,
        "sk-stali-test-key-0123456789012345678901234567890"
      );
      expect(result.success).toBe(true);
      const content = await fs.readFile(entry.configFile, "utf8");
      expect(content).toContain("api.stali.vn");
    } finally {
      if (prev === undefined) delete process.env.HOME;
      else process.env.HOME = prev;
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("runPluginsSync --preview không ghi file", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-sync-prev-${Date.now()}`);
    process.env.STALI_HOME = home;
    await fs.mkdir(home, { recursive: true });
    await fs.writeFile(
      path.join(home, "plugins.json"),
      JSON.stringify({
        customTools: [
          {
            id: "p1",
            name: "P1",
            configFile: path.join(home, ".p1", "config.json"),
            protocol: "openai",
            patchStyle: "openai-json",
          },
        ],
      })
    );
    try {
      const { items, allOk } = await runPluginsSync({
        apiKey: "sk-stali-" + "b".repeat(40),
        preview: true,
      });
      expect(allOk).toBe(true);
      expect(items[0]?.preview).toBeDefined();
      expect(items[0]?.preview?.patchStyle).toBe("openai-json");
      expect(JSON.stringify(items[0]?.preview)).toContain("…");
      const exists = await fs
        .access(path.join(home, ".p1", "config.json"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(home, { recursive: true, force: true });
    }
  });
});
