import fs from "fs/promises";
import path from "path";
import { getStaliHome } from "../constants/paths";
import { VERSION } from "../version";

export interface TelemetryConfig {
  enabled: boolean;
  consentAt?: string;
}

const CONFIG_FILE = "telemetry.json";
const DEFAULT_URL =
  process.env.STALI_TELEMETRY_URL || "https://api.stali.vn/v1/telemetry/cli";

const SKIP_COMMANDS = new Set(["telemetry", "bench", "wizard"]);

function configPath(): string {
  return path.join(getStaliHome(), CONFIG_FILE);
}

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

export async function recordCliTelemetry(command: string): Promise<void> {
  if (process.env.STALI_TELEMETRY === "0") return;
  if (SKIP_COMMANDS.has(command)) return;

  const cfg = await readTelemetryConfig();
  if (!cfg.enabled) return;

  const body = {
    v: 1,
    command,
    cliVersion: VERSION,
    platform: `${process.platform}/${process.arch}`,
    ts: new Date().toISOString(),
  };

  try {
    await fetch(DEFAULT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    /* opt-in telemetry — không làm fail CLI */
  }
}
