import { describe, expect, test } from "bun:test";
import { buildToolConfigPreview } from "./preview";

describe("buildToolConfigPreview", () => {
  test("all 13 tools return preview object", async () => {
    const { SUPPORTED_TOOLS } = await import("../../constants/tools");
    for (const tool of SUPPORTED_TOOLS) {
      const preview = buildToolConfigPreview(tool.id, "sk-stali-preview-key-012345678901234567890", tool.defaultModel);
      expect(preview).toBeObject();
      expect(Object.keys(preview).length).toBeGreaterThan(0);
    }
  });

  test("masks api key in preview", () => {
    const preview = buildToolConfigPreview(
      "claude",
      "sk-stali-abcdefghijklmnopqrstuvwxyz",
      "claude-fable-5"
    ) as { env?: { ANTHROPIC_AUTH_TOKEN?: string } };
    expect(preview.env?.ANTHROPIC_AUTH_TOKEN).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(preview.env?.ANTHROPIC_AUTH_TOKEN).toContain("...");
  });
});
