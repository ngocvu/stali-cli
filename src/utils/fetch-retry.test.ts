import { describe, expect, test } from "bun:test";
import { fetchWithRetry } from "./fetch-retry";

describe("fetchWithRetry", () => {
  test("returns ok on first success", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    try {
      const res = await fetchWithRetry("https://example.test", { method: "POST" }, { attempts: 3 });
      expect(res.ok).toBe(true);
      expect(calls).toBe(1);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("retries on network error", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls < 3) throw new Error("network");
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    try {
      const res = await fetchWithRetry(
        "https://example.test",
        { method: "POST" },
        { attempts: 3, backoffMs: [0, 0, 0] }
      );
      expect(res.ok).toBe(true);
      expect(calls).toBe(3);
    } finally {
      globalThis.fetch = original;
    }
  });
});
