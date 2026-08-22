import { SUPPORTED_TOOLS } from "../constants/tools";
import { ToolDefinition } from "../types";

export function getToolById(toolId: string): ToolDefinition | undefined {
  return SUPPORTED_TOOLS.find((t) => t.id === toolId);
}

export function isAnthropicTool(toolId: string): boolean {
  const tool = getToolById(toolId);
  return tool?.protocol === "anthropic";
}

export function isOpenAiTool(toolId: string): boolean {
  const tool = getToolById(toolId);
  return tool?.protocol === "openai";
}

export function resolveToolDefaultModel(
  toolId: string,
  apiDefaultModel?: string,
  models?: { id: string; supported_endpoint_types: string[] }[]
): string {
  const tool = getToolById(toolId);
  const fallback = tool?.defaultModel || "claude-fable-5";

  if (!apiDefaultModel) return fallback;

  if (models && models.length > 0) {
    const match = models.find((m) => m.id === apiDefaultModel);
    if (match) {
      if (isAnthropicTool(toolId) && match.supported_endpoint_types.includes("anthropic")) {
        return apiDefaultModel;
      }
      if (isOpenAiTool(toolId) && match.supported_endpoint_types.includes("openai")) {
        return apiDefaultModel;
      }
    }
  }

  return fallback;
}
