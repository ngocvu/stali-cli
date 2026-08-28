import { describe, expect, test } from "bun:test";
import {
  pickStandaloneAsset,
  resolveStandaloneAssetName,
} from "./install-mode";

describe("install-mode", () => {
  test("resolveStandaloneAssetName linux x64", () => {
    expect(resolveStandaloneAssetName("linux", "x64")).toBe("stali-standalone-linux-x64");
  });

  test("resolveStandaloneAssetName darwin arm64", () => {
    expect(resolveStandaloneAssetName("darwin", "arm64")).toBe("stali-standalone-darwin-arm64");
  });

  test("pickStandaloneAsset prefers platform name", () => {
    const assets = [
      { name: "stali-standalone", url: "https://x/legacy", size: 1 },
      { name: "stali-standalone-linux-x64", url: "https://x/new", size: 2 },
    ];
    const hit = pickStandaloneAsset(assets, "linux", "x64");
    expect(hit?.name).toBe("stali-standalone-linux-x64");
  });

  test("pickStandaloneAsset fallback legacy on linux x64", () => {
    const assets = [{ name: "stali-standalone", url: "https://x/legacy", size: 1 }];
    const hit = pickStandaloneAsset(assets, "linux", "x64");
    expect(hit?.name).toBe("stali-standalone");
  });
});
