export type Locale = "vi" | "en";

const MESSAGES = {
  vi: {
    check_title: "✅ STALI CHECK",
    check_ok: "✓ OK",
    check_fail: "✗ Cần xử lý",
    init_title: "🚀 STALI INIT",
    init_done: "Hoàn tất khởi tạo stali-cli",
    init_auth_ok: "Đã lưu API key",
    init_configure: "Đang cấu hình 11 tool…",
    init_skip_configure: "Bỏ qua configure-all",
    update_latest: "✅ Đã dùng phiên bản mới nhất",
    update_available: "Có bản mới — chạy: stali update",
    doctor_watch_hint: "doctor --watch — Ctrl+C thoát",
    doctor_changed: "⚠️  Thay đổi cấu hình phát hiện!",
    plugins_empty: "Không có plugin tùy chỉnh (~/.stali/plugins.json)",
    plugins_title: "🔌 STALI PLUGINS",
    missing_key: "Thiếu API key. Dùng -k hoặc: stali auth login -k sk-stali-...",
  },
  en: {
    check_title: "✅ STALI CHECK",
    check_ok: "✓ OK",
    check_fail: "✗ Action required",
    init_title: "🚀 STALI INIT",
    init_done: "stali-cli init complete",
    init_auth_ok: "API key saved",
    init_configure: "Configuring 11 tools…",
    init_skip_configure: "Skipped configure-all",
    update_latest: "✅ Already on latest version",
    update_available: "Update available — run: stali update",
    doctor_watch_hint: "doctor --watch — Ctrl+C to exit",
    doctor_changed: "⚠️  Configuration change detected!",
    plugins_empty: "No custom plugins (~/.stali/plugins.json)",
    plugins_title: "🔌 STALI PLUGINS",
    missing_key: "Missing API key. Use -k or: stali auth login -k sk-stali-...",
  },
} as const;

export type MessageKey = keyof typeof MESSAGES.vi;

let currentLocale: Locale = "vi";

export function resolveLocale(input?: string): Locale {
  const raw = (input || process.env.STALI_LANG || "vi").trim().toLowerCase();
  if (raw.startsWith("en")) return "en";
  return "vi";
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: MessageKey): string {
  return MESSAGES[currentLocale][key] ?? MESSAGES.vi[key];
}
