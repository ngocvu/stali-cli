import { describe, expect, test } from "bun:test";
import { resolveNpmInstallSpec } from "./npm-update";

describe("resolveNpmInstallSpec", () => {
  test("stable → latest", () => {
    expect(resolveNpmInstallSpec({ channel: "stable" })).toBe("stali-cli@latest");
  });

  test("beta → beta dist-tag", () => {
    expect(resolveNpmInstallSpec({ channel: "beta" })).toBe("stali-cli@beta");
  });

  test("pinned version", () => {
    expect(resolveNpmInstallSpec({ version: "3.16.0" })).toBe("stali-cli@3.16.0");
    expect(resolveNpmInstallSpec({ version: "v3.16.0" })).toBe("stali-cli@3.16.0");
  });
});
