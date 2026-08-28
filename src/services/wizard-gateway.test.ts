import { describe, expect, test } from "bun:test";
import { mapGatewayItemsToSyncerResults } from "./wizard-gateway";

describe("mapGatewayItemsToSyncerResults", () => {
  test("maps configure batch items", () => {
    const rows = mapGatewayItemsToSyncerResults([
      {
        toolId: "claude",
        toolName: "Claude Code",
        success: true,
        message: "OK",
        configPath: "/home/x/.claude/settings.json",
      },
    ]);
    expect(rows[0]?.toolId).toBe("claude");
    expect(rows[0]?.success).toBe(true);
  });
});
