import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import {
  ADVANCED_COMMANDS,
  applyCommandVisibility,
  USER_VISIBLE_COMMANDS,
} from "./help-format";

describe("help-format", () => {
  test("USER và ADVANCED không trùng", () => {
    for (const name of USER_VISIBLE_COMMANDS) {
      expect(ADVANCED_COMMANDS.has(name)).toBe(false);
    }
  });

  test("applyCommandVisibility ẩn bench khỏi help", () => {
    const prev = process.env.STALI_HELP_FULL;
    delete process.env.STALI_HELP_FULL;
    const program = new Command();
    program.command("setup").description("setup");
    program.command("bench").description("bench");
    applyCommandVisibility(program);
    const bench = program.commands.find((c) => c.name() === "bench") as
      | (Command & { _hidden?: boolean })
      | undefined;
    const setup = program.commands.find((c) => c.name() === "setup") as
      | (Command & { _hidden?: boolean })
      | undefined;
    expect(bench?._hidden).toBe(true);
    expect(setup?._hidden).toBeFalsy();
    const help = (() => {
      const chunks: string[] = [];
      program.configureOutput({
        writeOut: (s) => chunks.push(s),
        writeErr: () => {},
      });
      program.outputHelp();
      return chunks.join("");
    })();
    expect(help).not.toMatch(/^\s+bench\s/m);
    if (prev === undefined) delete process.env.STALI_HELP_FULL;
    else process.env.STALI_HELP_FULL = prev;
  });
});
