import { StaliPricing, StaliPricingToken, StaliPricingRequest } from "../types";

/**
 * Format currency number to Vietnamese Dong (e.g. 8.300đ)
 */
export function formatVND(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

/**
 * Format token limit number to readable string (e.g. 1.000.000 -> 1M, 256.000 -> 256K)
 */
export function formatTokens(tokens?: number): string {
  if (!tokens) return "-";
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`;
  }
  return String(tokens);
}

/**
 * Format pricing summary string based on billing_unit
 */
export function formatPricingSummary(
  billingUnit: "token" | "request",
  pricing: StaliPricing
): string {
  if (billingUnit === "request") {
    const reqPricing = pricing as StaliPricingRequest;
    return `${formatVND(reqPricing.per_request)}/lượt`;
  }

  const tokenPricing = pricing as StaliPricingToken;
  const inPrice = formatVND(tokenPricing.input_per_1m);
  const outPrice = formatVND(tokenPricing.output_per_1m);

  if (inPrice === outPrice) {
    return `${inPrice}/1M token`;
  }
  return `In: ${inPrice} | Out: ${outPrice}/1M`;
}
