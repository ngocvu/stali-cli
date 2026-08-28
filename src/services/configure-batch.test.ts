import { describe, expect, test } from "bun:test";
import { resolveBatchToolIds, runConfigureBatch } from "../services/configure-batch";
import { renderCompletion } from "../commands/completion";
import { SUPPORTED_TOOLS } from "../constants/tools";

describe("resolveBatchToolIds", () => {
  test("mặc định bỏ claude/codex khi skipAdvanced", () => {
    const ids = resolveBatchToolIds(undefined, true);
    expect(ids).not.toContain("claude");
    expect(ids).not.toContain("codex");
    expect(ids.length).toBe(SUPPORTED_TOOLS.length - 2);
  });

  test("gồm tất cả khi skipAdvanced=false", () => {
    const ids = resolveBatchToolIds(undefined, false);
    expect(ids.length).toBe(SUPPORTED_TOOLS.length);
  });

  test("resolve alias deepseek → deepseek-tui", () => {
    const ids = resolveBatchToolIds(["deepseek", "cline"], false);
    expect(ids).toContain("deepseek-tui");
    expect(ids).toContain("cline");
  });

  test("dedupe tool trùng", () => {
    const ids = resolveBatchToolIds(["claude", "claude-code"], false);
    expect(ids.filter((id) => id === "claude").length).toBe(1);
  });
});

describe("runConfigureBatch", () => {
  test("prefetchedValidation dry-run không cần mạng", async () => {
    const result = await runConfigureBatch({
      apiKey: "sk-stali-" + "x".repeat(40),
      toolInputs: ["openclaw"],
      dryRun: true,
      prefetchedValidation: { valid: true, models: [], defaultModel: "claude-fable-5" },
    });
    expect(result.allOk).toBe(true);
    expect(result.items[0]?.toolId).toBe("openclaw");
  });
});

describe("renderCompletion", () => {
  test("bash/zsh/fish có nội dung", () => {
    expect(renderCompletion("bash")).toContain("_stali_completion");
    expect(renderCompletion("zsh")).toContain("#compdef stali");
    expect(renderCompletion("fish")).toContain("complete -c stali");
  });

  test("shell lạ trả null", () => {
    expect(renderCompletion("powershell")).toBeNull();
  });
});
