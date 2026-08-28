import { getToolById } from "../../utils/tool-utils";
import { resolveHomePath } from "../../utils/file";
import { SyncerResult } from "../../types";
import { patchClaudeSettings, getClaudeStatus, resetClaudeSettings } from "./claude";
import {
  patchCodexSettings,
  getCodexStatus,
  resetCodexSettings,
  CODEX_CONFIG_PATH,
  CODEX_AUTH_PATH,
} from "./codex";
import { patchOpenClawSettings, resetOpenClawSettings, OPENCLAW_CONFIG_PATH } from "./openclaw";
import { patchDeepSeekSettings, resetDeepSeekSettings, DEEPSEEK_CONFIG_PATH } from "./deepseek";
import { patchQwenSettings, resetQwenSettings, QWEN_CONFIG_PATH } from "./qwen";
import { patchOpenCodeSettings, resetOpenCodeSettings, OPENCODE_CONFIG_PATH } from "./opencode";
import { patchKiloSettings, resetKiloSettings, KILO_CONFIG_PATH } from "./kilo";
import { patchDroidSettings, resetDroidSettings, DROID_CONFIG_PATH } from "./droid";
import { patchClineSettings, resetClineSettings, CLINE_CONFIG_PATH } from "./cline";
import { patchRooSettings, resetRooSettings, ROO_CONFIG_PATH } from "./roo";
import { patchGrokSettings, resetGrokSettings, GROK_CONFIG_PATH } from "./grok";
import { patchCoworkSettings, resetCoworkSettings, COWORK_CONFIG_PATH } from "./cowork";
import { patchJcodeSettings, resetJcodeSettings, JCODE_CONFIG_PATH } from "./jcode";
import { restoreToolConfig } from "./common";
import type { SyncOptions } from "./sync-options";
import type { DoctorStatusContext } from "./status-context";
import { isStaliLikeUrl, resolveStaliUrls } from "../../utils/stali-urls";
import {
  detectAnthropicEnvJsonStatus,
  detectCodexTomlStatus,
  detectCoworkJsonStatus,
  detectDroidJsonStatus,
  detectOpenAiProviderJsonStatus,
  detectOpenAiTomlStatus,
  detectQwenJsonStatus,
  detectVsCodeAgentJsonStatus,
  ToolSyncStatus,
} from "./status";

export {
  patchClaudeSettings,
  patchCodexSettings,
  patchOpenClawSettings,
  patchDeepSeekSettings,
  patchQwenSettings,
  patchOpenCodeSettings,
  patchKiloSettings,
  patchDroidSettings,
  patchClineSettings,
  patchRooSettings,
  patchGrokSettings,
  patchCoworkSettings,
  patchJcodeSettings,
  getClaudeStatus,
  getCodexStatus,
  resetClaudeSettings,
  resetCodexSettings,
};

