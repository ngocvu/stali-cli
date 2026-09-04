import { describe, expect, test } from "bun:test";
import {
  flattenConfigRows,
  isSecretKey,
  maskPretty,
  truncate,
} from "./theme";

describe("truncate", () => {
  test("keeps short strings", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });

  test("cuts long strings", () => {
    const out = truncate("abcdefghijklmnop", 8);
    expect(out.length).toBeLessThanOrEqual(8);
    expect(out).not.toBe("abcdefghijklmnop");
  });
});

describe("isSecretKey", () => {
  test("detects token/key/auth leaves", () => {
    expect(isSecretKey("ANTHROPIC_AUTH_TOKEN")).toBe(true);
    expect(isSecretKey("env.apiKey")).toBe(true);
    expect(isSecretKey("model")).toBe(false);
    expect(isSecretKey("base_url")).toBe(false);
  });
});

describe("flattenConfigRows", () => {
  test("flattens nested objects and masks secrets", () => {
    const rows = flattenConfigRows({
      env: {
        ANTHROPIC_BASE_URL: "https://api.stali.vn",
        ANTHROPIC_AUTH_TOKEN: "sk-stali-secretvalue0001",
      },
      model: "claude-fable-5",
    });
    const keys = rows.map((r) => r.key);
    expect(keys).toContain("env.ANTHROPIC_BASE_URL");
    expect(keys).toContain("env.ANTHROPIC_AUTH_TOKEN");
    expect(keys).toContain("model");
    const token = rows.find((r) => r.key.endsWith("ANTHROPIC_AUTH_TOKEN"));
    expect(token?.secret).toBe(true);
  });

  test("caps row count", () => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < 40; i++) obj[`k${i}`] = String(i);
    const rows = flattenConfigRows(obj, "", 0, 10);
    expect(rows.length).toBeLessThanOrEqual(11);
  });
});

describe("maskPretty", () => {
  test("masks stali tokens keeping prefix and last 4", () => {
    const masked = maskPretty("sk-stali-abcdefghijklmnop");
    expect(masked.startsWith("sk-stali-")).toBe(true);
    expect(masked.endsWith("mnop")).toBe(true);
    expect(masked).not.toContain("abcdefgh");
  });

  test("empty token", () => {
    expect(maskPretty("")).toBe("");
  });
});
