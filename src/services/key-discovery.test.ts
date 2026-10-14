import { describe, expect, test } from "bun:test";
import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const SVC_DIR = import.meta.dir;
const KEY = "sk-stali-test-key-0123456789012345678901234567890";

/**
 * Kiểm tra key-discovery trong HOME riêng: dò key từ config của tool khi
 * ~/.stali/config.json chưa có. Đây là tình huống thật của người dùng
 * cấu hình bằng `stali configure` mà chưa `stali auth login`.
 */
function runDiscovery(home: string): { status: number | null; stdout: string } {
  const code = `
    const { discoverStaliKey, discoverAllStaliKeys } = await import("./key-discovery.ts");
    const one = await discoverStaliKey();
    const all = await discoverAllStaliKeys();
    console.log(JSON.stringify({ one, count: all.length }));
  `;
  // Xoá biến môi trường liên quan để test chỉ đo phần DÒ TỪ FILE.
  // (Máy thật có thể có ANTHROPIC_AUTH_TOKEN/OPENAI_API_KEY sẵn — đó là
  //  đường dự phòng hợp lệ, nhưng không phải thứ test này muốn đo.)
  const cleanEnv = { ...process.env, HOME: home, USERPROFILE: home };
  for (const k of ["STALI_API_KEY", "ANTHROPIC_AUTH_TOKEN", "OPENAI_API_KEY"]) {
    delete cleanEnv[k];
  }

  const r = spawnSync("bun", ["-e", code], {
    cwd: SVC_DIR,
    encoding: "utf8",
    timeout: 20000,
    env: cleanEnv,
  });
  return { status: r.status, stdout: r.stdout ?? "" };
}

async function tmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "stali-keydisc-"));
}

describe("key-discovery", () => {
  test("tìm key trong ~/.claude/settings.json khi chưa có config stali", async () => {
    const home = await tmpHome();
    try {
      await fs.mkdir(path.join(home, ".claude"), { recursive: true });
      await fs.writeFile(
        path.join(home, ".claude", "settings.json"),
        JSON.stringify({ env: { ANTHROPIC_AUTH_TOKEN: KEY } }),
        "utf8"
      );

      const r = runDiscovery(home);
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout.trim());
      expect(out.one).not.toBeNull();
      expect(out.one.key).toBe(KEY);
      expect(out.one.source).toContain("settings.json");
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("KHÔNG nhặt key của NCC khác (không đúng dạng sk-stali-)", async () => {
    const home = await tmpHome();
    try {
      await fs.mkdir(path.join(home, ".claude"), { recursive: true });
      await fs.writeFile(
        path.join(home, ".claude", "settings.json"),
        JSON.stringify({ env: { ANTHROPIC_AUTH_TOKEN: "sk-788ac4727c8e1ec89a1545d27847be96" } }),
        "utf8"
      );

      const r = runDiscovery(home);
      const out = JSON.parse(r.stdout.trim());
      // Key không đúng dạng stali → không trả về
      expect(out.one).toBeNull();
      expect(out.count).toBe(0);
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("ưu tiên ~/.stali/config.json khi có", async () => {
    const home = await tmpHome();
    try {
      const staliKey = "sk-stali-from-stali-config-0123456789";
      await fs.mkdir(path.join(home, ".stali"), { recursive: true });
      await fs.writeFile(
        path.join(home, ".stali", "config.json"),
        JSON.stringify({ apiKey: staliKey, baseUrl: "https://api.stali.vn/v1" }),
        "utf8"
      );
      await fs.mkdir(path.join(home, ".claude"), { recursive: true });
      await fs.writeFile(
        path.join(home, ".claude", "settings.json"),
        JSON.stringify({ env: { ANTHROPIC_AUTH_TOKEN: KEY } }),
        "utf8"
      );

      const r = runDiscovery(home);
      const out = JSON.parse(r.stdout.trim());
      expect(out.one.key).toBe(staliKey);
      expect(out.one.source).toContain("stali");
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  test("không có key nào → null, không ném lỗi", async () => {
    const home = await tmpHome();
    try {
      const r = runDiscovery(home);
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout.trim());
      expect(out.one).toBeNull();
      expect(out.count).toBe(0);
    } finally {
      await fs.rm(home, { recursive: true, force: true });
    }
  });
});
