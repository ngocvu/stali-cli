import { describe, expect, test } from "bun:test";
import { buildToolEnvEntries, renderEnvExport } from "../services/export-env";
import { resolveDoctorFixTargets } from "../services/doctor-fix";

describe("buildToolEnvEntries", () => {
  test("claude có ANTHROPIC_*", () => {
    const entries = buildToolEnvEntries("claude", "sk-stali-testkey1234567890", "claude-fable-5");
    const keys = entries.map((e) => e.key);
    expect(keys).toContain("ANTHROPIC_BASE_URL");
    expect(keys).toContain("ANTHROPIC_AUTH_TOKEN");
    expect(keys).toContain("ANTHROPIC_MODEL");
  });

  test("cline có VS Code fields", () => {
    const entries = buildToolEnvEntries("cline", "sk-stali-x", "claude-fable-5");
    expect(entries.some((e) => e.key.includes("VSCODE"))).toBe(true);
  });
});

describe("renderEnvExport", () => {
  test("shell format có export", () => {
    const out = renderEnvExport("openclaw", "sk-stali-abc", "claude-fable-5", "shell");
    expect(out).toContain("export ANTHROPIC_BASE_URL=");
    expect(out).toContain("api.stali.vn");
  });

  test("json format parse được", () => {
    const out = renderEnvExport("codex", "sk-stali-abc", "req/gpt-5.6-sol", "json");
    const parsed = JSON.parse(out);
    expect(parsed.OPENAI_API_KEY).toBe("sk-stali-abc");
  });

  test("powershell format", () => {
    const out = renderEnvExport("claude", "sk-stali-abc", "claude-fable-5", "powershell");
    expect(out).toContain("$env:ANTHROPIC_AUTH_TOKEN=");
  });
});

describe("resolveDoctorFixTargets", () => {
  test("mặc định chỉ tool chưa OK", () => {
    const statuses = [
      { toolId: "claude", configuredForStali: true },
      { toolId: "openclaw", configuredForStali: false },
    ] as any[];
    const targets = resolveDoctorFixTargets(undefined, statuses, false);
    expect(targets).toContain("openclaw");
    expect(targets).not.toContain("claude");
  });

  test("force gồm tất cả", () => {
    const statuses = [
      { toolId: "claude", configuredForStali: true },
    ] as any[];
    const targets = resolveDoctorFixTargets(undefined, statuses, true);
    expect(targets.length).toBe(13);
  });
});
