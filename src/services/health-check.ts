import { authStatus } from "./auth-cli";
import { runDoctorScan } from "./syncers";

export interface HealthCheckResult {
  ok: boolean;
  authOk: boolean;
  authError?: string;
  doctorConfigured: number;
  doctorTotal: number;
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

  const ok = authOk && (!strict || configured === total);

  return {
    ok,
    authOk,
    authError: auth.error,
    doctorConfigured: configured,
    doctorTotal: total,
    strict,
    messages,
  };
}
