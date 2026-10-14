import fs from "fs/promises";
import path from "path";
import os from "os";
import { parseTOML, stringifyTOML } from "confbox";
import {
  parseJsoncText,
  hasComments as textHasComments,
  setJsoncValue,
  deleteJsoncKey,
  detectEol,
} from "./jsonc";

/**
 * Expand ~ or %USERPROFILE% to full home directory
 */
export function resolveHomePath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Safely ensure parent directory exists
 */
export async function ensureParentDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Restrict permissions on sensitive config files (owner read/write only)
 */
export async function restrictFilePermissions(filePath: string): Promise<void> {
  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // Best-effort on platforms that don't support chmod
  }
}

/**
 * Ghi file NGUYÊN TỬ: ghi ra file tạm cùng thư mục rồi `rename` đè lên đích.
 *
 * Vì sao: `fs.writeFile` cắt file về 0 byte trước khi ghi. Nếu tiến trình bị
 * kill / mất điện / hết đĩa đúng lúc đó, file cấu hình của người dùng còn lại
 * RỖNG — mất toàn bộ config. `rename` trong cùng filesystem là thao tác
 * nguyên tử: người đọc chỉ thấy hoặc bản cũ, hoặc bản mới hoàn chỉnh.
 */
export async function writeFileAtomic(
  filePath: string,
  content: string | Buffer,
  options?: { mode?: number }
): Promise<void> {
  await ensureParentDir(filePath);
  const dir = path.dirname(filePath);
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.stali-${process.pid}-${Date.now().toString(36)}.tmp`
  );
  try {
    await fs.writeFile(tmp, content, options?.mode !== undefined ? { mode: options.mode } : undefined);
    await fs.rename(tmp, filePath);
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
}

/** Kết quả đọc file JSON/JSONC, phân biệt rõ "không có" và "hỏng". */
export interface JsonFileRead<T = any> {
  /** Dữ liệu đã parse (null nếu file trống/không tồn tại/không parse được). */
  data: T | null;
  /** File có tồn tại trên đĩa không. */
  exists: boolean;
  /** File tồn tại NHƯNG không parse được (JSON hỏng) — TUYỆT ĐỐI không ghi đè. */
  corrupt: boolean;
  /** Văn bản gốc trên đĩa (rỗng nếu không đọc được). */
  text: string;
  /** File cấu hình có chú thích (dạng // hoặc khối) hay không. */
  hasComments: boolean;
}

/**
 * Đọc JSON/JSONC an toàn, GIỮ NGUYÊN văn bản gốc để ghi vá về sau.
 * Tolerates chú thích và dấu phẩy thừa (JSONC), đúng như file config thật.
 */
export async function readJsonFileDetailed<T = any>(
  filePath: string
): Promise<JsonFileRead<T>> {
  let text = "";
  let exists = false;
  try {
    text = await fs.readFile(filePath, "utf-8");
    exists = true;
  } catch {
    return { data: null, exists: false, corrupt: false, text: "", hasComments: false };
  }

  if (text.trim() === "") {
    return { data: null, exists: true, corrupt: false, text, hasComments: false };
  }

  const { data, errors } = parseJsoncText<T>(text);
  return {
    data,
    exists: true,
    corrupt: errors.length > 0 || data === null,
    text,
    hasComments: textHasComments(text),
  };
}

/**
 * Safely read JSON file (tolerates trailing commas / comments)
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T | null> {
  const { data } = await readJsonFileDetailed<T>(filePath);
  return data;
}

/** Lỗi ném ra khi file cấu hình tồn tại nhưng hỏng định dạng. */
export class CorruptConfigError extends Error {
  constructor(public readonly filePath: string) {
    super(
      `File cấu hình hỏng định dạng: ${filePath}\n` +
        `Đã DỪNG để không ghi đè mất dữ liệu. Sửa tay hoặc sao lưu rồi xoá file này, sau đó chạy lại.`
    );
    this.name = "CorruptConfigError";
  }
}

/**
 * Đọc file cấu hình JSON, ném `CorruptConfigError` nếu file tồn tại mà hỏng.
 * Dùng trước mọi thao tác GHI để không phá config của người dùng.
 */
export async function readJsonFileForWrite<T = any>(
  filePath: string
): Promise<{ data: T; text: string; exists: boolean; hasComments: boolean }> {
  const read = await readJsonFileDetailed<T>(filePath);
  if (read.corrupt) throw new CorruptConfigError(filePath);
  return {
    data: (read.data ?? ({} as T)) as T,
    text: read.text,
    exists: read.exists,
    hasComments: read.hasComments,
  };
}

/**
 * Safely write JSON file
 */
export async function writeJsonFile(
  filePath: string,
  data: any,
  options?: { spaces?: number; secure?: boolean; eol?: string }
): Promise<void> {
  const spaces = options?.spaces ?? 2;
  let content = JSON.stringify(data, null, spaces);
  if (options?.eol) content = content.split("\n").join(options.eol);
  await writeFileAtomic(filePath, content);
  if (options?.secure !== false) {
    await restrictFilePermissions(filePath);
  }
}

/** Đường dẫn JSON có tồn tại trong object không (dùng để bỏ qua xoá vô nghĩa). */
function hasJsonPath(obj: unknown, path: (string | number)[]): boolean {
  let cur: any = obj;
  for (const seg of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(cur, seg)) return false;
    cur = cur[seg];
  }
  return true;
}

/**
 * Vá file JSON/JSONC tại chỗ, GIỮ NGUYÊN chú thích + định dạng + thứ tự key.
 *
 * Chỉ những đường dẫn trong `set` / `remove` bị đụng tới. Nếu file chưa tồn
 * tại thì tạo mới từ `{}`.
 *
 * Trả về false nếu file tồn tại nhưng hỏng (không ghi gì cả).
 */
export async function patchJsoncFile(
  filePath: string,
  patch: {
    set?: Array<{ path: (string | number)[]; value: unknown }>;
    remove?: Array<(string | number)[]>;
  },
  options?: { secure?: boolean; spaces?: number }
): Promise<boolean> {
  const read = await readJsonFileDetailed(filePath);
  if (read.corrupt) return false;

  const spaces = options?.spaces ?? 2;
  let text = read.text.trim() === "" ? "{}" : read.text;
  const eol = read.text ? detectEol(read.text) : "\n";
  const parsed = read.data;

  // jsonc-parser ném lỗi khi xoá key không tồn tại (nhất là trong `{}`).
  // Chỉ xoá khi đường dẫn THỰC SỰ có trong dữ liệu đã parse.
  for (const p of patch.remove ?? []) {
    if (!hasJsonPath(parsed, p)) continue;
    try {
      text = deleteJsoncKey(text, p);
    } catch {
      /* bỏ qua — không phá phần còn lại */
    }
  }
  for (const s of patch.set ?? []) {
    text = setJsoncValue(text, s.path, s.value);
  }

  if (!read.text.includes("\n") && !read.hasComments) {
    // File một dòng, không chú thích → định dạng lại cho đẹp.
    try {
      text = JSON.stringify(JSON.parse(text), null, spaces);
    } catch {
      /* giữ nguyên nếu lạ */
    }
  } else {
    text = text.replace(/\r?\n/g, eol);
  }
  if (!text.endsWith("\n")) text += eol;

  await writeFileAtomic(filePath, text);
  if (options?.secure !== false) {
    await restrictFilePermissions(filePath);
  }
  return true;
}

/**
 * Safely read TOML file using confbox
 */
export async function readTomlFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return parseTOML(raw) as T;
  } catch {
    return null;
  }
}

/** Kết quả đọc TOML, phân biệt "không có" và "hỏng". */
export async function readTomlFileDetailed<T = any>(
  filePath: string
): Promise<{ data: T | null; exists: boolean; corrupt: boolean; text: string }> {
  let text = "";
  try {
    text = await fs.readFile(filePath, "utf-8");
  } catch {
    return { data: null, exists: false, corrupt: false, text: "" };
  }
  if (text.trim() === "") return { data: null, exists: true, corrupt: false, text };
  try {
    return { data: parseTOML(text) as T, exists: true, corrupt: false, text };
  } catch {
    return { data: null, exists: true, corrupt: true, text };
  }
}

/**
 * Safely write TOML file using confbox
 */
export async function writeTomlFile(
  filePath: string,
  data: any,
  options?: { secure?: boolean }
): Promise<void> {
  const content = stringifyTOML(data);
  await writeFileAtomic(filePath, content);
  if (options?.secure !== false) {
    await restrictFilePermissions(filePath);
  }
}
