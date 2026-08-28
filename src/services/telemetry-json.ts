import type { TelemetryConfig } from "./telemetry";

export function formatTelemetryStatusJson(
  cfg: TelemetryConfig,
  endpoint: { ok: boolean; status?: number },
  queueDepth: number
): Record<string, unknown> {
  return {
    command: "telemetry-status",
    schemaVersion: 2,
    enabled: cfg.enabled,
    consentAt: cfg.consentAt,
    endpoint,
    queueDepth,
  };
}

export function formatTelemetryFlushJson(input: {
  before: number;
  sent: number;
  remaining: number;
  after: number;
}): Record<string, unknown> {
  return {
    command: "telemetry-flush",
    schemaVersion: 2,
    ...input,
  };
}
