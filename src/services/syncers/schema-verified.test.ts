import { describe, expect, test } from "bun:test";
import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const SYNCER_DIR = import.meta.dir;
const TEST_KEY = "sk-stali-test-key-0123456789012345678901234567890";

/**
 * Các test này khoá lại SCHEMA ĐÃ KIỂM CHỨNG cho 4 tool mà bản trước ghi sai
 * chỗ hoặc sai khoá. Mỗi khẳng định dưới đây đối chiếu với package/binary
 * thật của tool (xem ghi chú trong từng syncer).
 */
function runSyncInHome(home: string, toolId: string, model = "") {
  const code = `
    const { syncTool } = await import("./index.ts");
    const r = await syncTool(${JSON.stringify(toolId)}, ${JSON.stringify(TEST_KEY)}, ${JSON.stringify(model)});
    if (!r.success) { console.error(r.message, r.error); process.exit(1); }
    console.log(r.configPath);
  `;
  return spawnSync("bun", ["-e", code], {
    cwd: SYNCER_DIR,
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

async function tmpHome(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `stali-schema-${prefix}-`));
}

describe("schema đã kiểm chứng của tool", () => {
  test("openclaw: ghi models.providers.stali + agents.defaults.model.primary", async () => {
    const home = await tmpHome("openclaw");
    try {
      const r = runSyncInHome(home, "openclaw", "claude-fable-5");
      expect(r.status).toBe(0);
      const cfg = JSON.parse(
        await fs.readFile(path.join(home, ".openclaw", "openclaw.json"), "utf8")
      );
      const p = cfg.models.providers.stali;
      expect(p.baseUrl).toContain("api.stali.vn");
      expect(p.apiKey).toBe(TEST_KEY);
      // Stali phục vụ Chat Completions → adapter openai-completions.
      expect(p.api).toBe("openai-completions");
      expect(p.models[0].id).toBe("claude-fable-5");
      expect(cfg.agents.defaults.model.primary).toBe("stali/claude-fable-5");
      // KHÔNG được ghi schema cũ (env ANTHROPIC_*)
      expect(cfg.env).toBeUndefined();
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("droid: ghi customModels[] camelCase với provider generic-chat-completion-api", async () => {
    const home = await tmpHome("droid");
    try {
      const r = runSyncInHome(home, "droid", "claude-fable-5");
      expect(r.status).toBe(0);
      const cfg = JSON.parse(
        await fs.readFile(path.join(home, ".factory", "settings.json"), "utf8")
      );
      expect(Array.isArray(cfg.customModels)).toBe(true);
      const m = cfg.customModels[0];
      expect(m.model).toBe("claude-fable-5");
      expect(m.provider).toBe("generic-chat-completion-api");
      expect(m.baseUrl).toContain("api.stali.vn");
      expect(m.apiKey).toBe(TEST_KEY);
      // KHÔNG ghi schema cũ (provider.type/baseUrl)
      expect(cfg.provider).toBeUndefined();
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("droid: giữ custom model khác của người dùng", async () => {
    const home = await tmpHome("droid-keep");
    try {
      const dir = path.join(home, ".factory");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, "settings.json"),
        JSON.stringify({
          customModels: [{ model: "model-cua-toi", provider: "openai", baseUrl: "https://x", apiKey: "k" }],
          theme: "dark",
        })
      );
      const r = runSyncInHome(home, "droid", "claude-fable-5");
      expect(r.status).toBe(0);
      const cfg = JSON.parse(await fs.readFile(path.join(dir, "settings.json"), "utf8"));
      expect(cfg.customModels.map((m: any) => m.model).sort()).toEqual([
        "claude-fable-5",
        "model-cua-toi",
      ]);
      expect(cfg.theme).toBe("dark");
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("grok: ghi [model_providers.stali] + [models].default", async () => {
    const home = await tmpHome("grok");
    try {
      const r = runSyncInHome(home, "grok-build", "grok-4.6");
      expect(r.status).toBe(0);
      const text = await fs.readFile(path.join(home, ".grok", "config.toml"), "utf8");
      expect(text).toContain("[model_providers.stali]");
      expect(text).toContain("api_base_url");
      expect(text).toContain("api.stali.vn");
      expect(text).toContain('api_backend = "chat_completions"');
      expect(text).toContain("[models]");
      expect(text).toContain('default = "grok-4.6"');
      // KHÔNG ghi schema cũ (base_url phẳng)
      expect(text).not.toMatch(/^base_url = /m);
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("jcode: ghi [providers.stali] openai-compatible + [provider]", async () => {
    const home = await tmpHome("jcode");
    try {
      const r = runSyncInHome(home, "jcode", "claude-opus-5");
      expect(r.status).toBe(0);
      const text = await fs.readFile(path.join(home, ".jcode", "config.toml"), "utf8");
      expect(text).toContain("[provider]");
      expect(text).toContain('default_provider = "stali"');
      expect(text).toContain('default_model = "claude-opus-5"');
      expect(text).toContain("[providers.stali]");
      expect(text).toContain('type = "openai-compatible"');
      expect(text).toContain("api.stali.vn");
      // base_url phải nằm TRONG [providers.stali], không phải khoá phẳng cấp gốc
      const beforeProvider = text.split("[providers.stali]")[0];
      expect(beforeProvider).not.toMatch(/^base_url = /m);
      expect(text.split("[providers.stali]")[1]).toMatch(/base_url = /);
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });
});
