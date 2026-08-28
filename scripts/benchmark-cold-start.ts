#!/usr/bin/env bun
/**
 * Benchmark cold-start paths for stali-cli (no network required for doctor scan).
 * Usage: bun scripts/benchmark-cold-start.ts
 */
import { spawnSync } from "child_process";
import path from "path";

const CLI_ROOT = path.resolve(import.meta.dir, "..");
const CLI = path.join(CLI_ROOT, "dist/index.js");
const BUN = process.env.BUN_BIN || "bun";
const RUNS = Number(process.env.STALI_BENCH_RUNS || 5);

type Bench = { name: string; ms: number };

function runOnce(args: string[]): number {
  const t0 = performance.now();
  spawnSync(BUN, [CLI, ...args], {
    cwd: CLI_ROOT,
    encoding: "utf8",
    timeout: 60000,
  });
  return performance.now() - t0;
}

function bench(name: string, args: string[]): Bench {
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    samples.push(runOnce(args));
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  return { name, ms: Math.round(median) };
}

const results = [
  bench("--version", ["--version"]),
  bench("--help", ["--help"]),
  bench("info --json", ["info", "--json"]),
  bench("gateway scan --json", ["gateway", "scan", "--json"]),
  bench("doctor --json", ["doctor", "--json"]),
  bench("doctor --plugins-only --json", ["doctor", "--plugins-only", "--json"]),
  bench("doctor --tools-only --json", ["doctor", "--tools-only", "--json"]),
  bench("check --tools-only --json", ["check", "--tools-only", "--json"]),
  bench("check --plugins-only --json", ["check", "--plugins-only", "--json"]),
];

const limits: Record<string, number> = {
  "--version": Number(process.env.STALI_BENCH_MAX_VERSION_MS || 120),
  "--help": Number(process.env.STALI_BENCH_MAX_HELP_MS || 150),
};
let failed = false;
console.log(`\n📊 stali-cli cold-start benchmark (${RUNS} runs, median ms)\n`);
for (const r of results) {
  const limit = limits[r.name];
  const warn = limit && r.ms > limit ? " ⚠️" : "";
  if (limit && r.ms > limit) failed = true;
  console.log(`${r.name.padEnd(28)} ${String(r.ms).padStart(6)} ms${warn}`);
}
console.log("");
if (failed && process.env.STALI_BENCH_STRICT === "1") {
  console.error("❌ Benchmark vượt ngưỡng STALI_BENCH_MAX_*_MS");
  process.exit(1);
}
