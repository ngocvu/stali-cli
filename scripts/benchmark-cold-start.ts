#!/usr/bin/env bun
/**
 * Benchmark cold-start paths for stali-cli.
 * Usage: bun scripts/benchmark-cold-start.ts
 */
import { formatBenchReport, runColdStartBench } from "../src/services/bench-cli";

const report = runColdStartBench({ strict: process.env.STALI_BENCH_STRICT === "1" });
console.log(formatBenchReport(report));
if (report.failed) {
  console.error("❌ Benchmark vượt ngưỡng STALI_BENCH_MAX_*_MS");
  process.exit(1);
}
