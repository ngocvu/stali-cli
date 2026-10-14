/**
 * Danh mục lệnh của stali-cli — nguồn chân lý DUY NHẤT cho:
 *  - `stali help` / `stali --help` (gợi ý theo nhóm, không cần mạng)
 *  - gợi ý khi gõ sai lệnh ("có phải bạn muốn…?")
 *
 * Trước đây `stali help` phải TẢI file hướng dẫn từ GitHub rồi mới in
 * (chậm, hỏng khi offline). Danh mục này nằm ngay trong binary.
 */

export type CommandGroup =
  | "bat-dau"
  | "kiem-tra"
  | "cau-hinh"
  | "nang-cao"
  | "bao-tri";

export interface CommandDoc {
  /** Tên lệnh (không gồm cờ). */
  name: string;
  /** Câu mô tả ngắn, tiếng Việt. */
  summary: string;
  /** Vài ví dụ thực dụng. */
  examples?: string[];
  group: CommandGroup;
  /** Ẩn khỏi `stali help` gọn (vẫn hiện ở `stali help advanced`). */
  advanced?: boolean;
  /** Tên khác trỏ về cùng chức năng. */
  aliases?: string[];
}

export const COMMAND_GROUPS: Record<CommandGroup, string> = {
  "bat-dau": "🚀 Bắt đầu",
  "kiem-tra": "🩺 Kiểm tra",
  "cau-hinh": "⚙️  Cấu hình",
  "nang-cao": "🔧 Nâng cao",
  "bao-tri": "🧹 Bảo trì",
};

/** Thứ tự hiển thị nhóm. */
export const GROUP_ORDER: CommandGroup[] = [
  "bat-dau",
  "kiem-tra",
  "cau-hinh",
  "nang-cao",
  "bao-tri",
];

export const COMMANDS: CommandDoc[] = [
  {
    name: "setup",
    aliases: ["onboard"],
    summary: "Lệnh nhanh nhất: lưu API key + cài gateway cho app đang dùng + kiểm tra",
    examples: ["stali -k sk-stali-xxxx", "stali setup -k sk-stali-xxxx", "stali setup -k ... --json"],
    group: "bat-dau",
  },
  {
    name: "status",
    aliases: ["ready"],
    summary: "Xem nhanh: đã có key chưa, bao nhiêu app đã trỏ Stali",
    examples: ["stali status", "stali ready --json"],
    group: "kiem-tra",
  },
  {
    name: "scan",
    summary: "Quét máy xem đang dùng những app AI nào",
    examples: ["stali scan", "stali scan --json"],
    group: "kiem-tra",
  },
  {
    name: "check",
    summary: "Kiểm tra setup; --strict để dùng trong CI (exit 1 nếu chưa xong)",
    examples: ["stali check", "stali check --strict"],
    group: "kiem-tra",
  },
  {
    name: "doctor",
    summary: "Chẩn đoán chi tiết 13 tool; --fix để sửa tool chưa trỏ Stali",
    examples: ["stali doctor", "stali doctor --fix -k sk-stali-xxxx", "stali doctor --json"],
    group: "kiem-tra",
  },
  {
    name: "info",
    summary: "Thông tin CLI: phiên bản, cách cài, trạng thái setup",
    examples: ["stali info", "stali info --json"],
    group: "kiem-tra",
  },
  {
    name: "configure",
    summary: "Cấu hình MỘT tool cụ thể (dùng --dry-run để xem trước)",
    examples: [
      "stali configure claude --dry-run -k sk-stali-xxxx",
      "stali configure codex -k sk-stali-xxxx",
    ],
    group: "cau-hinh",
  },
  {
    name: "configure-all",
    summary: "Cấu hình hàng loạt nhiều tool",
    examples: [
      "stali configure-all --installed-only -k sk-stali-xxxx",
      "stali configure-all --tools cline,roo -k sk-stali-xxxx",
    ],
    group: "cau-hinh",
  },
  {
    name: "tools",
    summary: "Liệt kê 13 tool hỗ trợ kèm đường dẫn file cấu hình",
    group: "cau-hinh",
  },
  {
    name: "export-env",
    summary: "In biến môi trường để tự dán vào shell/CI (không ghi file)",
    examples: ["stali export-env claude -k sk-stali-xxxx", "stali export-env codex -f json"],
    group: "cau-hinh",
  },
  {
    name: "config",
    summary: "Xem/đặt cấu hình CLI (ví dụ đổi base URL sang staging)",
    examples: ["stali config show", "stali config set base-url https://staging/v1"],
    group: "cau-hinh",
  },
  {
    name: "auth",
    summary: "Đăng nhập / xem trạng thái / đăng xuất API key",
    examples: ["stali auth login -k sk-stali-xxxx", "stali auth status"],
    group: "cau-hinh",
  },
  {
    name: "gateway",
    aliases: ["gw"],
    summary: "Cài Stali gateway cho app đã phát hiện (thay đổi sâu hơn configure)",
    examples: ["stali gw auto -k sk-stali-xxxx", "stali gateway plan"],
    group: "cau-hinh",
  },
  {
    name: "ls",
    summary: "Bảng giá model thời gian thực (cũng có: stali --models)",
    examples: ["stali ls", "stali ls -k sk-stali-xxxx", "stali --models"],
    group: "cau-hinh",
  },
  {
    name: "wizard",
    summary: "Giao diện menu tương tác (chạy khi gõ `stali` không tham số)",
    group: "nang-cao",
  },
  {
    name: "init",
    summary: "Khởi tạo đầy đủ (completion + kiểm tra phiên bản)",
    examples: ["stali init -k sk-stali-xxxx"],
    group: "nang-cao",
    advanced: true,
  },
  {
    name: "plugins",
    summary: "Tool tùy chỉnh của bạn (~/.stali/plugins.json)",
    examples: ["stali plugins --init", "stali plugins sync --preview --json"],
    group: "nang-cao",
    advanced: true,
  },
  {
    name: "completion",
    summary: "Cài autocomplete cho bash / zsh / fish",
    examples: ["stali completion install", "stali completion install --all"],
    group: "nang-cao",
    advanced: true,
  },
  {
    name: "guide",
    summary: "In hướng dẫn tại chỗ (offline)",
    examples: ["stali guide", "stali guide onboarding"],
    group: "nang-cao",
    advanced: true,
  },
  {
    name: "bench",
    summary: "Đo hiệu năng khởi động / setup",
    group: "nang-cao",
    advanced: true,
  },
  {
    name: "telemetry",
    summary: "Bật/tắt và xem telemetry ẩn danh (mặc định TẮT)",
    examples: ["stali telemetry status", "stali telemetry off"],
    group: "nang-cao",
    advanced: true,
  },
  {
    name: "update",
    summary: "Cập nhật stali-cli; --check chỉ kiểm tra phiên bản",
    examples: ["stali update --check", "stali update"],
    group: "bao-tri",
  },
  {
    name: "backups",
    summary: "Liệt kê các bản backup file cấu hình",
    examples: ["stali backups", "stali backups -t claude"],
    group: "bao-tri",
  },
  {
    name: "restore",
    summary: "Khôi phục file cấu hình từ backup gần nhất",
    examples: ["stali restore -t claude"],
    group: "bao-tri",
  },
  {
    name: "install",
    summary: "In kế hoạch cài đặt / gợi ý cách cài cho máy này",
    examples: ["stali install", "stali install --json"],
    group: "bao-tri",
    advanced: true,
  },
  {
    name: "paths",
    summary: "In các đường dẫn ~/.stali đang dùng",
    group: "bao-tri",
    advanced: true,
  },
  {
    name: "uninstall",
    summary: "Gỡ wrapper stali (không xoá config của bạn)",
    group: "bao-tri",
    advanced: true,
  },
  {
    name: "open",
    summary: "Mở nhanh dashboard/trang liên quan trong trình duyệt",
    examples: ["stali open keys"],
    group: "bao-tri",
    advanced: true,
  },
  {
    name: "user",
    summary: "In bảng tra cứu lệnh ngắn cho người dùng",
    group: "bao-tri",
    advanced: true,
  },
  {
    name: "help",
    summary: "Xem trợ giúp này; `stali help advanced` để xem toàn bộ lệnh",
    group: "bao-tri",
    advanced: true,
  },
];

