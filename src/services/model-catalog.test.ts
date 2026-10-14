import { describe, expect, test } from "bun:test";
import {
  pickModelForTool,
  pickBestDefault,
  modelsForProtocol,
  modelExists,
  describeModel,
  type ModelCatalog,
} from "./model-catalog";
import type { StaliModel } from "../types";

function m(id: string, types: Array<"anthropic" | "openai">): StaliModel {
  return {
    id,
    display_name: id,
    supported_endpoint_types: types,
    billing_unit: "request",
    pricing: { currency: "VND", per_request: 1000 },
  };
}

const catalog: ModelCatalog = {
  models: [
    m("req/claude-sonnet", ["anthropic"]),
    m("req/gpt-sol", ["openai"]),
    m("req/both-model", ["anthropic", "openai"]),
  ],
  apiDefault: "req/claude-sonnet",
  fetchedAt: Date.now(),
};

describe("model-catalog", () => {
  test("modelsForProtocol lọc đúng", () => {
    expect(modelsForProtocol(catalog, "anthropic").map((x) => x.id)).toEqual([
      "req/claude-sonnet",
      "req/both-model",
    ]);
    expect(modelsForProtocol(catalog, "openai").map((x) => x.id)).toEqual([
      "req/gpt-sol",
      "req/both-model",
    ]);
    expect(modelsForProtocol(catalog, "both")).toHaveLength(3);
  });

  test("modelExists", () => {
    expect(modelExists(catalog, "req/gpt-sol")).toBe(true);
    expect(modelExists(catalog, "model-da-bi-go")).toBe(false);
    expect(modelExists(catalog, "")).toBe(false);
  });

  test("claude (anthropic) chọn model anthropic còn sống", () => {
    const r = pickModelForTool(catalog, "claude", { preferred: "req/claude-sonnet" });
    expect(r.model).toBe("req/claude-sonnet");
    expect(r.stale).toBeUndefined();
  });

  test("codex (openai) KHÔNG nhận model chỉ có anthropic", () => {
    // Model mặc định của codex bị NCC gỡ → phải thay bằng model openai.
    const r = pickModelForTool(catalog, "codex", { preferred: "req/gpt-5.6-sol" });
    expect(r.stale).toBe("req/gpt-5.6-sol");
    expect(catalog.models.find((x) => x.id === r.model)!.supported_endpoint_types).toContain("openai");
  });

  test("model người dùng chỉ định mà còn sống thì giữ nguyên", () => {
    const r = pickModelForTool(catalog, "opencode", { requested: "req/gpt-sol" });
    expect(r.model).toBe("req/gpt-sol");
    expect(r.stale).toBeUndefined();
  });

  test("model người dùng chỉ định đã chết → báo rõ + thay thế", () => {
    const r = pickModelForTool(catalog, "opencode", { requested: "model-khong-ton-tai" });
    expect(r.stale).toBe("model-khong-ton-tai");
    expect(r.reason).toContain("KHÔNG có trên API");
    expect(r.model).not.toBe("model-khong-ton-tai");
    expect(r.model.length).toBeGreaterThan(0);
  });

  test("danh mục rỗng → trả rỗng, không bịa model", () => {
    const empty: ModelCatalog = { models: [], apiDefault: "", fetchedAt: Date.now() };
    const r = pickModelForTool(empty, "codex", { preferred: "req/gpt-5.6-sol" });
    expect(r.model).toBe("");
  });

  test("pickBestDefault theo giao thức", () => {
    expect(pickBestDefault(catalog.models, "anthropic")).toBe("req/claude-sonnet");
    expect(pickBestDefault(catalog.models, "openai")).toBe("req/gpt-sol");
    expect(pickBestDefault([], "openai")).toBe("");
  });

  test("describeModel không ném lỗi với cả 2 dạng pricing", () => {
    expect(describeModel(m("a", ["openai"]))).toContain("a");
    const token: StaliModel = {
      id: "t",
      display_name: "T",
      supported_endpoint_types: ["openai"],
      billing_unit: "token",
      pricing: { currency: "VND", input_per_1m: 1000, output_per_1m: 2000 },
    };
    expect(describeModel(token)).toContain("1M token");
  });
});
