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
    const prevHome = process.env.STALI_HOME;
    const prevCli = process.env.STALI_CLI_INSTALL_DIR;
    delete process.env.STALI_HOME;
    delete process.env.STALI_CLI_INSTALL_DIR;
    try {
      const home = os.homedir();
      expect(getStaliHome()).toBe(path.join(home, ".stali"));
      expect(getStaliCliInstallDir()).toBe(path.join(home, ".stali", "cli"));
      expect(getStaliBinDir()).toBe(path.join(home, ".stali", "bin"));
      expect(getStaliConfigPath()).toBe(path.join(home, ".stali", "config.json"));
    } finally {
      if (prevHome === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prevHome;
      if (prevCli === undefined) delete process.env.STALI_CLI_INSTALL_DIR;
      else process.env.STALI_CLI_INSTALL_DIR = prevCli;
    }
  });

  test("STALI_HOME override", () => {
    const prev = process.env.STALI_HOME;
    const customHome = path.join(os.tmpdir(), "stali-test-home");
    process.env.STALI_HOME = customHome;
    try {
      expect(getStaliHome()).toBe(customHome);
      expect(getStaliCliInstallDir()).toBe(path.join(customHome, "cli"));
    } finally {
      if (prev === undefined) delete process.env.STALI_HOME;
      else process.env.STALI_HOME = prev;
    }
  });
});
