import fs from "fs/promises";
import path from "path";
import { getStaliHome } from "../constants/paths";
import { VERSION } from "../version";
import { fetchWithRetry } from "../utils/fetch-retry";

export interface TelemetryConfig {
  enabled: boolean;
  consentAt?: string;
}

const CONFIG_FILE = "telemetry.json";
const QUEUE_FILE = "telemetry-queue.jsonl";
const DEFAULT_URL =
  process.env.STALI_TELEMETRY_URL || "https://api.stali.vn/v1/telemetry/cli";

const SKIP_COMMANDS = new Set(["telemetry", "bench", "wizard"]);

function configPath(): string {
  return path.join(getStaliHome(), CONFIG_FILE);
}

function queuePath(): string {
  return path.join(getStaliHome(), QUEUE_FILE);
}

export type TelemetryPayload = {
  v: number;
  command: string;
  cliVersion: string;
  platform: string;
  ts: string;
};

export async function readTelemetryConfig(): Promise<TelemetryConfig> {
  try {
    const raw = await fs.readFile(configPath(), "utf8");
    const data = JSON.parse(raw) as TelemetryConfig;
    return { enabled: Boolean(data.enabled), consentAt: data.consentAt };
  } catch {
    return { enabled: false };
  }
}

export async function writeTelemetryConfig(cfg: TelemetryConfig): Promise<string> {
  const home = getStaliHome();
  await fs.mkdir(home, { recursive: true });
  const file = configPath();
  await fs.writeFile(
    file,
    JSON.stringify(
      {
        ...cfg,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  return file;
}

export async function setTelemetryEnabled(enabled: boolean): Promise<TelemetryConfig> {
  const cfg: TelemetryConfig = {
    enabled,
    consentAt: enabled ? new Date().toISOString() : undefined,
  };
  await writeTelemetryConfig(cfg);
  return cfg;
}

export async function fetchTelemetryEndpointHealth(): Promise<{ ok: boolean; status?: number }> {
  try {
    const url = DEFAULT_URL.includes("?") ? `${DEFAULT_URL}&ping=1` : `${DEFAULT_URL}?ping=1`;
    const r = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false };
  }
}

function retryAttempts(): number {
  const n = Number(process.env.STALI_TELEMETRY_RETRIES || 3);
  return Number.isFinite(n) && n > 0 ? Math.min(5, Math.trunc(n)) : 3;
}

export async function postTelemetryPayload(payload: TelemetryPayload): Promise<boolean> {
  const res = await fetchWithRetry(
    DEFAULT_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { attempts: retryAttempts() }
  );
  return res.ok;
}

async function enqueueTelemetryPayload(payload: TelemetryPayload): Promise<void> {
  const home = getStaliHome();
  await fs.mkdir(home, { recursive: true });
  await fs.appendFile(queuePath(), `${JSON.stringify(payload)}\n`, "utf8");
}

/** Gửi lại event trong queue (tối đa 50 dòng/lần). */
export async function flushTelemetryQueue(limit = 50): Promise<{ sent: number; remaining: number }> {
  const file = queuePath();
  let raw = "";
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return { sent: 0, remaining: 0 };
  }

  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length === 0) {
    await fs.unlink(file).catch(() => {});
    return { sent: 0, remaining: 0 };
  }

  const kept: string[] = [];
  let sent = 0;
  for (const line of lines.slice(0, limit)) {
    try {
      const payload = JSON.parse(line) as TelemetryPayload;
      const ok = await postTelemetryPayload(payload);
      if (ok) sent += 1;
      else kept.push(line);
    } catch {
      /* drop malformed */
    }
  }
  kept.push(...lines.slice(limit));

  if (kept.length === 0) await fs.unlink(file).catch(() => {});
  else await fs.writeFile(file, `${kept.join("\n")}\n`, "utf8");

  return { sent, remaining: kept.length };
}

export async function readTelemetryQueueDepth(): Promise<number> {
  try {
    const raw = await fs.readFile(queuePath(), "utf8");
    return raw.split("\n").filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}

export async function recordCliTelemetry(command: string): Promise<void> {
  if (process.env.STALI_TELEMETRY === "0") return;
  if (SKIP_COMMANDS.has(command)) return;

  const cfg = await readTelemetryConfig();
  if (!cfg.enabled) return;

  await flushTelemetryQueue();

  const body: TelemetryPayload = {
    v: 1,
    command,
    cliVersion: VERSION,
    platform: `${process.platform}/${process.arch}`,
    ts: new Date().toISOString(),
  };

  const ok = await postTelemetryPayload(body);
  if (!ok) await enqueueTelemetryPayload(body);
}
