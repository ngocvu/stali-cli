import { describe, expect, test } from "bun:test";
import { formatPluginsSuggestJson } from "./plugins-json";

describe("formatPluginsSuggestJson", () => {
  test("schema v2 with suggestions", () => {
    const json = formatPluginsSuggestJson([
      {
        pluginId: "demo",
        pluginName: "Demo",
        configFile: "~/.demo.json",
        configExists: true,
        suggestedPatchStyle: "openai-json",
        changed: false,
        reason: "test",
      },
    ]);
    expect(json.schemaVersion).toBe(2);
    expect(json.command).toBe("plugins-suggest");
    expect(json.count).toBe(1);
  });

  test("NO_PLUGINS message", () => {
    const json = formatPluginsSuggestJson([], "NO_PLUGINS");
    expect(json.message).toBe("NO_PLUGINS");
    expect(json.count).toBe(0);
  });
});
