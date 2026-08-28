import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { detectShellFromEnv, installCompletion, normalizeCompletionShell } from "./completion-install";

describe("completion-install", () => {
  test("normalizeCompletionShell", () => {
    expect(normalizeCompletionShell("fish")).toBe("fish");
    expect(normalizeCompletionShell("powershell")).toBeNull();
  });

  test("install fish completion (isolated HOME)", async () => {
    const tmp = path.join(os.tmpdir(), `stali-comp-${Date.now()}`);
    try {
      const result = await installCompletion("fish", tmp);
      expect(result.shell).toBe("fish");
      expect(["created", "updated"]).toContain(result.action);
      const content = await fs.readFile(result.path, "utf8");
      expect(content).toContain("__fish_seen_subcommand_from check");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  });

  test("detectShellFromEnv respects SHELL", () => {
    const prev = process.env.SHELL;
    process.env.SHELL = "/usr/bin/zsh";
    expect(detectShellFromEnv()).toBe("zsh");
    if (prev === undefined) delete process.env.SHELL;
    else process.env.SHELL = prev;
  });
});
