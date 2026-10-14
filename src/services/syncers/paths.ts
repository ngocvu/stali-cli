/**
 * Dò đường dẫn cấu hình THẬT của từng tool.
 *
 * Vì sao cần: bản cũ hardcode một đường dẫn cho mỗi tool. Nhiều đường dẫn
 * trong đó SAI so với nơi tool thực sự đọc/ghi — ví dụ DeepSeek CLI dùng
 * `~/.config/deepseek-cli-nodejs/config.json` chứ không phải
 * `~/.deepseek/config.toml`, OpenCode dùng XDG, còn Cline/Roo/Kilo là
 * extension VS Code nên nằm trong `globalStorage/<publisher>.<name>/`.
 *
 * Nguyên tắc: KHÔNG đoán bừa. Mỗi đường dẫn được gắn nhãn mức độ tin cậy:
 *   - "verified"   : đã đối chiếu với tool cài thật / package thật
 *   - "convention" : theo quy ước chuẩn (XDG, VS Code globalStorage)
 *   - "unverified" : chưa kiểm chứng được — KHÔNG hứa hẹn
 * và `doctor --paths` in ra đúng nhãn đó để người dùng biết mức tin cậy.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";

export type PathConfidence = "verified" | "convention" | "unverified";

export interface PathCandidate {
  /** Đường dẫn tuyệt đối (đã thay ~). */
  path: string;
  /** Vì sao đường dẫn này được xét. */
  note: string;
  /**
   * Đường dẫn CŨ/SAI do chính stali-cli tạo ra ở bản trước, tool không đọc.
   * TUYỆT ĐỐI không ưu tiên chỉ vì nó tồn tại.
   */
  legacy?: boolean;
}

export interface ToolPathInfo {
  toolId: string;
  /** Đường dẫn được chọn để ghi. */
  chosen: string;
  /** Đường dẫn này có tồn tại trên máy không. */
  exists: boolean;
  /** Mức tin cậy của đường dẫn đã chọn. */
  confidence: PathConfidence;
  /** Các đường dẫn đã xét, theo thứ tự ưu tiên. */
  candidates: PathCandidate[];
  /** Ghi chú thêm (vì sao chọn, cảnh báo). */
  note?: string;
}

const HOME = () => os.homedir();

function xdgConfigHome(): string {
  return process.env.XDG_CONFIG_HOME?.trim() || path.join(HOME(), ".config");
}

function appDataDir(): string {
  // Windows
  return process.env.APPDATA?.trim() || path.join(HOME(), "AppData", "Roaming");
}

/**
 * Gốc thư mục `globalStorage` của các IDE dùng nền VS Code.
 * Extension lưu cấu hình ở `<root>/<publisher>.<name>/`.
 */
export function ideGlobalStorageRoots(): string[] {
  const home = HOME();
  const roots: string[] = [];
  if (process.platform === "darwin") {
    const base = path.join(home, "Library", "Application Support");
    for (const app of ["Code", "Code - Insiders", "VSCodium", "Cursor", "Windsurf"]) {
      roots.push(path.join(base, app, "User", "globalStorage"));
    }
  } else if (process.platform === "win32") {
    for (const app of ["Code", "Code - Insiders", "VSCodium", "Cursor", "Windsurf"]) {
      roots.push(path.join(appDataDir(), app, "User", "globalStorage"));
    }
  } else {
    const base = xdgConfigHome();
    for (const app of ["Code", "Code - Insiders", "VSCodium", "Cursor", "Windsurf"]) {
      roots.push(path.join(base, app, "User", "globalStorage"));
    }
  }
  return roots;
}

/** ID extension VS Code (publisher.name) cho các agent hỗ trợ. */
export const VSCODE_EXTENSION_IDS: Record<string, string[]> = {
  cline: ["saoudrizwan.claude-dev"],
  roo: ["rooveterinaryinc.roo-cline"],
  kilo: ["kilocode.kilo-code"],
};

/**
 * Thư mục dữ liệu của một extension VS Code, nếu IDE đã cài extension đó.
 * Trả về đường dẫn đầu tiên tồn tại trên đĩa.
 */
