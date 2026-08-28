import { describe, expect, test } from "bun:test";
import { renderCompletion } from "./completion";

describe("renderCompletion", () => {
  test("bash includes check và wizard", () => {
    const bash = renderCompletion("bash");
    expect(bash).toContain("check)");
    expect(bash).toContain("--tools-only");
    expect(bash).toMatch(/wizard/);
  });

  test("bash includes gateway plan và bench", () => {
    const bash = renderCompletion("bash");
    expect(bash).toContain("gateway|gw)");
    expect(bash).toContain("plan");
    expect(bash).toContain("--yes");
    expect(bash).toContain("bench)");
    expect(bash).toContain("telemetry)");
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

  test("bash includes plugins suggest và sync preview", () => {
    const bash = renderCompletion("bash");
    expect(bash).toContain("suggest");
    expect(bash).toContain("--preview");
  });

  test("unknown shell → null", () => {
    expect(renderCompletion("powershell")).toBeNull();
  });
});
