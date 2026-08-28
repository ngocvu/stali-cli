import { authStatus } from "./auth-cli";
import { runDoctorScan } from "./syncers";
import { runPluginsDoctor } from "./plugin-doctor";

export type HealthCheckScope = "full" | "tools" | "plugins";

export interface HealthCheckOptions {
  strict?: boolean;
  toolsOnly?: boolean;
  pluginsOnly?: boolean;
  /** Sau auth vừa lưu — bỏ validate API lần 2 (setup nhanh hơn). */
  authLocalOnly?: boolean;
}

export interface HealthCheckResult {
  ok: boolean;
  authOk: boolean;
  authError?: string;
  doctorConfigured: number;
  doctorTotal: number;
  pluginsConfigured: number;
  pluginsTotal: number;
  strict: boolean;
  scope: HealthCheckScope;
  messages: string[];
}

function resolveScope(opts: HealthCheckOptions): HealthCheckScope {
  if (opts.toolsOnly) return "tools";
  if (opts.pluginsOnly) return "plugins";
  return "full";
}

function normalizeOptions(
  opts: boolean | HealthCheckOptions = false
): HealthCheckOptions {
  if (typeof opts === "boolean") return { strict: opts };
  return opts;
}

export async function runHealthCheck(
  opts: boolean | HealthCheckOptions = false
): Promise<HealthCheckResult> {
  const options = normalizeOptions(opts);
  const strict = options.strict ?? false;
  const scope = resolveScope(options);
  const messages: string[] = [];

  const auth = options.authLocalOnly
    ? await authStatus({ localOnly: true })
    : await authStatus();
  const authOk = options.authLocalOnly
    ? Boolean(auth.hasKey)
    : Boolean(auth.hasKey && auth.valid);

  if (!auth.hasKey) {
    messages.push("Chưa lưu API key — chạy: stali auth login -k sk-stali-...");
  } else if (!auth.valid) {
    messages.push(`API key không hợp lệ${auth.error ? `: ${auth.error}` : ""}`);
  } else {
    messages.push(`API key OK (${auth.masked})`);
  }

  let configured = 0;
  let total = 0;
  let pluginsTotal = 0;
  let pluginsConfigured = 0;

  if (scope !== "plugins") {
    const doctor = await runDoctorScan();
    configured = doctor.filter((d) => d.configuredForStali).length;
    total = doctor.length;
    messages.push(`Doctor: ${configured}/${total} tool trỏ Stali`);
    if (configured < total) {
      const missing = doctor.filter((d) => !d.configuredForStali).map((d) => d.toolId);
      messages.push(`Chưa OK: ${missing.join(", ")}`);
    }
  }

  if (scope !== "tools") {
    const pluginReport = await runPluginsDoctor();
    pluginsTotal = pluginReport.plugins.length;
    pluginsConfigured = pluginReport.plugins.filter((p) => p.configuredForStali).length;

    if (pluginsTotal > 0 || scope === "plugins") {
      messages.push(`Plugins: ${pluginsConfigured}/${pluginsTotal} trỏ Stali`);
      if (pluginsConfigured < pluginsTotal) {
        const missingPlugins = pluginReport.plugins
          .filter((p) => !p.configuredForStali)
          .map((p) => p.pluginId);
        messages.push(`Plugin chưa OK: ${missingPlugins.join(", ")}`);
      }
    }
  }

  const toolsStrictOk =
    scope === "plugins" || !strict || configured === total;
  const pluginsStrictOk =
    scope === "tools" ||
    !strict ||
    (pluginsTotal === 0 ? scope !== "plugins" : pluginsConfigured === pluginsTotal);
  const pluginsStrictFail =
    strict && scope === "plugins" && pluginsTotal === 0;

  const ok = authOk && toolsStrictOk && pluginsStrictOk && !pluginsStrictFail;

  return {
    ok,
    authOk,
    authError: auth.error,
    doctorConfigured: configured,
    doctorTotal: total,
    pluginsConfigured,
    pluginsTotal,
    strict,
    scope,
    messages,
  };
}
