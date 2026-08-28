/** Subcommand names (không gồm flags). */
export const STALI_SUBCOMMANDS = new Set([
  "paths",
  "tools",
  "init",
  "setup",
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
]);

/** Subcommand chỉ định mở wizard Ink — route tới wizard-cli (không bundle React). */
export const WIZARD_SUBCOMMAND = "wizard";

export type CliMode = "wizard" | "subcommand";

function takesValue(flag: string): boolean {
  return flag === "-k" || flag === "--key" || flag === "--lang" || flag === "-i" || flag === "--interval";
}

/**
 * Wizard: không args, hoặc chỉ global flags (-k, --lang).
 * Subcommand: có tên lệnh hoặc --reset/--logout/--models.
 */
export function resolveCliMode(argv: string[]): CliMode {
  const args = argv.slice(2);
  if (args.length === 0) return "wizard";

  if (args.includes("--reset") || args.includes("--logout") || args.includes("-r")) {
    return "subcommand";
  }
  if (args.includes("--models")) {
    return "subcommand";
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      if (takesValue(arg) && i + 1 < args.length) i++;
      continue;
    }
    if (arg === WIZARD_SUBCOMMAND) return "wizard";
    if (STALI_SUBCOMMANDS.has(arg)) return "subcommand";
  }

  return "wizard";
}
