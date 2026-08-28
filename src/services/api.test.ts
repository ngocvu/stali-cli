import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  fetchRealtimeModels,
  validateApiKeyAndFetchModels,
} from "./api";

const VALID_KEY = "sk-stali-" + "a".repeat(40);

const SAMPLE_MODELS = {
  object: "list",
  data: [
    {
      id: "claude-fable-5",
      display_name: "Claude Fable 5",
      supported_endpoint_types: ["anthropic"],
      billing_unit: "token",
      pricing: {
        currency: "VND",
        input_per_1m: 1000,
        output_per_1m: 2000,
      },
    },
  ],
  default_model: "claude-fable-5",
};

afterEach(() => {
  mock.restore();
});

describe("validateApiKeyAndFetchModels", () => {
  test("rejects invalid token prefix without network", async () => {
    const result = await validateApiKeyAndFetchModels("sk-openai-fake-key");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("sk-stali");
  });

  test("uses custom baseUrl for models endpoint", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify(SAMPLE_MODELS), { status: 200 });
    }) as typeof fetch;

    try {
      const result = await validateApiKeyAndFetchModels(VALID_KEY, {
        baseUrl: "https://custom.test/v1",
      });
      expect(requestedUrl).toBe("https://custom.test/v1/models");
      expect(result.valid).toBe(true);
      expect(result.models).toHaveLength(1);
      expect(result.defaultModel).toBe("claude-fable-5");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("maps authentication error response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          type: "error",
          error: { type: "authentication_error", message: "API key không hợp lệ." },
        }),
        { status: 401 }
      );
    }) as typeof fetch;

    try {
      const result = await validateApiKeyAndFetchModels(VALID_KEY);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("không hợp lệ");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("fetchRealtimeModels", () => {
  test("returns models on success", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify(SAMPLE_MODELS), { status: 200 });
    }) as typeof fetch;

    try {
      const result = await fetchRealtimeModels(VALID_KEY);
      expect(result.models).toHaveLength(1);
      expect(result.error).toBeUndefined();
      expect(result.endpoint).toContain("/models");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("surfaces HTTP errors instead of empty list", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response("upstream down", { status: 502, statusText: "Bad Gateway" });
    }) as typeof fetch;

    try {
      const result = await fetchRealtimeModels(VALID_KEY);
      expect(result.models).toHaveLength(0);
      expect(result.error).toContain("502");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("surfaces timeout errors", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      const err = new Error("The operation was aborted");
      err.name = "TimeoutError";
      throw err;
    }) as typeof fetch;

    try {
      const result = await fetchRealtimeModels(VALID_KEY);
      expect(result.models).toHaveLength(0);
      expect(result.error).toContain("Timeout");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
