import { describe, expect, test } from "bun:test";
import { resolveUpdateChannel, resolveUpdateChannelResolved } from "./update-channel";

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

describe("resolveUpdateChannelResolved", () => {
  test("fallback stable khi offline / API lỗi", async () => {
    const prev = process.env.STALI_CLI_GITHUB_REPO;
    process.env.STALI_CLI_GITHUB_REPO = "invalid-owner/invalid-repo-404";
    try {
      const c = await resolveUpdateChannelResolved("stable");
      expect(c.channel).toBe("stable");
      expect(c.branch).toBe("main");
    } finally {
      if (prev === undefined) delete process.env.STALI_CLI_GITHUB_REPO;
      else process.env.STALI_CLI_GITHUB_REPO = prev;
    }
  });
});
