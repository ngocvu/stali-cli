/** Exponential backoff fetch — dùng cho telemetry opt-in (không throw). */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: {
    attempts?: number;
    backoffMs?: number[];
    timeoutMs?: number;
  }
): Promise<{ ok: boolean; status?: number }> {
  const attempts = opts?.attempts ?? 3;
  const backoffMs = opts?.backoffMs ?? [0, 400, 1200];
  const timeoutMs = opts?.timeoutMs ?? 2500;

  for (let i = 0; i < attempts; i++) {
    const delay = backoffMs[i] ?? backoffMs[backoffMs.length - 1] ?? 0;
    if (delay > 0) await sleep(delay);

    try {
      const r = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) {
        return { ok: r.ok, status: r.status };
      }
    } catch {
      /* retry */
    }
  }
  return { ok: false };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
