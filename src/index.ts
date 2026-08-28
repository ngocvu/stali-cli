import { Command } from "commander";
import { registerCommands } from "./commands/register";

const program = new Command();
registerCommands(program);
program.parse(process.argv);
