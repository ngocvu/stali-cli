import { authStatus } from "./auth-cli";
import { runDoctorScan } from "./syncers";
import { runPluginsDoctor } from "./plugin-doctor";

export interface HealthCheckResult {
  ok: boolean;
  authOk: boolean;
  authError?: string;
  doctorConfigured: number;
  doctorTotal: number;
  pluginsConfigured: number;
  pluginsTotal: number;
  strict: boolean;
  messages: string[];
}

export async function runHealthCheck(strict = false): Promise<HealthCheckResult> {
  const messages: string[] = [];
  const auth = await authStatus();
  const authOk = Boolean(auth.hasKey && auth.valid);

  if (!auth.hasKey) {
    messages.push("Chưa lưu API key — chạy: stali auth login -k sk-stali-...");
  } else if (!auth.valid) {
    messages.push(`API key không hợp lệ${auth.error ? `: ${auth.error}` : ""}`);
  } else {
    messages.push(`API key OK (${auth.masked})`);
  }

  const doctor = await runDoctorScan();
  const configured = doctor.filter((d) => d.configuredForStali).length;
  const total = doctor.length;
  messages.push(`Doctor: ${configured}/${total} tool trỏ Stali`);

  if (configured < total) {
    const missing = doctor.filter((d) => !d.configuredForStali).map((d) => d.toolId);
    messages.push(`Chưa OK: ${missing.join(", ")}`);
  }

  const pluginReport = await runPluginsDoctor();
  const pluginsTotal = pluginReport.plugins.length;
  const pluginsConfigured = pluginReport.plugins.filter((p) => p.configuredForStali).length;

  if (pluginsTotal > 0) {
    messages.push(`Plugins: ${pluginsConfigured}/${pluginsTotal} trỏ Stali`);
    if (pluginsConfigured < pluginsTotal) {
      const missingPlugins = pluginReport.plugins
        .filter((p) => !p.configuredForStali)
        .map((p) => p.pluginId);
      messages.push(`Plugin chưa OK: ${missingPlugins.join(", ")}`);
    }
  }

  const toolsStrictOk = !strict || configured === total;
  const pluginsStrictOk = !strict || pluginsTotal === 0 || pluginsConfigured === pluginsTotal;
  const ok = authOk && toolsStrictOk && pluginsStrictOk;

  return {
    ok,
    authOk,
    authError: auth.error,
    doctorConfigured: configured,
    doctorTotal: total,
    pluginsConfigured,
    pluginsTotal,
    strict,
    messages,
  };
}
