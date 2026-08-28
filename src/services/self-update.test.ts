import { describe, expect, test } from "bun:test";
import { planSelfUpdate } from "./self-update";

describe("planSelfUpdate", () => {
  test("returns plan object (offline-safe)", async () => {
    const plan = await planSelfUpdate({ channel: "stable" });
    expect(plan.action).toBeTruthy();
    expect(plan.ref).toBeTruthy();
    expect(plan.channel).toContain("stable");
  });
});
