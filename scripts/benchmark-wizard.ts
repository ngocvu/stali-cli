#!/usr/bin/env bun
/**
 * Đo thời gian spawn wizard Ink (CLI không args, kill sau timeout).
 * Usage: bun scripts/benchmark-wizard.ts
 */
import { formatBenchReport, runColdStartBench } from "../src/services/bench-cli";

const report = runColdStartBench({ runs: 3, strict: false });
const wizard = report.results.find((r) => r.name === "wizard spawn");
console.log(formatBenchReport(report));
if (wizard) {
  console.log(`\n🧙 wizard spawn (median): ${wizard.ms} ms`);
  console.log(`   limit: ${process.env.STALI_BENCH_MAX_WIZARD_MS || 900} ms\n`);
}
process.exit(report.failed ? 1 : 0);
