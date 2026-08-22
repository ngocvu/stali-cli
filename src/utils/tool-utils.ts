import { SUPPORTED_TOOLS } from "../constants/tools";
import { ToolDefinition } from "../types";

/** Alias từ connect-catalog / docs → registry id */
const TOOL_ALIASES: Record<string, string> = {
  "claude-code": "claude",
  "claude_code": "claude",
  cc: "claude",
  codex: "codex",
  openclaw: "openclaw",
  "deepseek-tui": "deepseek-tui",
  deepseek: "deepseek-tui",
  qwen: "qwen",
  opencode: "opencode",
  kilo: "kilo",
  "kilo-code": "kilo",
  droid: "droid",
  cline: "cline",
  "vscode-cline": "cline",
  "cline-roo": "cline",
  roo: "roo",
  "roo-code": "roo",
  "grok-build": "grok-build",
  grok: "grok-build",
  cowork: "cowork",
  jcode: "jcode",
};

export function resolveToolId(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (TOOL_ALIASES[normalized]) return TOOL_ALIASES[normalized];
  const direct = SUPPORTED_TOOLS.find((t) => t.id === normalized);
  if (direct) return direct.id;
  return normalized;
}

export function getToolById(toolId: string): ToolDefinition | undefined {
  return SUPPORTED_TOOLS.find((t) => t.id === resolveToolId(toolId));
}

export function isAnthropicTool(toolId: string): boolean {
  const tool = getToolById(toolId);
  return tool?.protocol === "anthropic";
}

export function isOpenAiTool(toolId: string): boolean {
  const tool = getToolById(toolId);
  return tool?.protocol === "openai";
}

/** Model shortcuts gợi ý theo giao thức */
export function getProtocolModelShortcuts(toolId: string): string[] {
  if (isAnthropicTool(toolId)) {
    return ["claude-fable-5", "claude-sonnet-5", "claude-opus-5"];
  }
  if (toolId === "deepseek-tui") {
    return ["deepseek-v4-flash", "deepseek-v4-pro"];
  }
  if (toolId === "codex" || toolId === "cowork" || toolId === "opencode") {
    return ["req/gpt-5.6-sol", "gpt-5.6-sol"];
  }
  if (toolId === "qwen") {
    return ["stali/qwen3-codex"];
  }
  if (toolId === "grok-build") {
    return ["grok-4.6"];
  }
  return ["gpt-5.6-sol", "claude-fable-5"];
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
