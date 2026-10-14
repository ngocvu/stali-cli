/**
 * Subcommand names (không gồm flags).
 *
 * PHẢI khớp với các lệnh đăng ký trong `commands/register.ts` — lệch nhau sẽ
 * khiến lệnh rơi nhầm vào nhánh wizard (trước đây `models` nằm đây nhưng
 * KHÔNG hề được đăng ký → gõ `stali models` mở wizard Ink).
 * `wizard` cũng nằm đây để `hasExplicitCliCommand` nhận ra nó là lệnh tường minh.
 */
export const STALI_SUBCOMMANDS = new Set([
  "paths",
  "tools",
  "init",
  "setup",
  "onboard",
  "user",
  "help",
  "status",
  "ready",
  "scan",
  "plugins",
  "config",
  "check",
  "backups",
  "info",
  "doctor",
  "update",
  "gateway",
  "gw",
  "install",
  "bench",
  "telemetry",
  "configure",
  "configure-all",
  "export-env",
  "uninstall",
  "auth",
  "open",
  "guide",
  "restore",
  "completion",
  "ls",
  "wizard",
]);

/** Subcommand chỉ định mở wizard Ink — route tới wizard-cli (không bundle React). */
export const WIZARD_SUBCOMMAND = "wizard";

export type CliMode = "wizard" | "subcommand";

function takesValue(flag: string): boolean {
  return flag === "-k" || flag === "--key" || flag === "--lang" || flag === "-i" || flag === "--interval";
}

/** Global flags allowed on `stali -k KEY` fast-setup (không cần gõ `setup`). */
const KEY_SETUP_GLOBAL_FLAGS = new Set(["-k", "--key", "--lang", "-V", "--version", "-h", "--help"]);

function isKeySetupGlobalFlag(arg: string): boolean {
  if (KEY_SETUP_GLOBAL_FLAGS.has(arg)) return true;
  return arg.startsWith("--lang=");
}

/** Có subcommand hoặc `wizard` rõ ràng — không rewrite sang setup. */
export function hasExplicitCliCommand(args: string[]): boolean {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      if (takesValue(arg) && i + 1 < args.length) i++;
      continue;
    }
    if (arg === WIZARD_SUBCOMMAND || STALI_SUBCOMMANDS.has(arg)) return true;
  }
  return false;
}

/** `stali -k sk-stali-...` (chỉ global flags) → chạy `setup` thay wizard Ink. */
export function extractKeyForFastSetup(args: string[]): string | undefined {
  if (hasExplicitCliCommand(args)) return undefined;
  let key: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-k" || arg === "--key") {
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        key = next;
        i++;
      }
      continue;
    }
    if (isKeySetupGlobalFlag(arg)) continue;
    if (arg.startsWith("-")) return undefined;
    return undefined;
  }
  return key?.trim() || undefined;
}

/** Chèn `setup` vào argv khi user chỉ truyền `-k` (và global flags). */
export function rewriteArgvForKeySetup(argv: string[]): boolean {
  const args = argv.slice(2);
  const key = extractKeyForFastSetup(args);
  if (!key) return false;
  const next = [argv[0], argv[1], "setup", ...args];
  argv.length = 0;
  argv.push(...next);
  return true;
}

/**
 * Wizard: không args, hoặc chỉ global flags (-k, --lang).
 * Subcommand: có tên lệnh, --reset/--logout/--models, hoặc một từ LẠ.
 *
 * Vì sao từ lạ → subcommand: trước đây `stali hepl` (gõ sai) bị coi là
 * "không có lệnh" nên MỞ WIZARD Ink — người dùng tưởng CLI treo, và trong
 * môi trường không phải TTY thì nổ "Raw mode is not supported". Giờ đi vào
 * nhánh subcommand để in lỗi rõ ràng kèm gợi ý lệnh gần đúng.
 */
export function resolveCliMode(argv: string[]): CliMode {
  const args = argv.slice(2);
  if (args.length === 0) return "wizard";

  if (extractKeyForFastSetup(args)) return "subcommand";

  if (args.includes("--reset") || args.includes("--logout") || args.includes("-r")) {
    return "subcommand";
  }
  if (args.includes("--models")) {
    return "subcommand";
  }

  let sawUnknownWord = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      if (takesValue(arg) && i + 1 < args.length) i++;
      continue;
    }
    if (arg === WIZARD_SUBCOMMAND) return "wizard";
    if (STALI_SUBCOMMANDS.has(arg)) return "subcommand";
    // Từ đầu tiên không phải lệnh đã biết → lệnh gõ sai.
    sawUnknownWord = true;
    break;
  }

  // Có từ lạ → để nhánh subcommand báo lỗi + gợi ý.
  if (sawUnknownWord) return "subcommand";

  // Chỉ có global flags (vd `stali --help`) → wizard vẫn hợp lý.
  return "wizard";
}
