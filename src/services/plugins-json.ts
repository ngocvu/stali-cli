import type { PluginPatchSuggestion } from "./plugin-suggest";

export function formatPluginsSuggestJson(
  suggestions: PluginPatchSuggestion[],
  message?: string
): Record<string, unknown> {
  return {
    command: "plugins-suggest",
    schemaVersion: 2,
    count: suggestions.length,
    ...(message ? { message } : {}),
    suggestions,
  };
}
