import { SUPPORTED_TOOLS } from "../constants/tools";
import { validateApiKeyAndFetchModels } from "./api";
import { syncTool } from "./syncers";
import { buildToolConfigPreview } from "./syncers/preview";
import { getToolById, resolveToolDefaultModel, resolveToolId } from "../utils/tool-utils";
import type { SyncerResult } from "../types";

export interface ConfigureBatchOptions {
  apiKey: string;
  model?: string;
  toolInputs?: string[];
  dryRun?: boolean;
  continueOnError?: boolean;
  /** Bỏ qua claude/codex (cần wizard nâng cao) */
  skipAdvanced?: boolean;
}

export interface ConfigureBatchItem {
  toolId: string;
  toolName: string;
  success: boolean;
  message: string;
  configPath?: string;
  backupPath?: string;
  preview?: unknown;
  error?: string;
}

export function resolveBatchToolIds(
  toolInputs?: string[],
  skipAdvanced = false
): string[] {
  if (toolInputs && toolInputs.length > 0) {
    const ids = toolInputs.map((t) => resolveToolId(t));
    const unique = [...new Set(ids)];
    return unique.filter((id) => getToolById(id));
  }

  return SUPPORTED_TOOLS.map((t) => t.id).filter((id) => {
    if (skipAdvanced && (id === "claude" || id === "codex")) return false;
    return true;
  });
}

export async function runConfigureBatch(
  opts: ConfigureBatchOptions
): Promise<{ items: ConfigureBatchItem[]; allOk: boolean }> {
  const toolIds = resolveBatchToolIds(opts.toolInputs, opts.skipAdvanced ?? false);

  if (toolIds.length === 0) {
    return {
      items: [
        {
          toolId: "",
          toolName: "",
          success: false,
          message: "Không có tool hợp lệ để cấu hình",
          error: "NO_TOOLS",
        },
      ],
      allOk: false,
    };
  }

  const validation = opts.dryRun
    ? { valid: true, defaultModel: "claude-fable-5", models: [] as { id: string; supported_endpoint_types: string[] }[] }
    : await validateApiKeyAndFetchModels(opts.apiKey);

  if (!validation.valid) {
    return {
      items: [
        {
          toolId: "",
          toolName: "",
          success: false,
          message: (validation as { error?: string }).error || "Token không hợp lệ",
          error: "INVALID_KEY",
        },
      ],
      allOk: false,
    };
  }

  const models = (validation as { models?: { id: string; supported_endpoint_types: string[] }[] }).models;
  const apiDefault = (validation as { defaultModel?: string }).defaultModel;

  const items: ConfigureBatchItem[] = [];

  for (const toolId of toolIds) {
    const tool = getToolById(toolId)!;
    const resolvedModel =
      opts.model ||
      resolveToolDefaultModel(toolId, apiDefault, models) ||
      tool.defaultModel;

    if (opts.dryRun) {
      items.push({
        toolId,
        toolName: tool.name,
        success: true,
        message: `Dry-run OK → ${tool.configFile}`,
        preview: buildToolConfigPreview(toolId, opts.apiKey, resolvedModel),
      });
      continue;
    }

    let result: SyncerResult;
    try {
      result = await syncTool(toolId, opts.apiKey, resolvedModel);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      items.push({
        toolId,
        toolName: tool.name,
        success: false,
        message: `Lỗi: ${err}`,
        error: err,
      });
      if (!opts.continueOnError) break;
      continue;
    }

    items.push({
      toolId,
      toolName: tool.name,
      success: result.success,
      message: result.message,
      configPath: result.configPath,
      backupPath: result.backupPath,
      error: result.error,
    });

    if (!result.success && !opts.continueOnError) break;
  }

  return { items, allOk: items.every((i) => i.success) };
}
