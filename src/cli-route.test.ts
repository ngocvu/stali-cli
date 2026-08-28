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

  test("wizard → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "wizard"])).toBe("subcommand");
  });

  test("--reset → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "--reset"])).toBe("subcommand");
  });

  test("--models → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "--models"])).toBe("subcommand");
  });
});
