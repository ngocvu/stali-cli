#!/usr/bin/env bun
import { Command } from "commander";
import { registerCommands } from "./commands/register";

/** `stali wizard` được router tới wizard-cli — bỏ token thừa trước khi parse. */
function normalizeWizardArgv(argv: string[]): string[] {
  const out = [...argv];
  const sub = out[2];
  if (sub === "wizard") {
    out.splice(2, 1);
  }
  return out;
}

const program = new Command();
registerCommands(program, { attachWizardAction: true, includeWizardSubcommand: false });
program.parse(normalizeWizardArgv(process.argv));
