import { describe, expect, test } from "bun:test";
import { buildInstallPlan } from "./install-cli";

describe("install-cli", () => {
  test("buildInstallPlan includes npm as recommended", () => {
    const plan = buildInstallPlan();
    expect(plan.recommended).toBe("npm");
    expect(plan.methods.some((m) => m.method === "npm")).toBe(true);
    expect(plan.methods.find((m) => m.method === "npm")?.command).toContain("npm install -g");
  });

  test("buildInstallPlan pins version", () => {
    const plan = buildInstallPlan("3.13.0");
    expect(plan.version).toBe("v3.13.0");
    expect(plan.methods.find((m) => m.method === "npm")?.command).toContain("stali-cli@3.13.0");
  });

  test("buildInstallPlan has curl one-liner", () => {
    const plan = buildInstallPlan();
    expect(plan.methods.some((m) => m.method === "curl")).toBe(true);
  });
});
