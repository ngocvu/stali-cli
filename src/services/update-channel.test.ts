import { describe, expect, test } from "bun:test";
import { resolveUpdateChannel } from "./update-channel";

describe("resolveUpdateChannel", () => {
  test("stable → main", () => {
    const c = resolveUpdateChannel("stable");
    expect(c.channel).toBe("stable");
    expect(c.branch).toBe("main");
    expect(c.versionUrl).toContain("/main/package.json");
  });

  test("beta → beta branch", () => {
    const c = resolveUpdateChannel("beta");
    expect(c.channel).toBe("beta");
    expect(c.branch).toBe("beta");
    expect(c.versionUrl).toContain("/beta/package.json");
  });
});
