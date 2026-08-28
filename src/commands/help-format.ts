import type { Command } from "commander";
import chalk from "chalk";
import { VERSION } from "../version";

/** Lệnh hiển thị trong `stali --help` (user-first). */
export const USER_VISIBLE_COMMANDS = new Set([
  "setup",
  "onboard",
  "user",
  "status",
  "ready",
  "check",
  "doctor",
  "gateway",
  "gw",
  "auth",
  "update",
  "help",
]);

/** Ẩn khỏi help mặc định — vẫn gọi được; xem `stali help advanced`. */
export const ADVANCED_COMMANDS = new Set([
  "bench",
  "telemetry",
  "completion",
  "restore",
  "backups",
  "paths",
  "configure",
  "configure-all",
  "export-env",
  "uninstall",
  "plugins",
  "init",
  "install",
  "open",
  "guide",
  "info",
  "config",
  "ls",
  "tools",
  "wizard",
]);

export function isFullHelpEnabled(): boolean {
  return process.env.STALI_HELP_FULL === "1";
}

/** Commander ẩn lệnh khỏi help qua `_hidden`, không phải property `hidden`. */
type CommanderWithHidden = Command & { _hidden?: boolean };

export function setCommandHelpHidden(cmd: Command, hidden: boolean): void {
  (cmd as CommanderWithHidden)._hidden = hidden;
}

export function applyCommandVisibility(program: Command): void {
  if (isFullHelpEnabled()) return;
  for (const cmd of program.commands) {
    const name = cmd.name();
    if (ADVANCED_COMMANDS.has(name) || !USER_VISIBLE_COMMANDS.has(name)) {
      setCommandHelpHidden(cmd, true);
    }
  }
}

export function printAdvancedHelpHint(): void {
  console.log(
    chalk.gray(
      "\nLệnh nâng cao (configure, plugins, bench, …): STALI_HELP_FULL=1 stali --help\n" +
        "Hoặc: stali help advanced\n"
    )
  );
}

export function formatCompactHelpFooter(): string {
  return chalk.cyan(
    `\nUser: stali -k sk-stali-...  ·  stali onboard  ·  stali status  ·  stali user\n` +
      chalk.gray(`v${VERSION}  ·  stali help advanced = toàn bộ lệnh\n`)
  );
}
