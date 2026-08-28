import { describe, expect, test } from "bun:test";
import path from "path";
import { resolveIdeExtensionRoots } from "./ide-extension-roots";

describe("resolveIdeExtensionRoots", () => {
  test("includes unix-style home paths", () => {
    const roots = resolveIdeExtensionRoots("/home/dev");
    expect(roots).toContain(path.join("/home/dev", ".cursor/extensions"));
    expect(roots).toContain(path.join("/home/dev", ".vscode/extensions"));
  });

  test("includes Windows APPDATA paths when set", () => {
    const prev = process.env.APPDATA;
    process.env.APPDATA = "C:\\Users\\dev\\AppData\\Roaming";
    try {
      const roots = resolveIdeExtensionRoots("C:\\Users\\dev");
      expect(roots).toContain(
        path.join("C:\\Users\\dev\\AppData\\Roaming", "Cursor", "extensions")
      );
      expect(roots).toContain(
        path.join("C:\\Users\\dev\\AppData\\Roaming", "Code", "User", "globalStorage")
      );
    } finally {
      if (prev === undefined) delete process.env.APPDATA;
      else process.env.APPDATA = prev;
    }
  });
});
