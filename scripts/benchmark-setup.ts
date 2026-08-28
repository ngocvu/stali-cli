#!/usr/bin/env bun
/**
 * Benchmark setup path (offline-safe: --skip-configure).
 * Usage: bun scripts/benchmark-setup.ts
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = process.env.STALI_BENCH_CLI || path.resolve(here, "../dist/index.js");
const runner = process.env.BUN_BIN || process.env.STALI_BENCH_RUNNER || "bun";
const runs = Number(process.env.STALI_BENCH_RUNS || 3);
const fakeKey = "sk-stali-test-key-for-dry-run-only-000000000000";

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function runSetupDurationMs(): number | null {
  const r = spawnSync(
    runner,
    [cli, "setup", "--skip-configure", "--json", "-k", fakeKey],
    { encoding: "utf8", timeout: 60_000, env: { ...process.env, STALI_HOME: process.env.STALI_HOME } }
  );
  try {
    const parsed = JSON.parse(r.stdout || "{}") as { durationMs?: number };
    return typeof parsed.durationMs === "number" ? parsed.durationMs : null;
  } catch {
    return null;
  }
}

const samples: number[] = [];
for (let i = 0; i < runs; i++) {
  const ms = runSetupDurationMs();
  if (ms !== null) samples.push(ms);
}

if (samples.length === 0) {
  console.error("❌ Không đo được setup durationMs (build dist trước: bun run build)");
  process.exit(1);
}

const med = median(samples);
const limit = Number(process.env.STALI_BENCH_MAX_SETUP_DURATION_MS || 800);
console.log(`\n📊 setup --skip-configure --json (${runs} runs)\n`);
console.log(`   durationMs (median): ${med} ms`);
console.log(`   limit: ${limit} ms${med > limit ? " ⚠️" : ""}\n`);

if (process.env.STALI_BENCH_STRICT === "1" && med > limit) {
  process.exit(1);
}
