import { SyncerResult } from "../../types";
import { getToolById } from "../../utils/tool-utils";
import { readJsonFile, readTomlFile, resolveHomePath } from "../../utils/file";
import { patchClaudeSettings, getClaudeStatus, resetClaudeSettings } from "./claude";
import { patchCodexSettings, getCodexStatus, resetCodexSettings } from "./codex";
import { patchOpenClawSettings, resetOpenClawSettings } from "./openclaw";
import { patchDeepSeekSettings, resetDeepSeekSettings } from "./deepseek";
import { patchQwenSettings } from "./qwen";
import { patchOpenCodeSettings, resetOpenCodeSettings } from "./opencode";
import { patchKiloSettings, resetKiloSettings } from "./kilo";
import { patchDroidSettings, resetDroidSettings } from "./droid";
import { patchClineSettings, resetClineSettings } from "./cline";
import { patchRooSettings, resetRooSettings } from "./roo";
import { patchGrokSettings, resetGrokSettings } from "./grok";
import { patchCoworkSettings, resetCoworkSettings } from "./cowork";
import { patchJcodeSettings, resetJcodeSettings } from "./jcode";
import { restoreToolConfig } from "./common";

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

function looksLikeStaliContent(raw: string): boolean {
  return raw.includes("api.stali.vn") || raw.includes("stali");
}

export async function getToolHealthStatus(toolId: string): Promise<ToolHealthStatus | null> {
  const tool = getToolById(toolId);
  if (!tool) return null;

  const configPath = resolveHomePath(tool.configFile);
  const exists = await fileExists(configPath);
  let configuredForStali = false;
  let model: string | undefined;

  if (toolId === "claude") {
    const s = await getClaudeStatus();
    configuredForStali = s.configured;
    model = s.defaultModel;
  } else if (toolId === "codex") {
    const s = await getCodexStatus();
    configuredForStali = s.configured;
    model = s.model;
  } else if (exists) {
    const json = await readJsonFile(configPath);
    const toml = json ? null : await readTomlFile(configPath);
    const blob = JSON.stringify(json || toml || {});
    configuredForStali = looksLikeStaliContent(blob);
    model =
      json?.model ||
      json?.env?.ANTHROPIC_MODEL ||
      json?.anthropicModelId ||
      json?.openai?.model ||
      json?.defaultModel ||
      toml?.model;
  }

  return {
    toolId,
    toolName: tool.name,
    configPath,
    exists,
    configuredForStali,
    model,
  };
}

export async function runDoctorScan(): Promise<ToolHealthStatus[]> {
  const { SUPPORTED_TOOLS } = await import("../../constants/tools");
  const results: ToolHealthStatus[] = [];
  for (const tool of SUPPORTED_TOOLS) {
    const status = await getToolHealthStatus(tool.id);
    if (status) results.push(status);
  }
  return results;
}

/**
 * Dispatch syncer by toolId
 */
export async function syncTool(
  toolId: string,
  apiKey: string,
  model?: string
): Promise<SyncerResult> {
  switch (toolId) {
    case "claude":
      return patchClaudeSettings(apiKey, model);
    case "codex":
      return patchCodexSettings(apiKey, model);
    case "openclaw":
      return patchOpenClawSettings(apiKey, model);
    case "deepseek-tui":
      return patchDeepSeekSettings(apiKey, model);
    case "qwen":
      return patchQwenSettings(apiKey, model);
    case "opencode":
      return patchOpenCodeSettings(apiKey, model);
    case "kilo":
      return patchKiloSettings(apiKey, model);
    case "droid":
      return patchDroidSettings(apiKey, model);
    case "cline":
      return patchClineSettings(apiKey, model);
    case "roo":
      return patchRooSettings(apiKey, model);
    case "grok-build":
      return patchGrokSettings(apiKey, model);
    case "cowork":
      return patchCoworkSettings(apiKey, model);
    case "jcode":
      return patchJcodeSettings(apiKey, model);
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
      return restoreToolConfig(
        (await import("./qwen")).QWEN_CONFIG_PATH
      );
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
