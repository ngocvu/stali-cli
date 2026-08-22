import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { runUninstall } from "../services/uninstall";

describe("runUninstall", () => {
  test("xóa wrapper trong temp HOME", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "stali-uninstall-"));
    const staliHome = path.join(tmp, ".stali");
    const binDir = path.join(staliHome, "bin");
    await fs.mkdir(binDir, { recursive: true });
    const shim = path.join(binDir, "stali");
    await fs.writeFile(shim, "#!/bin/sh\n");

    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = staliHome;
    try {
      const result = await runUninstall({ keepConfig: true, keepSource: true });
      expect(result.success).toBe(true);
      expect(result.removed).toContain(shim);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
