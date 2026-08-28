import { describe, expect, test } from "bun:test";
import { renderCompletion } from "./completion";

describe("renderCompletion", () => {
  test("bash includes check và wizard", () => {
    const bash = renderCompletion("bash");
    expect(bash).toContain("check)");
    expect(bash).toContain("--tools-only");
    expect(bash).toMatch(/wizard/);
  });

  test("fish includes check scoped flags", () => {
    const fish = renderCompletion("fish");
    expect(fish).toContain("__fish_seen_subcommand_from check");
    expect(fish).toContain("plugins-only");
  });

  test("zsh includes check và wizard", () => {
    const zsh = renderCompletion("zsh");
    expect(zsh).toContain("check)");
    expect(zsh).toContain("wizard)");
    expect(zsh).toContain("--tools-only");
  });

  test("unknown shell → null", () => {
    expect(renderCompletion("powershell")).toBeNull();
  });
});
