import { describe, expect, test } from "bun:test";
import { invalidateDoctorScanCache, runDoctorScan } from "./index";

describe("doctor scan cache", () => {
  test("invalidateDoctorScanCache resets cache", async () => {
    invalidateDoctorScanCache();
    const first = await runDoctorScan();
    const second = await runDoctorScan();
    expect(first).toBe(second);
    invalidateDoctorScanCache();
    const third = await runDoctorScan();
    expect(third).toEqual(first);
  });
});
