/** Visual tokens for the Ink TUI — pastel, compact, Windows-safe fallbacks. */

export const BRAND = "#EE202E";

export const colors = {
  brand: BRAND,
  accent: "cyan",
  success: "green",
  warning: "yellow",
  error: "red",
  info: "cyan",
  muted: "gray",
  text: "white",
} as const;

export type Tone = "success" | "warning" | "error" | "info" | "muted" | "neutral";

export const toneColor: Record<Tone, string> = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  muted: colors.muted,
  neutral: colors.text,
};

const UNICODE_OK = (() => {
  if (process.env.STALI_ASCII === "1") return false;
  if (process.env.TERM === "linux" || process.env.TERM === "dumb") return false;
  if (process.platform !== "win32") return true;
  return Boolean(
    process.env.WT_SESSION ||
      process.env.TERMINUS_SUBLIME ||
      process.env.ConEmuANSI === "ON" ||
      process.env.TERM_PROGRAM === "vscode" ||
      process.env.TERM_PROGRAM === "Terminus-Sublime" ||
      process.env.TERM === "xterm-256color" ||
      process.env.TERM === "alacritty" ||
      process.env.TERMINAL_EMULATOR === "JetBrains-JediTerm"
  );
})();

export function supportsUnicode(): boolean {
  return UNICODE_OK;
}

export type BorderStyle = "round" | "classic";

export function getBorderStyle(): BorderStyle {
  return UNICODE_OK ? "round" : "classic";
}

export const glyphs = UNICODE_OK
  ? {
      pointer: "❯",
      spark: "✦",
      check: "✔",
      cross: "✖",
      warn: "!",
      info: "ℹ",
      dotOn: "●",
      dotOff: "○",
      ellipsis: "…",
      bullet: "•",
      arrow: "→",
      line: "─",
    }
  : {
      pointer: ">",
      spark: "*",
      check: "+",
      cross: "x",
      warn: "!",
      info: "i",
      dotOn: "*",
      dotOff: "o",
      ellipsis: "...",
      bullet: "-",
      arrow: "->",
      line: "-",
    };

export const spinnerType = UNICODE_OK ? ("dots" as const) : ("line" as const);

export const COMPACT_COLUMNS = 64;
export const NARROW_COLUMNS = 88;

export function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  const mark = glyphs.ellipsis;
  if (max <= mark.length) return text.slice(0, max);
  return text.slice(0, max - mark.length) + mark;
}

const SECRET_KEY = /(token|key|auth|secret|password|authorization)/i;

export function isSecretKey(path: string): boolean {
  const leaf = path.split(".").pop() || path;
  return SECRET_KEY.test(leaf);
}

export type ConfigRow = {
  key: string;
  value: string;
  secret?: boolean;
};

export function flattenConfigRows(
  value: unknown,
  prefix = "",
  depth = 0,
  maxRows = 24
): ConfigRow[] {
  const rows: ConfigRow[] = [];
  collectRows(value, prefix, depth, rows, maxRows);
  return rows;
}

function collectRows(
  value: unknown,
  prefix: string,
  depth: number,
  rows: ConfigRow[],
  maxRows: number
): void {
  if (rows.length >= maxRows) return;
  if (depth > 4) {
    rows.push({ key: prefix || "(root)", value: glyphs.ellipsis });
    return;
  }
  if (value === null || value === undefined) {
    if (prefix) rows.push({ key: prefix, value: "—" });
    return;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const secret = isSecretKey(prefix);
    rows.push({ key: prefix, value: String(value), secret });
    return;
  }
  if (Array.isArray(value)) {
    rows.push({
      key: prefix,
      value: value.length === 0 ? "[]" : value.map((v) => String(v)).join(", "),
    });
    return;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      if (prefix) rows.push({ key: prefix, value: "{}" });
      return;
    }
    for (const [k, v] of entries) {
      if (rows.length >= maxRows) {
        rows.push({ key: glyphs.ellipsis, value: "" });
        return;
      }
      const path = prefix ? `${prefix}.${k}` : k;
      collectRows(v, path, depth + 1, rows, maxRows);
    }
  }
}

export function maskPretty(token: string): string {
  const t = token.trim();
  if (!t) return "";
  const bullet = UNICODE_OK ? "•" : "*";
  const last = t.length > 4 ? t.slice(-4) : t;
  if (t.startsWith("sk-stali-") && t.length > 16) {
    return `sk-stali-${bullet.repeat(8)}${last}`;
  }
  if (t.length <= 8) return bullet.repeat(Math.max(4, t.length));
  return `${t.slice(0, 3)}${bullet.repeat(8)}${last}`;
}

export const maskChar = UNICODE_OK ? "•" : "*";
