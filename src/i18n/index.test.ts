import { describe, expect, test } from "bun:test";
import { resolveLocale, setLocale, t } from "../i18n";
import { doctorSnapshotHash } from "../services/notify";

describe("i18n", () => {
  test("resolveLocale en", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("EN-US")).toBe("en");
  });

  test("t switches with setLocale", () => {
    setLocale("en");
    expect(t("check_fail")).toContain("Action");
    setLocale("vi");
    expect(t("check_fail")).toContain("Cần");
  });
});

describe("doctorSnapshotHash", () => {
  test("stable hash", () => {
    const statuses = [
      { toolId: "claude", configuredForStali: true, model: "m1", endpoint: "e1" },
    ] as any[];
    expect(doctorSnapshotHash(statuses)).toBe(doctorSnapshotHash(statuses));
  });
});
