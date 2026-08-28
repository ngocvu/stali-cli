import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

export interface BenchResult {
  name: string;
  ms: number;
  overLimit?: boolean;
}

export interface BenchReport {
  runs: number;
  results: BenchResult[];
  failed: boolean;
}

function resolveCliEntry(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(here, "../../dist/index.js");
  return dist;
}

function runOnce(cli: string, runner: string, args: string[]): number {
  const t0 = performance.now();
  spawnSync(runner, [cli, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    stdio: "ignore",
  });
  return Math.round(performance.now() - t0);
}

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function benchCase(
  name: string,
  cli: string,
  runner: string,
  args: string[],
  runs: number
): BenchResult {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) samples.push(runOnce(cli, runner, args));
  const ms = median(samples);
  const limits: Record<string, number> = {
    "--version": Number(process.env.STALI_BENCH_MAX_VERSION_MS || 120),
    "--help": Number(process.env.STALI_BENCH_MAX_HELP_MS || 150),
    "info --json": Number(process.env.STALI_BENCH_MAX_INFO_MS || 180),
    "gateway plan --json": Number(process.env.STALI_BENCH_MAX_GATEWAY_PLAN_MS || 180),
    "gateway scan --json": Number(process.env.STALI_BENCH_MAX_GATEWAY_MS || 250),
    "gateway --dry-run --json": Number(process.env.STALI_BENCH_MAX_GATEWAY_AUTO_MS || 300),
    "gateway auto --dry-run --json": Number(process.env.STALI_BENCH_MAX_GATEWAY_AUTO_MS || 300),
    "doctor --json": Number(process.env.STALI_BENCH_MAX_DOCTOR_MS || 300),
    "doctor --tools-only --json": Number(process.env.STALI_BENCH_MAX_DOCTOR_MS || 250),
    "check --tools-only --json": Number(process.env.STALI_BENCH_MAX_CHECK_MS || 200),
    "status --json": Number(process.env.STALI_BENCH_MAX_STATUS_MS || 200),
    "setup --skip-configure --json": Number(process.env.STALI_BENCH_MAX_SETUP_MS || 500),
  };
  const limit = limits[name];
  return { name, ms, overLimit: limit ? ms > limit : false };
}

export function runColdStartBench(options?: {
  runs?: number;
  strict?: boolean;
}): BenchReport {
  const runs = options?.runs ?? Number(process.env.STALI_BENCH_RUNS || 5);
  const runner = process.env.BUN_BIN || process.env.STALI_BENCH_RUNNER || "bun";
  const cli = process.env.STALI_BENCH_CLI || resolveCliEntry();

  const cases: Array<{ name: string; args: string[] }> = [
    { name: "--version", args: ["--version"] },
    { name: "--help", args: ["--help"] },
    { name: "info --json", args: ["info", "--json"] },
    { name: "gateway plan --json", args: ["gateway", "plan", "--json"] },
    {
      name: "gateway --dry-run --json",
      args: [
        "gateway",
        "--dry-run",
        "--json",
        "-k",
        "sk-stali-test-key-for-dry-run-only-000000000000",
      ],
    },
    { name: "gateway auto --dry-run --json", args: ["gateway", "auto", "--dry-run", "--json", "-k", "sk-stali-test-key-for-dry-run-only-000000000000"] },
    { name: "gateway scan --json", args: ["gateway", "scan", "--json"] },
    { name: "doctor --json", args: ["doctor", "--json"] },
    { name: "doctor --tools-only --json", args: ["doctor", "--tools-only", "--json"] },
    { name: "check --tools-only --json", args: ["check", "--tools-only", "--json"] },
    { name: "status --json", args: ["status", "--json"] },
    {
      name: "setup --skip-configure --json",
      args: [
        "setup",
        "--skip-configure",
        "--json",
        "-k",
        "sk-stali-test-key-for-dry-run-only-000000000000",
      ],
    },
  ];

  const results = cases.map((c) => benchCase(c.name, cli, runner, c.args, runs));
  const failed =
    (options?.strict || process.env.STALI_BENCH_STRICT === "1") &&
    results.some((r) => r.overLimit);

  return { runs, results, failed };
}

export function formatBenchReport(report: BenchReport): string {
  const lines = [`\n📊 stali-cli cold-start (${report.runs} runs, median ms)\n`];
  for (const r of report.results) {
    const warn = r.overLimit ? " ⚠️" : "";
    lines.push(`${r.name.padEnd(28)} ${String(r.ms).padStart(6)} ms${warn}`);
  }
  lines.push("");
  return lines.join("\n");
}
