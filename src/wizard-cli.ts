#!/usr/bin/env bun
import { Command } from "commander";
import { registerCommands } from "./commands/register";
import { attachWizardDefaultAction } from "./commands/wizard-register";

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
registerCommands(program);
attachWizardDefaultAction(program);
program.parse(normalizeWizardArgv(process.argv));
