import { describe, expect, test } from "bun:test";
import { buildMainMenuGroups } from "./menu-groups";

describe("buildMainMenuGroups", () => {
  test("simple menu hides technical items", () => {
    const groups = buildMainMenuGroups({ advanced: false });
    const values = groups.flatMap((g) => g.items.map((i) => i.value));
    expect(values).toEqual(["configure", "doctor", "change-key", "more", "exit"]);
    expect(values).not.toContain("plugins");
    expect(values).not.toContain("completion");
    expect(values).not.toContain("configure-all");
  });

  test("simple menu surfaces gateway when apps are waiting", () => {
    const values = buildMainMenuGroups({
      advanced: false,
      pendingGatewayCount: 2,
    }).flatMap((g) => g.items.map((i) => i.value));
    expect(values[1]).toBe("gateway");
  });

  test("advanced menu has back and technical items", () => {
    const values = buildMainMenuGroups({ advanced: true }).flatMap((g) =>
      g.items.map((i) => i.value)
    );
    expect(values).toContain("plugins");
    expect(values).toContain("configure-all");
    expect(values).toContain("back");
    expect(values).not.toContain("more");
  });
});
