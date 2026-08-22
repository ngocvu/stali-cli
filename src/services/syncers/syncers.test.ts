import { describe, expect, test } from "bun:test";
import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const SYNCER_DIR = import.meta.dir;
const TEST_KEY = "sk-stali-test-key-0123456789012345678901234567890";

const TOOL_CHECKS: Array<{
  toolId: string;
  relPath: string;
  needles: string[];
  model: string;
}> = [
  { toolId: "openclaw", relPath: ".openclaw/config.json", needles: ["api.stali.vn"], model: "claude-fable-5" },
  { toolId: "deepseek-tui", relPath: ".deepseek/config.toml", needles: ["api.stali.vn"], model: "deepseek-v4-flash" },
  { toolId: "qwen", relPath: ".qwen/settings.json", needles: ["api.stali.vn"], model: "stali/qwen3-codex" },
  { toolId: "opencode", relPath: ".opencode/config.json", needles: ["stali"], model: "gpt-5.6-sol" },
  { toolId: "kilo", relPath: ".kilo/config.json", needles: ["api.stali.vn"], model: "claude-fable-5" },
  { toolId: "droid", relPath: ".droid/config.json", needles: ["api.stali.vn"], model: "claude-fable-5" },
  { toolId: "cline", relPath: ".vscode/cline_settings.json", needles: ["api.stali.vn"], model: "claude-fable-5" },
  { toolId: "roo", relPath: ".vscode/roo_settings.json", needles: ["api.stali.vn"], model: "claude-fable-5" },
  { toolId: "grok-build", relPath: ".grok/config.toml", needles: ["api.stali.vn"], model: "grok-4.6" },
  { toolId: "cowork", relPath: ".cowork/settings.json", needles: ["api.stali.vn"], model: "gpt-5.6-sol" },
  { toolId: "jcode", relPath: ".jcode/config.toml", needles: ["api.stali.vn"], model: "claude-opus-5" },
  { toolId: "claude", relPath: ".claude/settings.json", needles: ["api.stali.vn"], model: "claude-fable-5" },
  { toolId: "codex", relPath: ".codex/config.toml", needles: ["stali"], model: "req/gpt-5.6-sol" },
];

function runSyncInHome(home: string, toolId: string, model: string) {
  const code = `
    const { syncTool } = await import("./index.ts");
    const r = await syncTool(${JSON.stringify(toolId)}, ${JSON.stringify(TEST_KEY)}, ${JSON.stringify(model)});
    if (!r.success) {
      console.error(r.message, r.error);
      process.exit(1);
    }
  `;
  return spawnSync("bun", ["-e", code], {
    cwd: SYNCER_DIR,
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

describe("syncTool patch 13 tools (isolated HOME)", () => {
  for (const { toolId, relPath, needles, model } of TOOL_CHECKS) {
    test(`configure ${toolId} → ${relPath}`, async () => {
      const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "stali-syncer-"));
      try {
        const r = runSyncInHome(tmpHome, toolId, model);
        expect(r.status).toBe(0);

        const content = await fs.readFile(path.join(tmpHome, relPath), "utf8");
        for (const needle of needles) {
          expect(content.includes(needle)).toBe(true);
        }
      } finally {
        await fs.rm(tmpHome, { recursive: true, force: true });
      }
    });
  }
});

describe("getToolSyncStatus after patch", () => {
  test("detects openclaw", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "stali-status-"));
    try {
      runSyncInHome(tmpHome, "openclaw", "claude-fable-5");
      const code = `
        const { getToolSyncStatus } = await import("./index.ts");
        const s = await getToolSyncStatus("openclaw");
        console.log(JSON.stringify(s));
      `;
      const r = spawnSync("bun", ["-e", code], {
        cwd: SYNCER_DIR,
        encoding: "utf8",
        env: { ...process.env, HOME: tmpHome, USERPROFILE: tmpHome },
      });
      expect(r.status).toBe(0);
      const status = JSON.parse(r.stdout.trim());
      expect(status.configured).toBe(true);
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });
});
