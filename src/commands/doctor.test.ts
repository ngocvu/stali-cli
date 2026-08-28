import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import { buildDoctorJsonOutput, combinedDoctorHash } from "../commands/doctor";

describe("doctor unified JSON", () => {
  test("buildDoctorJsonOutput có tools + plugins + meta", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-doc-json-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      const payload = await buildDoctorJsonOutput();
      expect(payload.meta).toBeDefined();
      expect(payload.meta.modelsEndpoint).toContain("/v1/models");
      expect(Array.isArray(payload.tools)).toBe(true);
      expect(Array.isArray(payload.plugins)).toBe(true);
      expect(payload.meta.toolsTotal).toBe(payload.tools.length);
      expect(payload.meta.pluginsTotal).toBe(payload.plugins.length);
      const hash = combinedDoctorHash(payload);
      expect(typeof hash).toBe("string");
      expect(hash).toContain("#");
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
