import { resolveCliMode } from "./cli-route";

const mode = resolveCliMode(process.argv);

if (mode === "wizard") {
  await import("./wizard-cli");
} else {
  await import("./subcommand-cli");
}
