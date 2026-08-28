import { describe, expect, test } from "bun:test";
import { resolveCliMode, rewriteArgvForKeySetup } from "./cli-route";

describe("resolveCliMode", () => {
  test("không args → wizard", () => {
    expect(resolveCliMode(["bun", "stali"])).toBe("wizard");
  });

  test("chỉ -k → subcommand (fast setup)", () => {
    expect(resolveCliMode(["bun", "stali", "-k", "sk-stali-x"])).toBe("subcommand");
  });

  test("rewriteArgvForKeySetup chèn setup", () => {
    const argv = ["bun", "stali", "-k", "sk-stali-abc"];
    expect(rewriteArgvForKeySetup(argv)).toBe(true);
    expect(argv).toEqual(["bun", "stali", "setup", "-k", "sk-stali-abc"]);
  });

  test("wizard vẫn wizard khi có subcommand wizard", () => {
    expect(resolveCliMode(["bun", "stali", "wizard"])).toBe("wizard");
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

  test("status → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "status", "--json"])).toBe("subcommand");
  });

  test("onboard → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "onboard", "-k", "sk-stali-x"])).toBe("subcommand");
  });

  test("user → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "user"])).toBe("subcommand");
  });

  test("help → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "help", "advanced"])).toBe("subcommand");
  });

  test("ready → subcommand", () => {
    expect(resolveCliMode(["bun", "stali", "ready"])).toBe("subcommand");
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
