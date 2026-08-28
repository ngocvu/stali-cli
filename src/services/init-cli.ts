import { validateApiKeyAndFetchModels } from "./api";
import { runHealthCheck } from "./health-check";
import { loadStaliConfig, saveStaliConfig } from "./config";
import { resolveIncludePluginsFromHome } from "../utils/include-plugins";
import { discoverInstalledTools, type ToolDiscoveryEntry } from "./tool-discovery";

export interface InitOptions {
  apiKey: string;
  skipConfigure?: boolean;
  baseUrl?: string;
  includePlugins?: boolean;
  noPlugins?: boolean;
  skipCompletion?: boolean;
  skipCliCheck?: boolean;
  upgradeCli?: boolean;
  /** Chỉ configure app đã phát hiện trên máy (mặc định). false = --all-apps */
  installedOnly?: boolean;
  /** Không in banner gateway (CI/script) */
  yes?: boolean;
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
  const gateway = steps.find((s) => s.name === "gateway auto" || s.name === "configure-all");
  const check = steps.find((s) => s.name === "check");
  const gatewayOk = opts.skipConfigure ? true : (gateway?.ok ?? false);
  return Boolean(login?.ok && gatewayOk && check?.ok);
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
  const trimmedKey = opts.apiKey.trim();

  const discoveryPromise: Promise<ToolDiscoveryEntry[] | null> = opts.skipConfigure
    ? Promise.resolve(null)
    : discoverInstalledTools();

  const login = await (async () => {
    if (!trimmedKey) {
      return { success: false as const, message: "API key trống", preDiscovery: null as ToolDiscoveryEntry[] | null };
    }
    const [validation, preDiscovery] = await Promise.all([
      validateApiKeyAndFetchModels(trimmedKey, { baseUrl }),
      discoveryPromise,
    ]);
    if (!validation.valid) {
      return {
        success: false as const,
        message: validation.error || "Token không hợp lệ",
        preDiscovery,
      };
    }
    await saveStaliConfig({
      apiKey: trimmedKey,
      currentModel: validation.defaultModel,
      ...(baseUrl ? { baseUrl } : {}),
    });
    return {
      success: true as const,
      message: "Đã lưu API key vào ~/.stali/config.json",
      preDiscovery,
    };
  })();

  steps.push({
    name: "auth login",
    ok: login.success,
    detail: login.message,
  });
  if (!login.success) {
    return { success: false, steps };
  }

  const preDiscovery = "preDiscovery" in login ? login.preDiscovery : null;

  if (!opts.skipCliCheck) {
    try {
      const { fetchNpmLatestVersion } = await import("./version-check");
      const ver = await fetchNpmLatestVersion();
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
    const { runGatewayAuto } = await import("./gateway-install");
    const batch = await runGatewayAuto({
      apiKey: opts.apiKey,
      baseUrl,
      all: !useInstalledOnly,
      continueOnError: true,
      includePlugins,
      yes: opts.yes,
      discovery: preDiscovery ?? undefined,
    });
    const gw = batch.install ?? { items: [], allOk: true, targets: [] as string[] };
    const okCount = gw.items.filter((i) => i.success).length;
    const label = includePlugins ? "apps+plugins" : "apps";
    steps.push({
      name: "gateway auto",
      ok: gw.allOk,
      detail:
        gw.targets.length === 0
          ? "không có app cần cài"
          : `${okCount}/${gw.items.length} ${label}`,
    });
  } else {
    steps.push({ name: "gateway auto", ok: true, detail: "skipped" });
  }

  const health = await runHealthCheck({ authLocalOnly: true });
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

/** Luồng setup nhanh cho user: auth + gateway auto (-y) + check, bỏ completion/version check. */
export async function runUserSetup(opts: InitOptions): Promise<InitResult> {
  return runInit({
    ...opts,
    yes: opts.yes ?? true,
    skipCompletion: opts.skipCompletion ?? true,
    skipCliCheck: opts.skipCliCheck ?? true,
  });
}

export function formatInitSteps(steps: InitResult["steps"]): string[] {
  return steps.map((step) => {
    const icon = step.ok ? "✓" : "✗";
    return `${icon} ${step.name}${step.detail ? ` — ${step.detail}` : ""}`;
  });
}