export async function findVscodeExtensionDir(
  toolId: string
): Promise<{ dir: string; extensionId: string } | null> {
  const ids = VSCODE_EXTENSION_IDS[toolId];
  if (!ids) return null;
  for (const root of ideGlobalStorageRoots()) {
    for (const id of ids) {
      const dir = path.join(root, id);
      try {
        const st = await fs.stat(dir);
        if (st.isDirectory()) return { dir, extensionId: id };
      } catch {
        /* chưa cài */
      }
    }
  }
  return null;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Định nghĩa đường dẫn cho từng tool. */
interface PathSpec {
  confidence: PathConfidence;
  /** Các đường dẫn theo thứ tự ưu tiên; ưu tiên bản đã tồn tại. */
  candidates: () => PathCandidate[];
  note?: string;
}

/**
 * Spec cho extension VS Code: đường dẫn ĐẦY ĐỦ tới file settings trong
 * `globalStorage/<publisher>.<name>/`. Vì `resolveToolConfigPath` ưu tiên
 * ứng viên đã tồn tại, máy nào đã cài extension sẽ tự trỏ đúng thư mục.
 */
function vscodeSpec(toolId: string, fileName: string, legacyPath: string): PathSpec {
  return {
    confidence: "convention",
    candidates: () => {
      const out: PathCandidate[] = [];
      for (const root of ideGlobalStorageRoots()) {
        for (const id of VSCODE_EXTENSION_IDS[toolId] ?? []) {
          out.push({
            path: path.join(root, id, fileName),
            note: `VS Code globalStorage (${id})`,
          });
        }
      }
      out.push({ path: legacyPath, note: "đường dẫn cũ của stali-cli — extension không đọc", legacy: true });
      return out;
    },
    note:
      "Extension VS Code lưu cấu hình trong `globalStorage/<publisher>.<name>/`; " +
      "stali-cli chọn thư mục của IDE đã cài nếu tìm thấy.",
  };
}

const SPECS: Record<string, PathSpec> = {
  claude: {
    confidence: "verified",
    candidates: () => [
      { path: path.join(HOME(), ".claude", "settings.json"), note: "đã đối chiếu với [CC] cài thật" },
    ],
    note: "[CC] đọc `env` trong file này — đã kiểm chứng trên máy chạy thật",
  },
  codex: {
    confidence: "verified",
    candidates: () => [
      { path: path.join(HOME(), ".codex", "config.toml"), note: "đã đối chiếu với codex-cli cài thật" },
    ],
    note: "Codex cần cả config.toml (model_provider) và auth.json (OPENAI_API_KEY)",
  },
  qwen: {
    confidence: "unverified",
    candidates: () => [
      { path: path.join(HOME(), ".qwen", "settings.json"), note: "đường dẫn cũ của stali-cli" },
    ],
    note:
      "Qwen Code TẠO thư mục ~/.qwen (đã kiểm chứng) nhưng TÊN file cấu hình " +
      "(settings.json) chưa được xác minh — có thể là ~/.qwen/.env hoặc QWEN_API_KEY/QWEN_BASE_URL",
  },
  opencode: {
    confidence: "convention",
    candidates: () => [
      { path: path.join(xdgConfigHome(), "opencode", "config.json"), note: "XDG — OpenCode tạo ~/.config/opencode (đã kiểm chứng)" },
      { path: path.join(HOME(), ".opencode", "config.json"), note: "đường dẫn cũ của stali-cli — tool dùng XDG", legacy: true },
    ],
    note: "OpenCode dùng XDG_CONFIG_HOME, không dùng ~/.opencode",
  },
  "deepseek-tui": {
    confidence: "verified",
    candidates: () => [
      {
        path: path.join(xdgConfigHome(), "deepseek-cli-nodejs", "config.json"),
        note: "DeepSeek CLI TỰ TẠO đường dẫn này khi chạy (đã kiểm chứng)",
      },
      { path: path.join(HOME(), ".deepseek", "config.toml"), note: "đường dẫn cũ của stali-cli — tool không đọc", legacy: true },
    ],
    note: "deepseek-cli dùng JSON trong ~/.config/deepseek-cli-nodejs, KHÔNG phải TOML trong ~/.deepseek",
  },
  cline: vscodeSpec("cline", "cline_settings.json", path.join(HOME(), ".vscode", "cline_settings.json")),
  roo: vscodeSpec("roo", "roo_settings.json", path.join(HOME(), ".vscode", "roo_settings.json")),
  kilo: vscodeSpec("kilo", "kilo_settings.json", path.join(HOME(), ".kilo", "config.json")),
  openclaw: {
    confidence: "unverified",
    candidates: () => [
      { path: path.join(HOME(), ".openclaw", "config.json"), note: "đường dẫn cũ của stali-cli", legacy: true },
    ],
    note:
      "openclaw có mặt trên npm (2026.10.3) nhưng chạy với HOME giả không tạo file cấu hình nào → " +
      "CHƯA xác minh được định dạng/đường dẫn",
  },
  "grok-build": {
    confidence: "unverified",
    candidates: () => [
      { path: path.join(HOME(), ".grok", "config.toml"), note: "đường dẫn cũ của stali-cli", legacy: true },
    ],
    note: "grok-cli trên npm là package khác, chạy với HOME giả không tạo config → CHƯA xác minh",
  },
  droid: {
    confidence: "unverified",
    candidates: () => [
      { path: path.join(HOME(), ".droid", "config.json"), note: "đường dẫn cũ của stali-cli", legacy: true },
    ],
    note: "Droid CLI không có trên npm công khai → CHƯA xác minh được",
  },
  cowork: {
    confidence: "unverified",
    candidates: () => [
      { path: path.join(HOME(), ".cowork", "settings.json"), note: "đường dẫn cũ của stali-cli", legacy: true },
    ],
    note: "npm `cowork` không có binary trùng tên → CHƯA xác minh",
  },
  jcode: {
    confidence: "unverified",
    candidates: () => [
      { path: path.join(HOME(), ".jcode", "config.toml"), note: "đường dẫn cũ của stali-cli", legacy: true },
    ],
    note: "npm `jcode` là package khác (0.0.0) → CHƯA xác minh",
  },
};

export function hasPathSpec(toolId: string): boolean {
  return Boolean(SPECS[toolId]);
}

/**
 * Chọn đường dẫn cấu hình cho tool:
 *  1. Nếu một trong các đường dẫn ứng viên ĐÃ TỒN TẠI → dùng nó (tôn trọng
 *     cấu hình người dùng đang có, kể cả đường dẫn cũ).
 *  2. Nếu chưa có gì → dùng ứng viên ĐẦU TIÊN (đường dẫn đúng nhất).
 */
export async function resolveToolConfigPath(toolId: string): Promise<ToolPathInfo | null> {
  const spec = SPECS[toolId];
  if (!spec) return null;

  const candidates = spec.candidates();
  const preferred = candidates.filter((c) => !c.legacy);
  const pool = preferred.length > 0 ? preferred : candidates;

  // 1. Ưu tiên ứng viên ĐÚNG đang tồn tại trên máy.
  // 2. Nếu chưa có gì, chọn ứng viên ĐÚNG đầu tiên (để tạo mới đúng chỗ).
  // KHÔNG bao giờ chọn đường dẫn legacy chỉ vì nó tồn tại.
  let chosen = pool[0]?.path ?? candidates[0]?.path ?? "";
  let found = false;
  let note = spec.note;

  for (const c of pool) {
    if (await pathExists(c.path)) {
      chosen = c.path;
      found = true;
      break;
    }
  }

  if (!found) {
    const legacyExists = candidates.some((c) => c.legacy);
    if (legacyExists && preferred.length > 0) {
      note =
        (spec.note ? spec.note + " " : "") +
        `Lưu ý: còn file cũ ở đường dẫn SAI do bản stali-cli trước tạo ra — sẽ ghi vào đường dẫn đúng ở trên.`;
    }
  }

  return {
    toolId,
    chosen,
    exists: found,
    confidence: spec.confidence,
    candidates,
    note,
  };
}

/** Thông tin đường dẫn cho mọi tool có định nghĩa. */
export async function resolveAllToolPaths(): Promise<ToolPathInfo[]> {
  const ids = Object.keys(SPECS);
  const out: ToolPathInfo[] = [];
  for (const id of ids) {
    const info = await resolveToolConfigPath(id);
    if (info) out.push(info);
  }
  return out;
}

/**
 * Đường dẫn của extension VS Code nếu đã cài (dùng để chỉ đúng thư mục
 * globalStorage thay vì đoán).
 */
export async function resolveVscodeExtensionPath(
  toolId: string
): Promise<string | null> {
  const hit = await findVscodeExtensionDir(toolId);
  return hit?.dir ?? null;
}
