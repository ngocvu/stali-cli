import { describe, expect, test } from "bun:test";
import { isNewerVersion } from "../services/version-check";

describe("isNewerVersion", () => {
  test("2.1.0 > 2.0.0", () => {
    expect(isNewerVersion("2.0.0", "2.1.0")).toBe(true);
  });

  test("2.0.0 không > 2.0.0", () => {
    expect(isNewerVersion("2.0.0", "2.0.0")).toBe(false);
  });

  test("2.1.0 > 2.0.9", () => {
    expect(isNewerVersion("2.0.9", "2.1.0")).toBe(true);
  });

  test("1.9.0 < 2.0.0", () => {
    expect(isNewerVersion("2.0.0", "1.9.0")).toBe(false);
  });
});
