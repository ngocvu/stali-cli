import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { verifyDistChecksums } from "./checksum-verify";

describe("verifyDistChecksums", () => {
  test("pass khi file khớp manifest", async () => {
    const root = path.join(os.tmpdir(), `stali-chk-${Date.now()}`);
    const content = "hello";
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    await fs.mkdir(path.join(root, "dist"), { recursive: true });
    await fs.writeFile(path.join(root, "dist", "index.js"), content);
    await fs.writeFile(
      path.join(root, "dist", "checksums.json"),
      JSON.stringify({ version: "1.0.0", files: { "dist/index.js": hash } })
    );
    const r = await verifyDistChecksums(root);
    expect(r.ok).toBe(true);
    expect(r.checked).toBe(1);
    await fs.rm(root, { recursive: true, force: true });
  });
});
