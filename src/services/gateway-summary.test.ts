import { describe, expect, test } from "bun:test";
import { summarizeGatewayPending } from "./gateway-summary";
import type { ToolDiscoveryEntry } from "./tool-discovery";

describe("summarizeGatewayPending", () => {
  test("tính pendingGateway từ discovery", () => {
    const entries: ToolDiscoveryEntry[] = [
      {
        toolId: "claude",
        toolName: "Claude",
        installed: true,
        configuredForStali: false,
        signals: { binary: true },
        configPath: "~/.claude",
      },
      {
        toolId: "codex",
        toolName: "Codex",
        installed: true,
        configuredForStali: true,
        signals: { binary: true },
        configPath: "~/.codex",
      },
      {
        toolId: "qwen",
        toolName: "Qwen",
        installed: false,
        configuredForStali: false,
        signals: {},
        configPath: "~/.qwen",
      },
    ];
    const s = summarizeGatewayPending(entries);
    expect(s.installed).toBe(2);
    expect(s.configured).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.pendingGateway).toEqual(["claude"]);
    expect(s.pendingGatewayCount).toBe(1);
  });
});
