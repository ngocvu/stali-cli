import { loadStaliConfig } from "./config";
import { runPluginsDoctor } from "./plugin-doctor";
import { runPluginsSync, type PluginSyncItem } from "./plugin-sync";

export interface PluginsDoctorFixOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  pluginIds?: string[];
  dryRun?: boolean;
  force?: boolean;
}

export async function runPluginsDoctorFix(
  opts: PluginsDoctorFixOptions
): Promise<{ items: PluginSyncItem[]; allOk: boolean }> {
  const report = await runPluginsDoctor();
  const cfg = await loadStaliConfig();

  if (report.plugins.length === 0) {
    return {
      items: [
        {
          pluginId: "",
          pluginName: "",
          success: false,
          message: "Không có plugin — stali plugins --init",
          error: "NO_PLUGINS",
        },
      ],
      allOk: false,
    };
  }

  const needsFix = new Set(
    report.plugins.filter((p) => !p.configuredForStali).map((p) => p.pluginId)
  );

  let targetIds = opts.pluginIds?.length
    ? opts.pluginIds.filter((id) => report.plugins.some((p) => p.pluginId === id))
    : report.plugins.map((p) => p.pluginId);

  if (!opts.force) {
    targetIds = targetIds.filter((id) => needsFix.has(id));
  }

  if (targetIds.length === 0) {
    return {
      items: [
        {
          pluginId: "",
          pluginName: "",
          success: true,
          message: "Tất cả plugin đã trỏ Stali — không cần sửa",
        },
      ],
      allOk: true,
    };
  }

  return runPluginsSync({
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl ?? cfg?.baseUrl,
    model: opts.model,
    pluginIds: targetIds,
    dryRun: opts.dryRun,
  });
}
