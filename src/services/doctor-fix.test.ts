import { describe, expect, test } from "bun:test";
import {
  resolveDoctorFixTargets,
  runDoctorFix,
} from "./doctor-fix";
import { SUPPORTED_TOOLS } from "../constants/tools";

describe("resolveDoctorFixTargets", () => {
  const mockStatuses = SUPPORTED_TOOLS.map((t, i) => ({
    toolId: t.id,
    toolName: t.name,
    configPath: `/tmp/${t.id}`,
    exists: true,
    configuredForStali: i < 5,
  }));

  test("mặc định chỉ tool chưa OK", () => {
    const ids = resolveDoctorFixTargets(undefined, mockStatuses, false);
    expect(ids.length).toBe(SUPPORTED_TOOLS.length - 5);
    expect(ids).not.toContain("claude");
  });

  test("force gồm tất cả", () => {
    const ids = resolveDoctorFixTargets(undefined, mockStatuses, true);
    expect(ids.length).toBe(SUPPORTED_TOOLS.length);
  });

  test("toolInputs filter theo alias", () => {
    const ids = resolveDoctorFixTargets(["deepseek", "cline"], mockStatuses, false);
    expect(ids).toContain("deepseek-tui");
    expect(ids).toContain("cline");
  });
});

describe("runDoctorFix dry-run", () => {
  test("invalid key → fail sớm", async () => {
    const result = await runDoctorFix({
      apiKey: "sk-openai-bad",
      dryRun: true,
    });
    expect(result.allOk).toBe(false);
    expect(result.items[0]?.error).toBe("INVALID_KEY");
  });

  test("dry-run với key hợp lệ format → liệt kê tool", async () => {
    const key = "sk-stali-" + "a".repeat(40);
    const result = await runDoctorFix({
      apiKey: key,
      dryRun: true,
      toolInputs: ["droid", "cowork"],
    });
    expect(result.allOk).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.items.every((i) => i.success)).toBe(true);
  });
});
