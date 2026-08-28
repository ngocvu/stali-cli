import { runDoctorScan, syncTool } from "./syncers";
import { validateApiKeyAndFetchModels } from "./api";
import { validateTokenFormat } from "../utils/token";
import {
  getToolById,
  resolveToolDefaultModel,
  resolveToolId,
} from "../utils/tool-utils";
import { SUPPORTED_TOOLS } from "../constants/tools";
import type { ConfigureBatchItem } from "./configure-batch";

export interface DoctorFixOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  toolInputs?: string[];
  dryRun?: boolean;
  /** Sửa cả tool đã OK (force re-sync) */
  force?: boolean;
  /** Chỉ tool đã phát hiện trên máy (binary/config/vscode) */
  installedOnly?: boolean;
}

export function resolveDoctorFixTargets(
  toolInputs?: string[],
  statuses?: Awaited<ReturnType<typeof runDoctorScan>>,
  force = false,
  installedIds?: string[]
): string[] {
  const scan = statuses || [];
  const configured = new Set(
    scan.filter((s) => s.configuredForStali).map((s) => s.toolId)
  );
  const installedSet = installedIds?.length ? new Set(installedIds) : null;

  if (toolInputs && toolInputs.length > 0) {
    return [...new Set(toolInputs.map((t) => resolveToolId(t)).filter((id) => getToolById(id)))];
  }

  return SUPPORTED_TOOLS.map((t) => t.id).filter((id) => {
    if (installedSet && !installedSet.has(id)) return false;
    return force || !configured.has(id);
  });
}

export async function runDoctorFix(
  opts: DoctorFixOptions
): Promise<{ items: ConfigureBatchItem[]; allOk: boolean }> {
  const validation = opts.dryRun
    ? (() => {
        const formatError = validateTokenFormat(opts.apiKey.trim());
        if (formatError) {
          return {
            valid: false as const,
            error: formatError,
            models: [] as { id: string; supported_endpoint_types: string[] }[],
            defaultModel: "",
          };
        }
        return {
          valid: true as const,
          defaultModel: "claude-fable-5",
          models: [] as { id: string; supported_endpoint_types: string[] }[],
        };
      })()
    : await validateApiKeyAndFetchModels(opts.apiKey, { baseUrl: opts.baseUrl });

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

  const statuses = await runDoctorScan();
  let installedIds: string[] | undefined;
  if (opts.installedOnly) {
    const { discoverInstalledToolIds } = await import("./tool-discovery");
    installedIds = await discoverInstalledToolIds();
  }
  const toolIds = resolveDoctorFixTargets(opts.toolInputs, statuses, opts.force, installedIds);

  if (toolIds.length === 0) {
    return {
      items: [
        {
          toolId: "",
          toolName: "",
          success: true,
          message: "Tất cả công cụ đã trỏ Stali — không cần sửa",
        },
      ],
      allOk: true,
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

    const prev = statuses.find((s) => s.toolId === toolId);
    const needsFix = opts.force || !prev?.configuredForStali;

    if (!needsFix) {
      items.push({
        toolId,
        toolName: tool.name,
        success: true,
        message: "Đã trỏ Stali — bỏ qua",
      });
      continue;
    }

    if (opts.dryRun) {
      items.push({
        toolId,
        toolName: tool.name,
        success: true,
        message: `Sẽ cấu hình → ${tool.configFile} (${resolvedModel})`,
      });
      continue;
    }

    const result = await syncTool(toolId, opts.apiKey, resolvedModel, {
      baseUrl: opts.baseUrl,
    });
    items.push({
      toolId,
      toolName: tool.name,
      success: result.success,
      message: result.message,
      configPath: result.configPath,
      backupPath: result.backupPath,
      error: result.error,
    });
  }

  return { items, allOk: items.every((i) => i.success) };
}
