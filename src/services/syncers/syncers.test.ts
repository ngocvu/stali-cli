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
  // Đường dẫn dưới đây là đường dẫn ĐÚNG theo `resolveToolConfigPath`
  // (services/syncers/paths.ts), không phải đường dẫn cũ mà bản trước hardcode:
  //  - deepseek-tui -> `.config/deepseek-cli-nodejs/config.json` (JSON, không TOML)
  //  - opencode     -> `.config/opencode/config.json` (XDG, không ~/.opencode)
  //  - cline/roo/kilo -> `.config/Code/User/globalStorage/<publisher>.<name>/...`
  //    (extension VS Code; môi trường test không có IDE nào nên chọn VS Code mặc định)
  { toolId: "openclaw", relPath: ".openclaw/openclaw.json", needles: ["api.stali.vn", "models", "providers", "agents"], model: "" },
  { toolId: "deepseek-tui", relPath: ".config/deepseek-cli-nodejs/config.json", needles: ["api.stali.vn"], model: "deepseek-v4-flash" },
  { toolId: "qwen", relPath: ".qwen/settings.json", needles: ["api.stali.vn"], model: "stali/qwen3-codex" },
  { toolId: "opencode", relPath: ".config/opencode/config.json", needles: ["stali"], model: "gpt-5.6-sol" },
  { toolId: "kilo", relPath: ".config/Code/User/globalStorage/kilocode.kilo-code/kilo_settings.json", needles: ["api.stali.vn"], model: "" },
  { toolId: "droid", relPath: ".factory/settings.json", needles: ["api.stali.vn", "customModels", "generic-chat-completion-api"], model: "" },
  { toolId: "cline", relPath: ".config/Code/User/globalStorage/saoudrizwan.claude-dev/cline_settings.json", needles: ["api.stali.vn"], model: "" },
  { toolId: "roo", relPath: ".config/Code/User/globalStorage/rooveterinaryinc.roo-cline/roo_settings.json", needles: ["api.stali.vn"], model: "" },
  { toolId: "grok-build", relPath: ".grok/config.toml", needles: ["api.stali.vn", "model_providers", "api_base_url", "api_backend"], model: "grok-4.6" },
  { toolId: "cowork", relPath: ".cowork/settings.json", needles: ["api.stali.vn"], model: "gpt-5.6-sol" },
  { toolId: "jcode", relPath: ".jcode/config.toml", needles: ["api.stali.vn", "providers", "openai-compatible", "base_url"], model: "" },
  { toolId: "claude", relPath: ".claude/settings.json", needles: ["api.stali.vn"], model: "" },
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

describe("đường dẫn ghi khớp bộ dò paths.ts", () => {
  test("syncer ghi đúng đường dẫn resolveToolConfigPath quyết định (không dùng đường dẫn cũ)", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "stali-pathmatch-"));
    try {
      const code = `
        const { resolveToolConfigPath } = await import("./paths.ts");
        const { syncTool } = await import("./index.ts");
        const out = {};
        for (const id of ["claude","codex","qwen","opencode","deepseek-tui","kilo","cline","roo","openclaw","droid","grok-build","jcode"]) {
          const info = await resolveToolConfigPath(id);
          const r = await syncTool(id, ${JSON.stringify(TEST_KEY)}, "");
          out[id] = { expected: info?.chosen, actual: r.configPath };
        }
        console.log(JSON.stringify(out));
      `;
      const r = spawnSync("bun", ["-e", code], {
        cwd: SYNCER_DIR,
        encoding: "utf8",
        timeout: 20000,
        env: { ...process.env, HOME: tmpHome, USERPROFILE: tmpHome },
      });
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout.trim());
      for (const [id, v] of Object.entries<any>(out)) {
        expect(v.actual).toBe(v.expected);
        // TUYỆT ĐỐI không ghi vào đường dẫn cũ/sai
        expect(v.actual).not.toMatch(/\/\.vscode\/(cline|roo)_settings\.json$/);
        expect(v.actual).not.toMatch(/\/\.deepseek\/config\.toml$/);
        expect(v.actual).not.toMatch(/\/\.opencode\/config\.json$/);
        // Các đường dẫn cũ đã kiểm chứng là SAI — không bao giờ ghi vào
        expect(v.actual).not.toMatch(/\/\.openclaw\/config\.json$/);
        expect(v.actual).not.toMatch(/\/\.droid\/config\.json$/);
      }
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  }, 30000);
});
