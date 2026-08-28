import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import {
  buildDoctorJsonOutput,
  combinedDoctorHash,
  configuredScore,
  formatDoctorPrometheus,
  scopedDoctorHash,
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

  test("scopedDoctorHash tools-only không phụ thuộc plugins", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-hash-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      const full = await buildDoctorJsonOutput();
      const toolsOnly = await buildDoctorJsonOutput({ toolsOnly: true });
      const h1 = scopedDoctorHash(full, { toolsOnly: true });
      const h2 = scopedDoctorHash(toolsOnly, { toolsOnly: true });
      expect(h1).toBe(h2);
      expect(scopedDoctorHash(full, { pluginsOnly: true })).not.toBe(h1);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("configuredScore theo scope tools/plugins/full", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-score-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      const payload = await buildDoctorJsonOutput();
      const full = configuredScore(payload);
      const tools = configuredScore(payload, { toolsOnly: true });
      const plugins = configuredScore(payload, { pluginsOnly: true });
      expect(full).toBe(
        payload.tools.filter((s) => s.configuredForStali).length +
          payload.plugins.filter((p) => p.configuredForStali).length
      );
      expect(tools).toBe(payload.tools.filter((s) => s.configuredForStali).length);
      expect(plugins).toBe(payload.plugins.filter((p) => p.configuredForStali).length);
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });

  test("formatDoctorPrometheus emits gauge lines", async () => {
    const prev = process.env.STALI_HOME;
    const home = path.join(os.tmpdir(), `stali-prom-${Date.now()}`);
    process.env.STALI_HOME = home;
    try {
      const payload = await buildDoctorJsonOutput({ toolsOnly: true });
      const text = formatDoctorPrometheus(payload, { toolsOnly: true });
      expect(text).toContain("stali_doctor_configured{scope=\"tools\"}");
      expect(text).toContain("stali_doctor_tools_configured");
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
