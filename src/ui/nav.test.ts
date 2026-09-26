import { describe, expect, test } from "bun:test";
import {
  CONFIGURE_STEPS,
  configureStepIndex,
  formatHints,
  HINTS,
  hintsForStep,
  isConfigureFlow,
} from "./nav";

describe("configure flow", () => {
  test("step indicator indexes", () => {
    expect(isConfigureFlow("app")).toBe(true);
    expect(isConfigureFlow("menu")).toBe(false);
    expect(configureStepIndex("app")).toBe(0);
    expect(configureStepIndex("tool-detail")).toBe(1);
    expect(configureStepIndex("model")).toBe(1);
    expect(configureStepIndex("review")).toBe(2);
    expect(CONFIGURE_STEPS).toHaveLength(3);
  });
});

describe("hintsForStep", () => {
  test("token first-run hides back", () => {
    const keys = hintsForStep("token", false).map((h) => h.keys);
    expect(keys.some((k) => k.includes("Esc"))).toBe(false);
  });

  test("token from menu shows back", () => {
    const keys = hintsForStep("token", true).map((h) => h.keys);
    expect(keys).toContain("Esc");
  });

  test("menu does not advertise Esc", () => {
    const keys = HINTS.menu.map((h) => h.keys);
    expect(keys.some((k) => k.includes("Esc"))).toBe(false);
  });

  test("advanced menu advertises Esc back", () => {
    const keys = hintsForStep("advanced").map((h) => h.keys);
    expect(keys).toContain("Esc");
  });

  test("formatHints joins shortcuts", () => {
    const s = formatHints(HINTS.menu, true);
    expect(s).toContain("Di chuyển");
    expect(s).toContain("Enter");
  });
});