export interface ToolHealthStatus {
  toolId: string;
  toolName: string;
  configPath: string;
  exists: boolean;
  configuredForStali: boolean;
  model?: string;
  endpoint?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { access } = await import("fs/promises");
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

type StatusDetector = (
  configPath: string,
  ctx?: DoctorStatusContext
) => Promise<ToolSyncStatus>;

const STATUS_BY_TOOL: Record<string, StatusDetector | "claude" | "codex"> = {
  claude: "claude",
  codex: "codex",
  openclaw: detectAnthropicEnvJsonStatus,
  "deepseek-tui": detectOpenAiTomlStatus,
  qwen: detectQwenJsonStatus,
  opencode: detectOpenAiProviderJsonStatus,
  kilo: detectVsCodeAgentJsonStatus,
  droid: detectDroidJsonStatus,
  cline: detectVsCodeAgentJsonStatus,
  roo: detectVsCodeAgentJsonStatus,
  "grok-build": detectOpenAiTomlStatus,
  cowork: detectCoworkJsonStatus,
  jcode: detectOpenAiTomlStatus,
};

export async function getToolSyncStatus(
  toolId: string,
  ctx?: DoctorStatusContext
): Promise<ToolSyncStatus | null> {
  const tool = getToolById(toolId);
  if (!tool) return null;

  const configPath = resolveHomePath(tool.configFile);
  if (!(await fileExists(configPath))) {
    return { configured: false };
  }

  const detector = STATUS_BY_TOOL[toolId];
  if (detector === "claude") {
    const s = await getClaudeStatus();
    const configured = ctx?.urls ? isStaliLikeUrl(s.endpoint, ctx.urls) : s.configured;
    return {
      configured,
      endpoint: s.endpoint,
      model: s.defaultModel,
      apiKeyPresent: Boolean(s.apiKey),
    };
  }
  if (detector === "codex") {
    const s = await getCodexStatus();
    const configured = ctx?.urls ? isStaliLikeUrl(s.endpoint, ctx.urls) : s.configured;
    return {
      configured,
      endpoint: s.endpoint,
      model: s.model,
      apiKeyPresent: Boolean(s.apiKey),
    };
  }
  if (typeof detector === "function") {
    return detector(configPath, ctx);
  }
  return { configured: false };
}

export async function getToolHealthStatus(
  toolId: string,
  ctx?: DoctorStatusContext
): Promise<ToolHealthStatus | null> {
  const tool = getToolById(toolId);
  if (!tool) return null;

  const configPath = resolveHomePath(tool.configFile);
  const exists = await fileExists(configPath);
  const sync = await getToolSyncStatus(toolId, ctx);

  return {
    toolId,
    toolName: tool.name,
    configPath,
    exists,
    configuredForStali: sync?.configured ?? false,
    model: sync?.model,
    endpoint: sync?.endpoint,
  };
}

export async function runDoctorScan(ctx?: DoctorStatusContext): Promise<ToolHealthStatus[]> {
  let statusCtx = ctx;
  if (!statusCtx?.urls) {
    const { loadStaliConfig } = await import("../config");
    const config = await loadStaliConfig();
    statusCtx = { urls: resolveStaliUrls(config?.baseUrl) };
  }

  const { SUPPORTED_TOOLS } = await import("../../constants/tools");
  const results: ToolHealthStatus[] = [];
  for (const tool of SUPPORTED_TOOLS) {
    const status = await getToolHealthStatus(tool.id, statusCtx);
    if (status) results.push(status);
  }
  return results;
}

export async function syncTool(
  toolId: string,
  apiKey: string,
  model?: string,
  syncOptions?: SyncOptions
): Promise<SyncerResult> {
  switch (toolId) {
    case "claude":
      return patchClaudeSettings(apiKey, model, undefined, undefined, syncOptions);
    case "codex":
      return patchCodexSettings(apiKey, model, undefined, syncOptions);
    case "openclaw":
      return patchOpenClawSettings(apiKey, model, syncOptions);
    case "deepseek-tui":
      return patchDeepSeekSettings(apiKey, model, syncOptions);
    case "qwen":
      return patchQwenSettings(apiKey, model, syncOptions);
    case "opencode":
      return patchOpenCodeSettings(apiKey, model, syncOptions);
    case "kilo":
      return patchKiloSettings(apiKey, model, syncOptions);
    case "droid":
      return patchDroidSettings(apiKey, model, syncOptions);
    case "cline":
      return patchClineSettings(apiKey, model, syncOptions);
    case "roo":
      return patchRooSettings(apiKey, model, syncOptions);
    case "grok-build":
      return patchGrokSettings(apiKey, model, syncOptions);
    case "cowork":
      return patchCoworkSettings(apiKey, model, syncOptions);
    case "jcode":
      return patchJcodeSettings(apiKey, model, syncOptions);
    default:
      return {
        toolId,
        toolName: toolId,
        success: false,
        message: `Chưa hỗ trợ syncer cho ${toolId}`,
        error: "Unknown toolId",
      };
  }
}

export async function resetTool(toolId: string): Promise<SyncerResult> {
  switch (toolId) {
    case "claude":
      return resetClaudeSettings();
    case "codex":
      return resetCodexSettings();
    case "openclaw":
      return resetOpenClawSettings();
    case "deepseek-tui":
      return resetDeepSeekSettings();
    case "qwen":
      return resetQwenSettings();
    case "opencode":
      return resetOpenCodeSettings();
    case "kilo":
      return resetKiloSettings();
    case "droid":
      return resetDroidSettings();
    case "cline":
      return resetClineSettings();
    case "roo":
      return resetRooSettings();
    case "grok-build":
      return resetGrokSettings();
    case "cowork":
      return resetCoworkSettings();
    case "jcode":
      return resetJcodeSettings();
    default: {
      const tool = getToolById(toolId);
      if (!tool) {
        return {
          toolId,
          toolName: toolId,
          success: false,
          message: `Không tìm thấy tool ${toolId}`,
          error: "Unknown toolId",
        };
      }
      return restoreToolConfig(resolveHomePath(tool.configFile));
    }
  }
}

export const TOOL_CONFIG_PATHS: Record<string, string> = {
  claude: resolveHomePath("~/.claude/settings.json"),
  codex: CODEX_CONFIG_PATH,
  openclaw: OPENCLAW_CONFIG_PATH,
  "deepseek-tui": DEEPSEEK_CONFIG_PATH,
  qwen: QWEN_CONFIG_PATH,
  opencode: OPENCODE_CONFIG_PATH,
  kilo: KILO_CONFIG_PATH,
  droid: DROID_CONFIG_PATH,
  cline: CLINE_CONFIG_PATH,
  roo: ROO_CONFIG_PATH,
  "grok-build": GROK_CONFIG_PATH,
  cowork: COWORK_CONFIG_PATH,
  jcode: JCODE_CONFIG_PATH,
};

export { buildToolConfigPreview } from "./preview";
