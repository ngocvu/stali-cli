import { describe, expect, test } from "bun:test";
import { validateTokenFormat, maskToken, isValidStaliTokenFormat } from "./token";

describe("token utils", () => {
  test("validateTokenFormat rejects empty", () => {
    expect(validateTokenFormat("")).toBeTruthy();
  });

  test("validateTokenFormat rejects wrong prefix", () => {
    expect(validateTokenFormat("sk-openai-abc")).toMatch(/sk-stali-/);
  });

  test("validateTokenFormat accepts sk-stali key", () => {
    expect(validateTokenFormat("sk-stali-abcdefghijklmnopqrst")).toBeNull();
  });

  test("maskToken hides middle", () => {
    const masked = maskToken("sk-stali-abcdefghijklmnopqrst");
    expect(masked).toContain("...");
    expect(masked).not.toContain("bcdefghij");
  });

  test("isValidStaliTokenFormat", () => {
    expect(isValidStaliTokenFormat("sk-stali-abcdefghijklmnopqrst")).toBe(true);
    expect(isValidStaliTokenFormat("bad")).toBe(false);
  });
});
