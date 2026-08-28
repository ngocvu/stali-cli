import { describe, expect, test } from "bun:test";
import { resolveCliMode } from "./cli-route";

describe("resolveCliMode", () => {
  test("không args → wizard", () => {
    expect(resolveCliMode(["bun", "stali"])).toBe("wizard");
  });

  test("chỉ -k → wizard", () => {
    expect(resolveCliMode(["bun", "stali", "-k", "sk-stali-x"])).toBe("wizard");
  });

  test("doctor → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "doctor", "--json"])).toBe("subcommand");
  });

  test("gw → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "gw", "scan"])).toBe("subcommand");
  });

  test("setup → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "setup", "-k", "sk-stali-x"])).toBe("subcommand");
  });

  test("wizard → wizard entry (không bundle React trong subcommand)", () => {
    expect(resolveCliMode(["bun", "stali", "wizard"])).toBe("wizard");
  });

  test("--reset → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "--reset"])).toBe("subcommand");
  });

  test("--models → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "--models"])).toBe("subcommand");
  });
});
