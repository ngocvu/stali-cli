#!/usr/bin/env bun
import { Command } from "commander";
import { registerCommands } from "./commands/register";

const program = new Command();
registerCommands(program, { attachWizardAction: false, includeWizardSubcommand: false });
program.parse(process.argv);
