import { describe, expect, test } from "bun:test";
import { resolveStaliUrls, isStaliLikeUrl } from "./stali-urls";

describe("resolveStaliUrls", () => {
  test("default production URLs", () => {
    const urls = resolveStaliUrls();
    expect(urls.openAiBaseUrl).toBe("https://api.stali.vn/v1");
    expect(urls.anthropicBaseUrl).toBe("https://api.stali.vn");
    expect(urls.modelsEndpoint).toBe("https://api.stali.vn/v1/models");
  });

  test("custom host without /v1", () => {
    const urls = resolveStaliUrls("https://staging.example.com");
    expect(urls.openAiBaseUrl).toBe("https://staging.example.com/v1");
    expect(urls.anthropicBaseUrl).toBe("https://staging.example.com");
    expect(urls.modelsEndpoint).toBe("https://staging.example.com/v1/models");
  });

  test("custom host with /v1 suffix", () => {
    const urls = resolveStaliUrls("https://staging.example.com/v1/");
    expect(urls.openAiBaseUrl).toBe("https://staging.example.com/v1");
    expect(urls.anthropicBaseUrl).toBe("https://staging.example.com");
  });

  test("empty string falls back to default", () => {
    const urls = resolveStaliUrls("   ");
    expect(urls.openAiBaseUrl).toBe("https://api.stali.vn/v1");
  });
});

describe("isStaliLikeUrl", () => {
  test("matches resolved custom base", () => {
    const urls = resolveStaliUrls("https://staging.example.com/v1");
    expect(isStaliLikeUrl("https://staging.example.com/v1", urls)).toBe(true);
    expect(isStaliLikeUrl("https://staging.example.com", urls)).toBe(true);
  });
});
