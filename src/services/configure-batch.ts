import { SUPPORTED_TOOLS } from "../constants/tools";
import { validateApiKeyAndFetchModels, type ValidateResult } from "./api";
import { syncTool } from "./syncers";
import { buildToolConfigPreview } from "./syncers/preview";
import { getToolById, resolveToolDefaultModel, resolveToolId } from "../utils/tool-utils";
import type { SyncerResult } from "../types";
import { validateTokenFormat } from "../utils/token";

export interface ConfigureBatchOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  toolInputs?: string[];
  dryRun?: boolean;
  continueOnError?: boolean;
  /** Bỏ qua claude/codex (cần wizard nâng cao) */
  skipAdvanced?: boolean;
  /** Đồng bộ thêm plugin từ ~/.stali/plugins.json */
  includePlugins?: boolean;
  /** Chỉ các tool đã phát hiện trên máy (qua tool-discovery) */
  installedOnly?: boolean;
  /** Đã validate key ở bước auth — bỏ GET /v1/models lần 2 (setup nhanh hơn). */
  prefetchedValidation?: ValidateResult;
  /** Cấu hình nhiều tool song song (mặc định khi continueOnError). */
  parallel?: boolean;
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
  skipAdvanced = false,
  installedIds?: string[]
): string[] {
  if (toolInputs && toolInputs.length > 0) {
    const ids = toolInputs.map((t) => resolveToolId(t));
    const unique = [...new Set(ids)];
    return unique.filter((id) => getToolById(id));
  }

  let ids = SUPPORTED_TOOLS.map((t) => t.id).filter((id) => {
    if (skipAdvanced && (id === "claude" || id === "codex")) return false;
    return true;
  });

  if (installedIds && installedIds.length > 0) {
    const set = new Set(installedIds);
    ids = ids.filter((id) => set.has(id));
  }

  return ids;
}

export async function resolveBatchToolIdsAsync(
  opts: Pick<ConfigureBatchOptions, "toolInputs" | "skipAdvanced" | "installedOnly">
): Promise<string[]> {
  if (opts.toolInputs && opts.toolInputs.length > 0) {
    return resolveBatchToolIds(opts.toolInputs, opts.skipAdvanced ?? false);
  }
  let installedIds: string[] | undefined;
  if (opts.installedOnly) {
    const { discoverInstalledToolIds } = await import("./tool-discovery");
    installedIds = await discoverInstalledToolIds();
  }
  return resolveBatchToolIds(undefined, opts.skipAdvanced ?? false, installedIds);
}

async function resolveBatchValidation(opts: ConfigureBatchOptions): Promise<ValidateResult> {
  if (opts.prefetchedValidation?.valid) {
    return opts.prefetchedValidation;
  }
  if (opts.dryRun) {
    const formatError = validateTokenFormat(opts.apiKey.trim());
    if (formatError) {
      return { valid: false, error: formatError, models: [], defaultModel: "" };
    }
    return {
      valid: true,
      defaultModel: "claude-fable-5",
      models: [],
    };
  }
  return validateApiKeyAndFetchModels(opts.apiKey, { baseUrl: opts.baseUrl });
}

async function configureOneTool(
  toolId: string,
  opts: ConfigureBatchOptions,
  apiDefault: string,
  models: ValidateResult["models"]
): Promise<ConfigureBatchItem> {
  const tool = getToolById(toolId)!;
  const resolvedModel =
    opts.model || resolveToolDefaultModel(toolId, apiDefault, models) || tool.defaultModel;

  if (opts.dryRun) {
    return {
      toolId,
      toolName: tool.name,
      success: true,
      message: `Dry-run OK → ${tool.configFile}`,
      preview: buildToolConfigPreview(toolId, opts.apiKey, resolvedModel, opts.baseUrl),
    };
  }

  try {
    const result: SyncerResult = await syncTool(toolId, opts.apiKey, resolvedModel, {
      baseUrl: opts.baseUrl,
    });
    return {
      toolId,
      toolName: tool.name,
      success: result.success,
      message: result.message,
      configPath: result.configPath,
      backupPath: result.backupPath,
      error: result.error,
    };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      toolId,
      toolName: tool.name,
      success: false,
      message: `Lỗi: ${err}`,
      error: err,
    };
  }
}

export async function runConfigureBatch(
  opts: ConfigureBatchOptions
): Promise<{ items: ConfigureBatchItem[]; allOk: boolean }> {
  const toolIds = opts.installedOnly
    ? await resolveBatchToolIdsAsync(opts)
    : resolveBatchToolIds(opts.toolInputs, opts.skipAdvanced ?? false);

  if (toolIds.length === 0) {
    return {
      items: [
        {
          toolId: "",
          toolName: "",
          success: false,
          message: opts.installedOnly
            ? "Không phát hiện app AI nào — thử stali gateway scan hoặc bỏ --installed-only"
            : "Không có tool hợp lệ để cấu hình",
          error: "NO_TOOLS",
        },
      ],
      allOk: false,
    };
  }

  const validation = await resolveBatchValidation(opts);

  if (!validation.valid) {
    return {
      items: [
        {
          toolId: "",
          toolName: "",
          success: false,
          message: validation.error || "Token không hợp lệ",
          error: "INVALID_KEY",
        },
      ],
      allOk: false,
    };
  }

  const models = validation.models;
  const apiDefault = validation.defaultModel;
  const continueOnError = opts.continueOnError !== false;
  const useParallel = opts.parallel !== false && continueOnError && !opts.dryRun && toolIds.length > 1;

  let items: ConfigureBatchItem[];

  if (useParallel) {
    items = await Promise.all(
      toolIds.map((toolId) => configureOneTool(toolId, opts, apiDefault, models))
    );
  } else {
    items = [];
    for (const toolId of toolIds) {
      const item = await configureOneTool(toolId, opts, apiDefault, models);
      items.push(item);
      if (!item.success && !continueOnError) break;
    }
  }

  if (opts.includePlugins) {
    const { runPluginsSync } = await import("./plugin-sync");
    const pluginResult = await runPluginsSync({
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
      model: opts.model,
      dryRun: opts.dryRun,
    });
    for (const plugin of pluginResult.items) {
      items.push({
        toolId: plugin.pluginId ? `plugin:${plugin.pluginId}` : "",
        toolName: plugin.pluginName || `Plugin ${plugin.pluginId}`,
        success: plugin.success,
        message: plugin.message,
        configPath: plugin.configPath,
        backupPath: plugin.backupPath,
        error: plugin.error,
      });
    }
  }

  return { items, allOk: items.every((i) => i.success) };
}
