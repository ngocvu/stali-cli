/**
 * Danh mục model lấy từ API THẬT của Stali.
 *
 * Vì sao cần: bản cũ hardcode model mặc định cho từng tool
 * (`req/gpt-5.6-sol`, `stali/qwen3-codex`, `grok-4.6`…). Nếu NCC gỡ/đổi tên
 * model thì CLI vẫn ghi tên cũ vào config → người dùng gặp lỗi model không
 * tồn tại mà không hiểu vì sao. Ở đây ta hỏi API rồi chọn model còn sống.
 */
import type { StaliModel } from "../types";
import { fetchRealtimeModels } from "./api";
import { getToolById } from "../utils/tool-utils";

export interface ModelCatalog {
  models: StaliModel[];
  /** Model mặc định do API khai báo. */
  apiDefault: string;
  /** Thời điểm lấy (epoch ms). */
  fetchedAt: number;
  /** Lỗi nếu không lấy được. */
  error?: string;
}

const TTL_MS = 5 * 60 * 1000;
let cache: { key: string; catalog: ModelCatalog } | null = null;

/** Lấy danh mục model (có cache 5 phút). */
export async function loadModelCatalog(opts?: {
  apiKey?: string;
  baseUrl?: string;
  force?: boolean;
}): Promise<ModelCatalog> {
  const key = `${opts?.baseUrl ?? ""}|${opts?.apiKey ? "k" : "-"}`;
  if (!opts?.force && cache && cache.key === key && Date.now() - cache.catalog.fetchedAt < TTL_MS) {
    return cache.catalog;
  }

  const res = await fetchRealtimeModels(opts?.apiKey, { baseUrl: opts?.baseUrl });
  const catalog: ModelCatalog = {
    models: res.models ?? [],
    apiDefault: "",
    fetchedAt: Date.now(),
    error: res.error,
  };

  if (catalog.models.length > 0) {
    // API có thể trả default_model ở tầng response; fetchRealtimeModels chỉ trả list.
    catalog.apiDefault = pickBestDefault(catalog.models, "anthropic") || catalog.models[0].id;
  }

  cache = { key, catalog };
  return catalog;
}

export function invalidateModelCatalog(): void {
  cache = null;
}

/** Model có tồn tại trong danh mục không (so khớp chính xác). */
export function modelExists(catalog: ModelCatalog, modelId: string): boolean {
  if (!modelId) return false;
  return catalog.models.some((m) => m.id === modelId);
}

/** Các model hỗ trợ giao thức của tool. */
export function modelsForProtocol(
  catalog: ModelCatalog,
  protocol: "anthropic" | "openai" | "both"
): StaliModel[] {
  if (protocol === "both") return catalog.models;
  return catalog.models.filter((m) => m.supported_endpoint_types?.includes(protocol));
}

/**
 * Chọn model mặc định tốt nhất cho một tool.
 *
 * Thứ tự ưu tiên:
 *  1. Model người dùng chỉ định, NẾU còn tồn tại trên API.
 *  2. `preferred` (model mặc định của tool) nếu còn tồn tại.
 *  3. Model mặc định của API nếu hợp giao thức.
 *  4. Model đầu tiên hợp giao thức.
 * Trả "" nếu không có gì hợp lệ — người gọi nên cảnh báo thay vì ghi bừa.
 */
export function pickModelForTool(
  catalog: ModelCatalog,
  toolId: string,
  opts?: { preferred?: string; requested?: string }
): { model: string; reason: string; stale?: string } {
  const tool = getToolById(toolId);
  const protocol = tool?.protocol ?? "openai";
  const candidates = modelsForProtocol(catalog, protocol);

  if (opts?.requested) {
    if (modelExists(catalog, opts.requested)) {
      return { model: opts.requested, reason: "bạn chỉ định và model còn tồn tại" };
    }
    // Người dùng chỉ định model không có → báo rõ, nhưng vẫn tìm model thay thế.
    const fallback = pickFromCandidates(catalog, candidates, opts?.preferred);
    return {
      model: fallback.model,
      reason: `model bạn chỉ định KHÔNG có trên API; dùng tạm ${fallback.model || "(không có)"}`,
      stale: opts.requested,
    };
  }

  if (opts?.preferred) {
    if (modelExists(catalog, opts.preferred)) {
      return { model: opts.preferred, reason: "model mặc định của tool còn tồn tại" };
    }
    const fallback = pickFromCandidates(catalog, candidates, undefined);
    return {
      model: fallback.model,
      reason: `model mặc định của tool đã bị NCC gỡ; thay bằng ${fallback.model || "(không có)"}`,
      stale: opts.preferred,
    };
  }

  const picked = pickFromCandidates(catalog, candidates, undefined);
  return { model: picked.model, reason: picked.reason };
}

function pickFromCandidates(
  catalog: ModelCatalog,
  candidates: StaliModel[],
  preferred?: string
): { model: string; reason: string } {
  if (preferred) {
    const hit = candidates.find((m) => m.id === preferred);
    if (hit) return { model: hit.id, reason: "model ưu tiên hợp giao thức" };
  }
  if (catalog.apiDefault) {
    const hit = candidates.find((m) => m.id === catalog.apiDefault);
    if (hit) return { model: hit.id, reason: "model mặc định của API" };
  }
  if (candidates.length > 0) {
    return { model: candidates[0].id, reason: "model đầu tiên hợp giao thức" };
  }
  return { model: "", reason: "API không có model nào hợp giao thức này" };
}

/** Chọn model mặc định tốt nhất cho một giao thức. */
export function pickBestDefault(
  models: StaliModel[],
  protocol: "anthropic" | "openai"
): string {
  const ok = models.filter((m) => m.supported_endpoint_types?.includes(protocol));
  if (ok.length === 0) return models[0]?.id ?? "";
  return ok[0].id;
}

/** Mô tả ngắn một model để in ra terminal. */
export function describeModel(m: StaliModel): string {
  const price =
    "per_request" in m.pricing
      ? `${m.pricing.per_request}đ/lần`
      : `${m.pricing.input_per_1m}/${m.pricing.output_per_1m}đ mỗi 1M token`;
  const ctx = m.context_window ? ` · ${Math.round(m.context_window / 1000)}k ctx` : "";
  return `${m.id} — ${m.display_name || m.id} (${m.billing_unit}, ${price})${ctx}`;
}
