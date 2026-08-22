import { describe, expect, test } from "bun:test";
import os from "os";
import path from "path";
import {
  getStaliBinDir,
  getStaliCliInstallDir,
  getStaliConfigPath,
  getStaliHome,
} from "./paths";

describe("paths constants", () => {
  test("default layout under ~/.stali", () => {
    const home = os.homedir();
    expect(getStaliHome()).toBe(path.join(home, ".stali"));
    expect(getStaliCliInstallDir()).toBe(path.join(home, ".stali", "cli"));
    expect(getStaliBinDir()).toBe(path.join(home, ".stali", "bin"));
    expect(getStaliConfigPath()).toBe(path.join(home, ".stali", "config.json"));
  });

  test("STALI_HOME override", () => {
    const prev = process.env.STALI_HOME;
    process.env.STALI_HOME = "/tmp/stali-test-home";
    try {
      expect(getStaliHome()).toBe("/tmp/stali-test-home");
      expect(getStaliCliInstallDir()).toBe("/tmp/stali-test-home/cli");
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
