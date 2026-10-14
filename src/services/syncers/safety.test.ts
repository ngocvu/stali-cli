import { describe, expect, test } from "bun:test";
import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const SYNCER_DIR = import.meta.dir;
const TEST_KEY = "sk-stali-test-key-0123456789012345678901234567890";

/** Chạy syncTool trong HOME riêng, trả về stdout/stderr/status. */
function runSyncInHome(home: string, toolId: string, model = "") {
  const code = `
    const { syncTool } = await import("./index.ts");
    const r = await syncTool(${JSON.stringify(toolId)}, ${JSON.stringify(TEST_KEY)}, ${JSON.stringify(model)});
    console.log(JSON.stringify(r));
  `;
  return spawnSync("bun", ["-e", code], {
    cwd: SYNCER_DIR,
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

async function tmpHome(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `stali-safety-${prefix}-`));
}

describe("syncer an toàn với file cấu hình của người dùng", () => {
  test("claude: GIỮ chú thích và key lạ trong settings.json", async () => {
    const home = await tmpHome("claude");
    try {
      const settingsDir = path.join(home, ".claude");
      await fs.mkdir(settingsDir, { recursive: true });
      const settingsPath = path.join(settingsDir, "settings.json");
      await fs.writeFile(
        settingsPath,
        `{
  // chú thích của tôi
  "permissions": { "allow": ["Bash(git:*)"] },
  "env": {
    "MY_VAR": "giữ tôi", // quan trọng
    "ANTHROPIC_BASE_URL": "https://cũ.example"
  }
}
`,
        "utf8"
      );

      const r = runSyncInHome(home, "claude");
      expect(r.status).toBe(0);
      const result = JSON.parse(r.stdout.trim());
      expect(result.success).toBe(true);

      const out = await fs.readFile(settingsPath, "utf8");
      expect(out).toContain("// chú thích của tôi");
      expect(out).toContain("// quan trọng");
      expect(out).toContain("MY_VAR");
      expect(out).toContain("giữ tôi");
      expect(out).toContain("permissions");
      expect(out).toContain("api.stali.vn");
      expect(out).not.toContain("cũ.example");
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("claude: KHÔNG ghi đè settings.json hỏng", async () => {
    const home = await tmpHome("claude-broken");
    try {
      const settingsDir = path.join(home, ".claude");
      await fs.mkdir(settingsDir, { recursive: true });
      const settingsPath = path.join(settingsDir, "settings.json");
      const broken = `{ "env": { "ANTHROPIC_BASE_URL": "https://x" `;
      await fs.writeFile(settingsPath, broken, "utf8");

      const r = runSyncInHome(home, "claude");
      expect(r.status).toBe(0);
      const result = JSON.parse(r.stdout.trim());
      expect(result.success).toBe(false);
      expect(String(result.error)).toMatch(/hỏng|parse/i);

      // File phải còn NGUYÊN XI, không bị ghi đè
      expect(await fs.readFile(settingsPath, "utf8")).toBe(broken);
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("openclaw: KHÔNG ghi đè config.json hỏng", async () => {
    const home = await tmpHome("openclaw-broken");
    try {
      const dir = path.join(home, ".openclaw");
      await fs.mkdir(dir, { recursive: true });
      const cfg = path.join(dir, "config.json");
      const broken = `{"env": {`;
      await fs.writeFile(cfg, broken, "utf8");

      const r = runSyncInHome(home, "openclaw");
      const result = JSON.parse(r.stdout.trim());
      expect(result.success).toBe(false);
      expect(await fs.readFile(cfg, "utf8")).toBe(broken);
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("opencode: giữ provider khác của người dùng", async () => {
    const home = await tmpHome("opencode");
    try {
      const dir = path.join(home, ".opencode");
      await fs.mkdir(dir, { recursive: true });
      const cfg = path.join(dir, "config.json");
      await fs.writeFile(
        cfg,
        JSON.stringify(
          {
            provider: { anthropic: { options: { apiKey: "key-cua-toi" } } },
            theme: "dark",
          },
          null,
          2
        ) + "\n",
        "utf8"
      );

      const r = runSyncInHome(home, "opencode", "gpt-5.6-sol");
      const result = JSON.parse(r.stdout.trim());
      expect(result.success).toBe(true);

      const out = JSON.parse(await fs.readFile(cfg, "utf8"));
      expect(out.provider.stali.options.baseURL).toContain("api.stali.vn");
      expect(out.provider.anthropic.options.apiKey).toBe("key-cua-toi");
      expect(out.theme).toBe("dark");
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("backup được tạo với quyền 0600 và có giới hạn số bản", async () => {
    const home = await tmpHome("backup");
    try {
      const dir = path.join(home, ".openclaw");
      await fs.mkdir(dir, { recursive: true });
      const cfg = path.join(dir, "config.json");
      await fs.writeFile(cfg, "{}", "utf8");

      const keep = Number(process.env.STALI_BACKUP_KEEP || 10);
      const runs = Math.min(keep + 3, 8);
      for (let i = 0; i < runs; i++) {
        const r = runSyncInHome(home, "openclaw");
        expect(JSON.parse(r.stdout.trim()).success).toBe(true);
        // timestamp chỉ có độ phân giải 1 giây → đảm bảo tên file khác nhau
        await new Promise((res) => setTimeout(res, 1100));
      }

      const entries = await fs.readdir(dir);
      const backups = entries.filter((f) => f.startsWith("config.json.") && f.endsWith(".bak"));
      expect(backups.length).toBeLessThanOrEqual(keep);

      if (process.platform !== "win32" && backups.length > 0) {
        const st = await fs.stat(path.join(dir, backups[0]));
        expect(st.mode & 0o777).toBe(0o600);
      }
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  }, 30000);
});
