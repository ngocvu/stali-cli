import { loadPlugins } from "../services/plugins";

/** Quyết định sync plugin: explicit flag hoặc mặc định khi plugins.json có entry. */
export function resolveIncludePlugins(
  opts: { includePlugins?: boolean; noPlugins?: boolean },
  pluginCount: number
): boolean {
  if (opts.noPlugins) return false;
  if (opts.includePlugins) return true;
  return pluginCount > 0;
}

export async function resolveIncludePluginsFromHome(
  opts: { includePlugins?: boolean; noPlugins?: boolean }
): Promise<boolean> {
  const pluginCount = (await loadPlugins()).length;
  return resolveIncludePlugins(opts, pluginCount);
}
