import { describe, expect, test } from "bun:test";
import { resolveToolId, getToolById } from "./tool-utils";

describe("resolveToolId", () => {
  test("aliases connect-catalog ids", () => {
    expect(resolveToolId("claude-code")).toBe("claude");
    expect(resolveToolId("vscode-cline")).toBe("cline");
    expect(resolveToolId("deepseek")).toBe("deepseek-tui");
    expect(resolveToolId("grok")).toBe("grok-build");
  });

  test("passes through canonical ids", () => {
    expect(resolveToolId("openclaw")).toBe("openclaw");
    expect(resolveToolId("codex")).toBe("codex");
  });

  test("getToolById resolves alias", () => {
    expect(getToolById("claude-code")?.id).toBe("claude");
  });
});
