import { describe, expect, test } from "bun:test";
import { fetchLatestGithubRelease, fetchReleaseAssets } from "./github-release";

describe("fetchLatestGithubRelease", () => {
  test("returns null on bad repo (offline-safe)", async () => {
    const r = await fetchLatestGithubRelease("invalid-owner/invalid-repo-404");
    expect(r).toBeNull();
  });
});

describe("fetchReleaseAssets", () => {
  test("returns empty on missing tag (offline-safe)", async () => {
    const assets = await fetchReleaseAssets("v0.0.0-invalid", "invalid-owner/invalid-repo-404");
    expect(assets).toEqual([]);
  });
});
