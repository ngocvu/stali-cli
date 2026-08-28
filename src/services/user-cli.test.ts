import { describe, expect, test } from "bun:test";
import { deriveSetupNextCommand } from "./user-cli";

describe("user-cli", () => {
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
