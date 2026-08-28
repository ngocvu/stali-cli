import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { inferPluginPatchStyle, syncPluginEntry } from "./plugin-sync";
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
});
