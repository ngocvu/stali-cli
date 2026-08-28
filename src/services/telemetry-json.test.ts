import { describe, expect, test } from "bun:test";
import { formatTelemetryFlushJson, formatTelemetryStatusJson } from "./telemetry-json";

describe("telemetry-json", () => {
  test("formatTelemetryStatusJson schema v2", () => {
    const json = formatTelemetryStatusJson({ enabled: false }, { ok: true, status: 200 }, 0);
    expect(json.schemaVersion).toBe(2);
    expect(json.command).toBe("telemetry-status");
    expect(json.enabled).toBe(false);
    expect(json.queueDepth).toBe(0);
  });

  test("formatTelemetryFlushJson", () => {
    const json = formatTelemetryFlushJson({ before: 2, sent: 1, remaining: 1, after: 1 });
    expect(json.command).toBe("telemetry-flush");
    expect(json.schemaVersion).toBe(2);
    expect(json.sent).toBe(1);
  });
});
