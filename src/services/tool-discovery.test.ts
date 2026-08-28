import { describe, expect, test } from "bun:test";
import { discoverTool, formatDiscoverySignal } from "./tool-discovery";

describe("tool-discovery", () => {
  test("formatDiscoverySignal joins signals", () => {
    expect(formatDiscoverySignal({ binary: true, config: true })).toBe("binary+config");
    expect(formatDiscoverySignal({})).toBe("—");
  });

  test("discoverTool marks installed when health says config exists", async () => {
    const entry = await discoverTool("openclaw", {
      toolId: "openclaw",
      toolName: "OpenClaw",
      configPath: "~/.openclaw/config.json",
      exists: true,
      configuredForStali: false,
    });
    expect(entry.installed).toBe(true);
    expect(entry.signals.config).toBe(true);
    expect(entry.configuredForStali).toBe(false);
  });

  test("discoverTool unknown id", async () => {
    const entry = await discoverTool("not-a-tool");
    expect(entry.installed).toBe(false);
  });
});
