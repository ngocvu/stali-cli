/**
 * Dò API key Stali đang được dùng trên máy.
 *
 * Vì sao cần: người dùng có thể cấu hình qua `stali configure <tool>` mà chưa
 * bao giờ chạy `stali auth login`, nên `~/.stali/config.json` rỗng trong khi
 * key thật đã nằm trong `~/.claude/settings.json`, `~/.codex/auth.json`…
 * Không dò được thì `stali verify` không kiểm tra được gì.
 */
import { loadStaliConfig } from "./config";
import { readJsonFileDetailed, readTomlFileDetailed } from "../utils/file";
import { resolveToolConfigPath } from "./syncers/paths";
import { isValidStaliTokenFormat } from "../utils/token";

export interface DiscoveredKey {
  key: string;
  /** Nơi tìm thấy. */
  source: string;
}

/** Các vị trí có thể chứa key, theo thứ tự ưu tiên. */
async function candidateKeys(): Promise<Array<{ key: string; source: string }>> {
  const out: Array<{ key: string; source: string }> = [];

  // 1. Config riêng của stali (nguồn chính).
  const cfg = await loadStaliConfig();
  if (cfg?.apiKey?.trim()) {
    out.push({ key: cfg.apiKey.trim(), source: "~/.stali/config.json" });
  }

  // 2. Claude: env.ANTHROPIC_AUTH_TOKEN
  try {
    const p = (await resolveToolConfigPath("claude"))?.chosen;
    if (p) {
      const { data } = await readJsonFileDetailed<any>(p);
      const k = data?.env?.ANTHROPIC_AUTH_TOKEN;
      if (typeof k === "string" && k.trim()) out.push({ key: k.trim(), source: p });
    }
  } catch {
    /* bỏ qua */
  }

  // 3. Codex: auth.json OPENAI_API_KEY
  try {
    const p = (await resolveToolConfigPath("codex"))?.chosen;
    if (p) {
      const authPath = p.replace(/config\.toml$/, "auth.json");
      const { data } = await readJsonFileDetailed<any>(authPath);
      const k = data?.OPENAI_API_KEY;
      if (typeof k === "string" && k.trim()) out.push({ key: k.trim(), source: authPath });
    }
  } catch {
    /* bỏ qua */
  }

  // 4. Qwen: security.auth.apiKey
  try {
    const p = (await resolveToolConfigPath("qwen"))?.chosen;
    if (p) {
      const { data } = await readJsonFileDetailed<any>(p);
      const k = data?.security?.auth?.apiKey;
      if (typeof k === "string" && k.trim()) out.push({ key: k.trim(), source: p });
    }
  } catch {
    /* bỏ qua */
  }

  // 5. Biến môi trường (thấp nhất — có thể do CI đặt).
  for (const name of ["STALI_API_KEY", "ANTHROPIC_AUTH_TOKEN", "OPENAI_API_KEY"]) {
    const v = process.env[name]?.trim();
    if (v) out.push({ key: v, source: `$${name}` });
  }

  return out;
}

/**
 * Tìm key Stali đầu tiên hợp lệ về định dạng. Trả null nếu không có.
 * Chỉ nhận key đúng dạng `sk-stali-…` để không nhặt nhầm key của NCC khác.
 */
export async function discoverStaliKey(): Promise<DiscoveredKey | null> {
  const candidates = await candidateKeys();
  for (const c of candidates) {
    if (isValidStaliTokenFormat(c.key)) return { key: c.key, source: c.source };
  }
  return null;
}

/** Mọi key Stali tìm thấy (để phát hiện cấu hình lệch giữa các tool). */
export async function discoverAllStaliKeys(): Promise<DiscoveredKey[]> {
  const candidates = await candidateKeys();
  return candidates.filter((c) => isValidStaliTokenFormat(c.key));
}
