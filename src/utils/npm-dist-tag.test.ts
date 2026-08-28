import { describe, expect, test } from "bun:test";
import { resolveNpmDistTag } from "./npm-dist-tag";

describe("resolveNpmDistTag", () => {
  test("stable → latest", () => {
    expect(resolveNpmDistTag("3.15.0")).toBe("latest");
  });

  test("beta prerelease → beta", () => {
    expect(resolveNpmDistTag("3.15.0-beta.1")).toBe("beta");
    expect(resolveNpmDistTag("3.15.0-beta")).toBe("beta");
  });

  test("rc → beta", () => {
    expect(resolveNpmDistTag("3.15.0-rc.2")).toBe("beta");
  });
});
