import { describe, expect, test } from "bun:test";
import { resolveIncludePlugins } from "./include-plugins";

describe("resolveIncludePlugins", () => {
  test("--no-plugins luôn tắt", () => {
    expect(resolveIncludePlugins({ noPlugins: true, includePlugins: true }, 3)).toBe(false);
  });

  test("--include-plugins bật dù không có plugin", () => {
    expect(resolveIncludePlugins({ includePlugins: true }, 0)).toBe(true);
  });

  test("mặc định: bật khi có plugin", () => {
    expect(resolveIncludePlugins({}, 2)).toBe(true);
    expect(resolveIncludePlugins({}, 0)).toBe(false);
  });
});
