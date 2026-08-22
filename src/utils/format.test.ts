import { describe, it, expect } from "bun:test";
import { formatVND, formatTokens, formatPricingSummary } from "./format";

describe("formatVND", () => {
  it("formats whole numbers with Vietnamese thousands separator", () => {
    expect(formatVND(8300)).toBe("8.300đ");
  });

  it("formats zero", () => {
    expect(formatVND(0)).toBe("0đ");
  });
});

describe("formatTokens", () => {
  it("returns dash when tokens is undefined", () => {
    expect(formatTokens(undefined)).toBe("-");
  });

  it("returns dash when tokens is zero", () => {
    expect(formatTokens(0)).toBe("-");
  });

  it("formats sub-thousand values as-is", () => {
    expect(formatTokens(512)).toBe("512");
  });

  it("formats thousands with K suffix, trimming whole numbers", () => {
    expect(formatTokens(256_000)).toBe("256K");
  });

  it("formats thousands with K suffix, keeping one decimal for fractions", () => {
    expect(formatTokens(1_500)).toBe("1.5K");
  });

  it("formats millions with M suffix, trimming whole numbers", () => {
    expect(formatTokens(1_000_000)).toBe("1M");
  });

  it("formats millions with M suffix, keeping one decimal for fractions", () => {
    expect(formatTokens(2_500_000)).toBe("2.5M");
  });
});

describe("formatPricingSummary", () => {
  it("formats request-based pricing", () => {
    const result = formatPricingSummary("request", {
      currency: "VND",
      per_request: 1000,
    });
    expect(result).toBe("1.000đ/lượt");
  });

  it("formats token-based pricing with equal in/out price as single price", () => {
    const result = formatPricingSummary("token", {
      currency: "VND",
      input_per_1m: 50000,
      output_per_1m: 50000,
    });
    expect(result).toBe("50.000đ/1M token");
  });

  it("formats token-based pricing with differing in/out prices", () => {
    const result = formatPricingSummary("token", {
      currency: "VND",
      input_per_1m: 30000,
      output_per_1m: 150000,
    });
    expect(result).toBe("In: 30.000đ | Out: 150.000đ/1M");
  });
});
