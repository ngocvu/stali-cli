import { describe, expect, test } from "bun:test";
import { purgeStaliFromUserPath } from "../services/path-purge";

describe("purgeStaliFromUserPath", () => {
  test("trả về detail trên mọi platform", () => {
    const r = purgeStaliFromUserPath();
    expect(r.detail.length).toBeGreaterThan(0);
    expect(r.platform).toBe(process.platform);
  });
});
