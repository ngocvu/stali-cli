/**
 * JSONC (JSON có chú thích) — đọc/ghi giữ nguyên chú thích và định dạng.
 *
 * Vì sao cần: file cấu hình của tool AI (`~/.claude/settings.json`,
 * `~/.opencode/config.json`, `~/.qwen/settings.json`, …) do người dùng tự
 * sửa tay và thường có chú thích `//`. Ghi lại bằng `JSON.stringify` sẽ
 * XOÁ SẠCH chú thích và định dạng của họ — mất dữ liệu không thể khôi phục.
 *
 * Cách làm: chỉ sửa ĐÚNG các giá trị lá (leaf) mà CLI cần đổi, dùng
 * `jsonc-parser.modify` + `applyEdits` để vá văn bản gốc tại chỗ. Mọi thứ
 * khác — chú thích, thứ tự key, khoảng trắng — giữ nguyên.
 */
import { parse as parseJsonc, modify, applyEdits, type ParseError } from "jsonc-parser";

export interface JsoncParseResult<T = any> {
  data: T | null;
  errors: ParseError[];
}

/** Tuỳ chọn parse: cho phép chú thích + dấu phẩy thừa (JSONC thực dụng). */
export const JSONC_PARSE_OPTIONS = {
  allowTrailingComma: true,
  allowEmptyContent: true,
  disallowComments: false,
} as const;

export function parseJsoncText<T = any>(text: string): JsoncParseResult<T> {
  const errors: ParseError[] = [];
  const data = parseJsonc(text, errors, JSONC_PARSE_OPTIONS);
  return { data: (data ?? null) as T | null, errors };
}

/**
 * Có chú thích thật trong văn bản không?
 * Quét thủ công (bỏ qua chuỗi) để không nhầm `"http://x"` là chú thích.
 */
export function hasComments(text: string): boolean {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "/" && (text[i + 1] === "/" || text[i + 1] === "*")) return true;
  }
  return false;
}

/** Đặt/ghi đè một giá trị tại đường dẫn JSON, giữ nguyên phần còn lại. */
export function setJsoncValue(
  text: string,
  path: (string | number)[],
  value: unknown
): string {
  const edits = modify(text, path, value, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: detectEol(text) },
  });
  return applyEdits(text, edits);
}

/** Xoá một khoá tại đường dẫn JSON (no-op nếu không tồn tại). */
export function deleteJsoncKey(text: string, path: (string | number)[]): string {
  const edits = modify(text, path, undefined, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: detectEol(text) },
  });
  return applyEdits(text, edits);
}

export function detectEol(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * Ghi một object vào văn bản JSONC:
 * - Nếu key chưa có → chèn.
 * - Nếu đã có → thay đúng giá trị đó.
 * KHÔNG đụng tới key khác, chú thích, hay định dạng.
 */
export function mergeJsoncObject(
  text: string,
  path: (string | number)[],
  patch: Record<string, unknown>,
  opts?: { removeKeys?: string[] }
): string {
  let out = text;
  for (const key of opts?.removeKeys ?? []) {
    out = deleteJsoncKey(out, [...path, key]);
  }
  for (const [key, value] of Object.entries(patch)) {
    out = setJsoncValue(out, [...path, key], value);
  }
  return out;
}

/** Kết quả đọc một file JSONC trên đĩa. */
export interface JsoncFileRead<T = any> {
  /** Văn bản gốc (rỗng nếu file không tồn tại). */
  text: string;
  /** Object đã parse (null nếu file trống hoặc không parse được). */
  data: T | null;
  /** File có tồn tại không. */
  exists: boolean;
  /** File có chú thích không (để quyết định có được phép ghi đè hay không). */
  hasComments: boolean;
  errors: ParseError[];
}
