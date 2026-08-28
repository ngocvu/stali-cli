import { describe, expect, test } from "bun:test";
import { startDoctorMetricsServer, stopDoctorMetricsServer } from "./doctor-metrics-server";

describe("doctor-metrics-server", () => {
  test("serves /metrics on localhost", async () => {
    let body = "stali_doctor_configured 0\n";
    const server = startDoctorMetricsServer(() => body, 0);
    await new Promise<void>((r) => server.on("listening", () => r()));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/metrics`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("stali_doctor_configured");
    body = "stali_doctor_configured 3\n";
    const res2 = await fetch(`http://127.0.0.1:${port}/metrics`);
    expect(await res2.text()).toContain("stali_doctor_configured 3");
    await stopDoctorMetricsServer(server);
  });
});
