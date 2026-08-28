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

  test("bash includes doctor --strict", () => {
    const bash = renderCompletion("bash");
    expect(bash).toContain("doctor)");
    expect(bash).toContain("--strict");
  });

  test("zsh includes doctor --strict CI hint", () => {
    const zsh = renderCompletion("zsh");
    expect(zsh).toContain("doctor)");
    expect(zsh).toMatch(/--strict\[Exit 1/);
  });

  test("fish includes doctor --strict", () => {
    const fish = renderCompletion("fish");
    expect(fish).toContain("__fish_seen_subcommand_from doctor");
    expect(fish).toContain("-l strict");
  });

  test("unknown shell → null", () => {
    expect(renderCompletion("powershell")).toBeNull();
  });
});