/** Tập hợp mọi tên lệnh + alias (để phát hiện gõ sai). */
export function allCommandNames(): string[] {
  const out: string[] = [];
  for (const c of COMMANDS) {
    out.push(c.name, ...(c.aliases ?? []));
  }
  return out;
}

/** Khoảng cách Levenshtein (đủ nhanh cho vài chục lệnh). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Gợi ý lệnh gần đúng cho một token người dùng gõ sai.
 * Trả về tối đa `limit` tên lệnh, gần nhất trước.
 */
export function suggestCommands(input: string, limit = 3): string[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return [];
  const scored = allCommandNames()
    .map((name) => ({ name, distance: levenshtein(needle, name) }))
    // Ngưỡng: cho phép sai ~1/3 độ dài, tối thiểu 2 ký tự.
    .filter((s) => s.distance <= Math.max(2, Math.floor(needle.length / 3)))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
  return scored.slice(0, limit).map((s) => s.name);
}

export interface RenderHelpOptions {
  /** Hiện cả lệnh nâng cao (mặc định false). */
  advanced?: boolean;
  /** Chỉ in nhóm này. */
  group?: CommandGroup;
  colorize?: (s: string, style: "bold" | "dim" | "cyan") => string;
}

/** Render trợ giúp từ danh mục offline (không gọi mạng). */
export function renderCommandHelp(options?: RenderHelpOptions): string {
  const color =
    options?.colorize ??
    ((s: string) => s);
  const advanced = options?.advanced ?? false;
  const lines: string[] = [];

  lines.push(color("stali — CLI cấu hình Stali API cho các app AI", "bold"));
  lines.push("");
  lines.push(`${color("Cách nhanh nhất:", "bold")}  stali -k sk-stali-xxxx`);
  lines.push("");

  const groups = options?.group ? [options.group] : GROUP_ORDER;
  for (const g of groups) {
    const items = COMMANDS.filter(
      (c) => c.group === g && (advanced || !c.advanced)
    );
    if (items.length === 0) continue;
    lines.push(color(COMMAND_GROUPS[g], "cyan"));
    for (const c of items) {
      const aliases = c.aliases?.length ? color(` (${c.aliases.join(", ")})`, "dim") : "";
      lines.push(`  ${c.name.padEnd(14)}${aliases} ${c.summary}`);
      for (const ex of c.examples ?? []) {
        lines.push(color(`    $ ${ex}`, "dim"));
      }
    }
    lines.push("");
  }

  if (!advanced) {
    lines.push(color("Xem toàn bộ lệnh: stali help advanced", "dim"));
    lines.push(color("Gợi ý bắt đầu:    stali scan   →   stali setup -k sk-stali-xxxx", "dim"));
  }
  return lines.join("\n");
}
