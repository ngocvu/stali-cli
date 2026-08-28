import { authLogin } from "./auth-cli";
import { runConfigureBatch } from "./configure-batch";
import { runHealthCheck } from "./health-check";
import { loadStaliConfig } from "./config";
import { resolveIncludePluginsFromHome } from "../utils/include-plugins";

export interface InitOptions {
  apiKey: string;
  skipConfigure?: boolean;
  baseUrl?: string;
  includePlugins?: boolean;
  noPlugins?: boolean;
  skipCompletion?: boolean;
  skipCliCheck?: boolean;
  upgradeCli?: boolean;
  /** Chỉ configure app đã phát hiện trên máy */
  installedOnly?: boolean;
}

export interface InitResult {
  success: boolean;
  steps: { name: string; ok: boolean; detail?: string }[];
}

/** Pure helper — dùng trong test và runInit */
export function evaluateInitSuccess(
  steps: InitResult["steps"],
  opts: { skipConfigure?: boolean }
): boolean {
  const login = steps.find((s) => s.name === "auth login");
  const configure = steps.find((s) => s.name === "configure-all");
  const check = steps.find((s) => s.name === "check");
  const configureOk = opts.skipConfigure ? true : (configure?.ok ?? false);
  return Boolean(login?.ok && configureOk && check?.ok);
}

function formatHealthDetail(health: Awaited<ReturnType<typeof runHealthCheck>>): string {
  const tools = `${health.doctorConfigured}/${health.doctorTotal} tools`;
  if (health.pluginsTotal > 0) {
    return `${tools}, ${health.pluginsConfigured}/${health.pluginsTotal} plugins`;
  }
  return tools;
}

export async function runInit(opts: InitOptions): Promise<InitResult> {
  const steps: InitResult["steps"] = [];
  const config = await loadStaliConfig();
  const baseUrl = opts.baseUrl ?? config?.baseUrl;

  const login = await authLogin(opts.apiKey, { baseUrl });
  steps.push({
    name: "auth login",
    ok: login.success,
    detail: login.message,
  });
  if (!login.success) {
    return { success: false, steps };
  }

  if (!opts.skipCliCheck) {
    try {
      const { fetchLatestVersion } = await import("./version-check");
      const { resolveUpdateChannelResolved } = await import("./update-channel");
      const channelCfg = await resolveUpdateChannelResolved("stable");
      const ver = await fetchLatestVersion(channelCfg.versionUrl);
      if (opts.upgradeCli && ver.updateAvailable) {
        const { runInstallCli } = await import("./install-cli");
        const code = await runInstallCli({ npm: true });
        steps.push({
          name: "cli upgrade",
          ok: code === 0,
          detail: code === 0 ? `→ ${ver.latest}` : "npm install thất bại",
        });
      } else {
        steps.push({
          name: "cli version",
          ok: true,
          detail: ver.updateAvailable
            ? `có bản mới ${ver.latest} — stali install --npm`
            : `${ver.current} (latest)`,
        });
      }
    } catch (e: unknown) {
      steps.push({
        name: "cli version",
        ok: true,
        detail: e instanceof Error ? e.message : "skip (offline)",
      });
    }
  }

  if (!opts.skipConfigure) {
    const includePlugins = await resolveIncludePluginsFromHome({
      includePlugins: opts.includePlugins,
      noPlugins: opts.noPlugins,
    });
    const useInstalledOnly = opts.installedOnly !== false;
    let installedIds: string[] = [];
    if (useInstalledOnly) {
      const { discoverInstalledToolIds } = await import("./tool-discovery");
      installedIds = await discoverInstalledToolIds();
    }
    const skipAdvanced =
      installedIds.length > 0
        ? !installedIds.includes("claude") && !installedIds.includes("codex")
        : true;
    const batch = await runConfigureBatch({
      apiKey: opts.apiKey,
      baseUrl,
      skipAdvanced,
      continueOnError: true,
      includePlugins,
      toolInputs: installedIds.length > 0 ? installedIds : undefined,
    });
    const okCount = batch.items.filter((i) => i.success).length;
    const label = includePlugins ? "tools+plugins" : "tools";
    steps.push({
      name: "configure-all",
      ok: batch.allOk,
      detail: `${okCount}/${batch.items.length} ${label}`,
    });
  } else {
    steps.push({ name: "configure-all", ok: true, detail: "skipped" });
  }

  const health = await runHealthCheck(false);
  steps.push({
    name: "check",
    ok: health.authOk,
    detail: formatHealthDetail(health),
  });

  if (!opts.skipCompletion) {
    try {
      const { installAllCompletions } = await import("./completion-install");
      const results = await installAllCompletions();
      const shells = results.map((r) => r.shell).join(",");
      steps.push({
        name: "completion install",
        ok: true,
        detail: shells,
      });
    } catch (e: unknown) {
      steps.push({
        name: "completion install",
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    success: evaluateInitSuccess(steps, { skipConfigure: opts.skipConfigure }),
    steps,
  };
}
