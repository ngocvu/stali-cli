import { describe, expect, test } from "bun:test";
import { hasIdeExtensionFromIndex, buildDiscoveryScanContext } from "./tool-discovery";

// Re-export internal via buildDiscoveryScanContext test
describe("tool-discovery perf helpers", () => {
  test("buildDiscoveryScanContext returns sets", async () => {
    const ctx = await buildDiscoveryScanContext();
    expect(ctx.ideEntries).toBeInstanceOf(Set);
    expect(Array.isArray(ctx.processLines)).toBe(true);
  });

  test("hasIdeExtensionFromIndex matches marker", () => {
    const index = new Set(["anthropic.claude-code-1.0.0"]);
    expect(
      hasIdeExtensionFromIndex(index, ["anthropic.claude-code"])
    ).toBe(true);
    expect(hasIdeExtensionFromIndex(index, ["not-found"])).toBe(false);
  });
});
