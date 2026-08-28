#!/usr/bin/env bun
import { Command } from "commander";
import { registerCommands } from "./commands/register";

const program = new Command();
registerCommands(program, { attachWizardAction: true });
program.parse(process.argv);
