import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import {
  buildDoctorJsonOutput,
  combinedDoctorHash,
  toLegacyPluginsDoctorJson,
} from "../commands/doctor";

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

  test("buildDoctorJsonOutput --plugins-only bỏ qua tools", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-doc-plug-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      const payload = await buildDoctorJsonOutput({ pluginsOnly: true });
      expect(payload.tools).toHaveLength(0);
      expect(payload.meta.toolsTotal).toBe(0);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("buildDoctorJsonOutput --tools-only bỏ qua plugins", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-doc-tools-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      const payload = await buildDoctorJsonOutput({ toolsOnly: true });
      expect(payload.plugins).toHaveLength(0);
      expect(payload.meta.pluginsTotal).toBe(0);
      expect(payload.tools.length).toBeGreaterThan(0);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("toLegacyPluginsDoctorJson giữ shape plugins doctor cũ", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-legacy-doc-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      const payload = await buildDoctorJsonOutput({ pluginsOnly: true });
      const legacy = toLegacyPluginsDoctorJson(payload);
      expect(legacy.meta.pluginCount).toBe(payload.meta.pluginsTotal);
      expect(legacy.meta.preferCommand).toBe("stali doctor --plugins-only");
      expect(legacy.plugins).toEqual(payload.plugins);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
