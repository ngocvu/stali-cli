import { authLogin } from "./auth-cli";
import { runConfigureBatch } from "./configure-batch";
import { runHealthCheck } from "./health-check";

export interface InitOptions {
  apiKey: string;
  skipConfigure?: boolean;
}

export interface InitResult {
  success: boolean;
  steps: { name: string; ok: boolean; detail?: string }[];
}

export async function runInit(opts: InitOptions): Promise<InitResult> {
  const steps: InitResult["steps"] = [];

  const login = await authLogin(opts.apiKey);
  steps.push({
    name: "auth login",
    ok: login.success,
    detail: login.message,
  });
  if (!login.success) {
    return { success: false, steps };
  }

  if (!opts.skipConfigure) {
    const batch = await runConfigureBatch({
      apiKey: opts.apiKey,
      skipAdvanced: true,
      continueOnError: true,
    });
    const okCount = batch.items.filter((i) => i.success).length;
    steps.push({
      name: "configure-all",
      ok: batch.allOk,
      detail: `${okCount}/${batch.items.length} tools`,
    });
  } else {
    steps.push({ name: "configure-all", ok: true, detail: "skipped" });
  }

  const health = await runHealthCheck(false);
  steps.push({
    name: "check",
    ok: health.authOk,
    detail: `${health.doctorConfigured}/${health.doctorTotal} Stali OK`,
  });

  return {
    success: login.success && health.authOk,
    steps,
  };
}
