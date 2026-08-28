import { describe, expect, test } from "bun:test";
import { deriveSetupNextCommand, printUserQuickReference, ONBOARDING_DOC_URL } from "./user-cli";

describe("user-cli", () => {
  test("printUserQuickReference links onboarding doc", () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      printUserQuickReference();
      const out = lines.join("\n");
      expect(out).toContain(ONBOARDING_DOC_URL);
      expect(out).toContain("stali guide onboarding");
      expect(out).toContain("stali status");
    } finally {
      console.log = orig;
    }
  });

  test("deriveSetupNextCommand success → status", () => {
    expect(
      deriveSetupNextCommand({
        success: true,
        steps: [
          { name: "auth login", ok: true },
          { name: "gateway auto", ok: true },
          { name: "check", ok: true },
        ],
      })
    ).toBe("stali status");
  });

  test("deriveSetupNextCommand auth fail", () => {
    expect(
      deriveSetupNextCommand({
        success: false,
        steps: [{ name: "auth login", ok: false }],
      })
    ).toBe("stali setup -k sk-stali-...");
  });

  test("deriveSetupNextCommand gateway fail", () => {
    expect(
      deriveSetupNextCommand({
        success: false,
        steps: [
          { name: "auth login", ok: true },
          { name: "gateway auto", ok: false },
        ],
      })
    ).toBe("stali gw");
  });
});
