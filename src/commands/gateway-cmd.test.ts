import { describe, expect, test } from "bun:test";
import { resolveGatewayAction } from "../commands/gateway-cmd";

describe("resolveGatewayAction", () => {
  test("explicit subcommand wins", () => {
    expect(resolveGatewayAction("scan", "sk-stali-x")).toBe("scan");
    expect(resolveGatewayAction("plan", "")).toBe("plan");
  });

  test("defaults to auto when api key present", () => {
    expect(resolveGatewayAction(undefined, "sk-stali-abc")).toBe("auto");
    expect(resolveGatewayAction("", "sk-stali-abc")).toBe("auto");
  });

  test("defaults to scan without api key", () => {
    expect(resolveGatewayAction(undefined, undefined)).toBe("scan");
    expect(resolveGatewayAction(undefined, "  ")).toBe("scan");
  });
});
