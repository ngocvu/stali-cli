import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  parseJsoncText,
  hasComments,
  setJsoncValue,
  deleteJsoncKey,
} from "./jsonc";
import { patchJsoncFile, readJsonFileDetailed } from "./file";

async function tmpFile(name: string, content?: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "stali-jsonc-"));
  const file = path.join(dir, name);
  if (content !== undefined) await fs.writeFile(file, content, "utf8");
  return file;
}

describe("jsonc", () => {
  test("parse chấp nhận chú thích và dấu phẩy thừa", () => {
    const text = `{
  // cấu hình của tôi
  "a": 1,
  "b": [1, 2,],
}`;
    const { data, errors } = parseJsoncText(text);
    expect(errors).toEqual([]);
    expect(data).toEqual({ a: 1, b: [1, 2] });
  });

  test("hasComments phân biệt chuỗi chứa // với chú thích thật", () => {
    expect(hasComments(`{"url": "https://api.stali.vn/v1"}`)).toBe(false);
    expect(hasComments(`{ // ghi chú\n "a": 1 }`)).toBe(true);
    expect(hasComments(`{ /* khối */ "a": 1 }`)).toBe(true);
    expect(hasComments(`{"path": "C:/tmp/*x*"}`)).toBe(false);
  });

  test("setJsoncValue chỉ đổi đúng giá trị lá, giữ chú thích", () => {
    const text = `{
  // giữ dòng này
  "env": {
    "ANTHROPIC_BASE_URL": "https://cũ.example" // đổi URL
  },
  "permissions": { "allow": ["Bash"] }
}`;
    const out = setJsoncValue(text, ["env", "ANTHROPIC_BASE_URL"], "https://api.stali.vn");
    expect(out).toContain("// giữ dòng này");
    expect(out).toContain("// đổi URL");
    expect(out).toContain("https://api.stali.vn");
    expect(out).toContain("permissions");
    expect(out).not.toContain("https://cũ.example");
  });

  test("deleteJsoncKey xoá khoá, giữ phần còn lại", () => {
    const text = `{\n  // note\n  "a": 1,\n  "b": 2\n}`;
    const out = deleteJsoncKey(text, ["b"]);
    expect(out).toContain("// note");
    expect(out).toContain('"a": 1');
    expect(out).not.toContain('"b"');
  });
});

describe("patchJsoncFile", () => {
  test("GIỮ NGUYÊN chú thích + key lạ của người dùng", async () => {
    const original = `{
  // Đừng xoá chú thích này
  "permissions": { "allow": ["Bash(git:*)"] },
  "env": {
    "MY_CUSTOM_VAR": "giữ tôi", // quan trọng
    "ANTHROPIC_BASE_URL": "https://cũ"
  },
  "statusLine": { "type": "command" }
}
`;
    const file = await tmpFile("settings.json", original);

    const ok = await patchJsoncFile(file, {
      set: [
        { path: ["env", "ANTHROPIC_BASE_URL"], value: "https://api.stali.vn" },
        { path: ["env", "ANTHROPIC_AUTH_TOKEN"], value: "sk-stali-test" },
        { path: ["hasCompletedOnboarding"], value: true },
      ],
      remove: [["env", "ANTHROPIC_API_KEY"]],
    });

    expect(ok).toBe(true);
    const out = await fs.readFile(file, "utf8");
    expect(out).toContain("// Đừng xoá chú thích này");
    expect(out).toContain("// quan trọng");
    expect(out).toContain("MY_CUSTOM_VAR");
    expect(out).toContain("giữ tôi");
    expect(out).toContain("permissions");
    expect(out).toContain("statusLine");
    expect(out).toContain("https://api.stali.vn");
    expect(out).toContain("sk-stali-test");
    expect(out).toContain("hasCompletedOnboarding");
    expect(out).not.toContain("https://cũ");
  });

  test("KHÔNG ghi đè file hỏng (trả false, file giữ nguyên)", async () => {
    const broken = `{ "env": { "ANTHROPIC_BASE_URL": "https://x" `; // thiếu ngoặc
    const file = await tmpFile("broken.json", broken);

    const ok = await patchJsoncFile(file, {
      set: [{ path: ["env", "ANTHROPIC_AUTH_TOKEN"], value: "sk-stali-test" }],
    });

    expect(ok).toBe(false);
    expect(await fs.readFile(file, "utf8")).toBe(broken);
  });

  test("tạo file mới khi chưa tồn tại", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "stali-jsonc-new-"));
    const file = path.join(dir, "nested", "config.json");

    const ok = await patchJsoncFile(file, {
      set: [{ path: ["env", "ANTHROPIC_BASE_URL"], value: "https://api.stali.vn" }],
    });

    expect(ok).toBe(true);
    const out = JSON.parse(await fs.readFile(file, "utf8"));
    expect(out.env.ANTHROPIC_BASE_URL).toBe("https://api.stali.vn");
  });

  test("xoá khoá không tồn tại không làm hỏng file", async () => {
    const file = await tmpFile("empty.json", "{}\n");
    const ok = await patchJsoncFile(file, {
      set: [{ path: ["a"], value: 1 }],
      remove: [["env", "ANTHROPIC_API_KEY"]],
    });
    expect(ok).toBe(true);
    expect(JSON.parse(await fs.readFile(file, "utf8"))).toEqual({ a: 1 });
  });

  test("giữ kiểu xuống dòng CRLF", async () => {
    const original = '{\r\n  "a": 1\r\n}\r\n';
    const file = await tmpFile("crlf.json", original);
    await patchJsoncFile(file, { set: [{ path: ["b"], value: 2 }] });
    const out = await fs.readFile(file, "utf8");
    expect(out).toContain("\r\n");
    expect(out).not.toMatch(/[^\r]\n/);
  });
});

describe("readJsonFileDetailed", () => {
  test("phân biệt không tồn tại / hỏng / hợp lệ", async () => {
    const missing = await readJsonFileDetailed(
      path.join(os.tmpdir(), `stali-missing-${Date.now()}.json`)
    );
    expect(missing.exists).toBe(false);
    expect(missing.corrupt).toBe(false);

    const badFile = await tmpFile("bad.json", "{ not json ");
    const bad = await readJsonFileDetailed(badFile);
    expect(bad.exists).toBe(true);
    expect(bad.corrupt).toBe(true);

    const goodFile = await tmpFile("good.json", '{"a":1}');
    const good = await readJsonFileDetailed(goodFile);
    expect(good.exists).toBe(true);
    expect(good.corrupt).toBe(false);
    expect(good.data).toEqual({ a: 1 });
  });
});
