import { describe, expect, test } from "bun:test";
import { TOOL_PROCESS_MARKERS } from "../constants/tool-binaries";
import { probeRunningProcessFromList } from "./tool-discovery";

describe("process discovery markers", () => {
  test("matches claude-code in synthetic command line", () => {
    const lines = [
      "node /usr/local/bin/claude-code --help",
      "chrome.exe",
    ];
    expect(probeRunningProcessFromList(lines, "claude")).toBe(true);
  });

  test("matches codex marker", () => {
    const lines = ["c:\\users\\me\\appdata\\roaming\\npm\\codex.cmd run"];
    expect(probeRunningProcessFromList(lines, "codex")).toBe(true);
  });

  test("no false positive on empty lines", () => {
    expect(probeRunningProcessFromList([], "claude")).toBe(false);
  });

  test("TOOL_PROCESS_MARKERS defined for all active tools", () => {
    const ids = ["claude", "codex", "openclaw", "cline", "roo"];
    for (const id of ids) {
      expect((TOOL_PROCESS_MARKERS[id] || []).length).toBeGreaterThan(0);
    }
  });
});
