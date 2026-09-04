import { glyphs } from "./theme";

export type WizardStep =
  | "token"
  | "menu"
  | "advanced"
  | "pricing"
  | "doctor"
  | "configure-all"
  | "install"
  | "gateway"
  | "gateway-plan"
  | "plugins"
  | "plugin-preview"
  | "plugin-suggest"
  | "app"
  | "tool-detail"
  | "model"
  | "manual-model"
  | "context"
  | "manual-context"
  | "review"
  | "done";

export type KeyHint = { keys: string; label: string };

export const HINTS = {
  menu: [
    { keys: "↑↓/jk", label: "Di chuyển" },
    { keys: "Enter", label: "Chọn" },
    { keys: "Ctrl+C", label: "Thoát" },
  ],
  select: [
    { keys: "↑↓/jk", label: "Di chuyển" },
    { keys: "Enter", label: "Chọn" },
    { keys: "Esc", label: "Quay lại" },
    { keys: "Ctrl+C", label: "Thoát" },
  ],
  token: [
    { keys: "Enter", label: "Xác nhận" },
    { keys: "Tab", label: "Hiện/ẩn" },
    { keys: "Esc", label: "Quay lại" },
    { keys: "Ctrl+C", label: "Thoát" },
  ],
  tokenFirst: [
    { keys: "Enter", label: "Xác nhận" },
    { keys: "Tab", label: "Hiện/ẩn" },
    { keys: "Ctrl+C", label: "Thoát" },
  ],
  input: [
    { keys: "Enter", label: "Lưu" },
    { keys: "Esc", label: "Hủy" },
    { keys: "Ctrl+C", label: "Thoát" },
  ],
  model: [
    { keys: "↑↓", label: "Chọn" },
    { keys: "←→", label: "Trang" },
    { keys: "M", label: "Thủ công" },
    { keys: "Enter", label: "Chọn" },
    { keys: "Esc", label: "Quay lại" },
  ],
  pricing: [
    { keys: "↑↓", label: "Trang" },
    { keys: "Enter/Esc", label: "Về menu" },
    { keys: "Ctrl+C", label: "Thoát" },
  ],
  form: [
    { keys: "↑↓", label: "Hàng" },
    { keys: "←→/Tab", label: "Ô" },
    { keys: "Enter", label: "Chọn" },
    { keys: "Esc", label: "Quay lại" },
  ],
  confirm: [
    { keys: "↑↓/jk", label: "Di chuyển" },
    { keys: "Enter", label: "Xác nhận" },
    { keys: "Esc", label: "Quay lại" },
    { keys: "Ctrl+C", label: "Thoát" },
  ],
  done: [
    { keys: "↑↓/jk", label: "Di chuyển" },
    { keys: "Enter", label: "Chọn" },
    { keys: "Esc", label: "Về menu" },
    { keys: "Ctrl+C", label: "Thoát" },
  ],
} as const satisfies Record<string, KeyHint[]>;

export const CONFIGURE_STEPS = [
  { id: "app", label: "Chọn App" },
  { id: "config", label: "Cấu hình" },
  { id: "review", label: "Xác nhận" },
] as const;

const CONFIGURE_FLOW = new Set<WizardStep>([
  "app",
  "tool-detail",
  "model",
  "manual-model",
  "context",
  "manual-context",
  "review",
]);

export function isConfigureFlow(step: WizardStep): boolean {
  return CONFIGURE_FLOW.has(step);
}

export function configureStepIndex(step: WizardStep): number {
  if (step === "app") return 0;
  if (step === "review") return 2;
  if (CONFIGURE_FLOW.has(step)) return 1;
  return 0;
}

export function hintsForStep(step: WizardStep, tokenCanGoBack = false): KeyHint[] {
  switch (step) {
    case "token":
      return tokenCanGoBack ? HINTS.token : HINTS.tokenFirst;
    case "menu":
      return HINTS.menu;
    case "advanced":
      return HINTS.select;
    case "model":
      return HINTS.model;
    case "pricing":
      return HINTS.pricing;
    case "manual-model":
    case "manual-context":
      return HINTS.input;
    case "tool-detail":
      return HINTS.form;
    case "review":
    case "plugin-preview":
      return HINTS.confirm;
    case "done":
      return HINTS.done;
    default:
      return HINTS.select;
  }
}

export function formatHints(hints: KeyHint[], compact = false): string {
  const sep = compact ? " · " : ` ${glyphs.bullet} `;
  return hints.map((h) => `[${h.keys}] ${h.label}`).join(sep);
}

export const LOADING = {
  boot: "Đang đọc cấu hình…",
  auth: "Đang xác thực token với Stali API…",
  doctor: "Đang quét tools, plugins và gateway…",
  fix: "Đang sửa cấu hình…",
  gateway: "Đang quét / cài gateway…",
  gatewayPlan: "Đang lập kế hoạch gateway…",
  update: "Đang cập nhật stali-cli…",
  completion: "Đang cài shell completion…",
  batch: "Đang cấu hình hàng loạt…",
  apply: "Đang ghi cấu hình…",
  plugins: "Đang xử lý plugins…",
  install: "Đang xử lý cài đặt…",
  models: "Đang tải danh sách model…",
} as const;
