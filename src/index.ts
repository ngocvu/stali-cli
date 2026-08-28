import { resolveCliMode } from "./cli-route";
import { VERSION } from "./version";

const earlyArgs = process.argv.slice(2);
if (
  earlyArgs.length === 1 &&
  (earlyArgs[0] === "--version" || earlyArgs[0] === "-V")
) {
  console.log(VERSION);
  process.exit(0);
}

const mode = resolveCliMode(process.argv);

if (mode === "wizard") {
  await import("./wizard-cli");
} else {
  await import("./subcommand-cli");
}
