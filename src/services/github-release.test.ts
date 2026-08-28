import { describe, expect, test } from "bun:test";
import { fetchLatestGithubRelease } from "./github-release";

describe("fetchLatestGithubRelease", () => {
  test("returns null on bad repo (offline-safe)", async () => {
    const r = await fetchLatestGithubRelease("invalid-owner/invalid-repo-404");
    expect(r).toBeNull();
  });
});
