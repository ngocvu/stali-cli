#!/usr/bin/env bun

import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const runtimeDir = path.join(distDir, "runtime");
const distFile = path.join(distDir, "index.js");
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));

const MAX_SUBCOMMAND_KB = Number(process.env.STALI_MAX_SUBCOMMAND_KB || 700);
const MAX_WIZARD_KB = Number(process.env.STALI_MAX_WIZARD_KB || 1100);
const MAX_RUNTIME_KB = Number(process.env.STALI_MAX_RUNTIME_KB || 1300);
const MAX_TOTAL_DIST_KB = Number(process.env.STALI_MAX_DIST_KB || 1600);

function rimraf(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) rimraf(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

function ensureShebang(file: string) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, "utf8");
  if (!content.startsWith("#!/usr/bin/env bun")) {
    content = "#!/usr/bin/env bun\n" + content;
    fs.writeFileSync(file, content, "utf8");
  }
  try {
    fs.chmodSync(file, 0o755);
  } catch {}
}

function dirStats(dir: string) {
  if (!fs.existsSync(dir)) return { files: [] as string[], totalKb: 0 };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
  let totalBytes = 0;
  for (const f of files) {
    totalBytes += fs.statSync(path.join(dir, f)).size;
  }
  return { files, totalKb: totalBytes / 1024 };
}

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeChecksumManifest(version: string, runtime: { files: string[]; totalKb: number }) {
  const entries: Record<string, string> = {};
  for (const rel of ["dist/index.js", "dist/cli-route.js"]) {
    const p = path.join(rootDir, rel);
    if (fs.existsSync(p)) entries[rel] = sha256File(p);
  }
  for (const f of runtime.files) {
    entries[`dist/runtime/${f}`] = sha256File(path.join(runtimeDir, f));
  }
  const routerKb = fs.existsSync(distFile) ? fs.statSync(distFile).size / 1024 : 0;
  const routeKb = fs.existsSync(path.join(distDir, "cli-route.js"))
    ? fs.statSync(path.join(distDir, "cli-route.js")).size / 1024
    : 0;
  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    layout: "runtime-shared",
    sizesKb: {
      runtime: Math.round(runtime.totalKb),
      router: Math.round(routerKb + routeKb),
      total: Math.round(runtime.totalKb + routerKb + routeKb),
    },
    files: entries,
  };
  fs.writeFileSync(path.join(distDir, "checksums.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

console.log(`📦 Building stali-cli v${pkg.version} (shared runtime)...\n`);

const startTime = Date.now();
const defineFlags = [
  `--define process.env.NODE_ENV='"production"'`,
  `--define __STALI_VERSION__='"${pkg.version}"'`,
].join(" ");

try {
  rimraf(distDir);
  fs.mkdirSync(runtimeDir, { recursive: true });

  console.log("1️⃣  Shared runtime (subcommand + wizard, deduped chunks)…");
  execSync(
    [
      "bun build src/subcommand-cli.ts src/wizard-cli.ts",
      "--outdir dist/runtime",
      "--target bun",
      "--splitting",
      "--minify",
      defineFlags,
    ].join(" "),
    { cwd: rootDir, stdio: "inherit" }
  );

  console.log("2️⃣  Router (cli-route + index.js)…");
  execSync(
    `bun build src/cli-route.ts --outdir dist --target bun --minify ${defineFlags}`,
    { cwd: rootDir, stdio: "inherit" }
  );

  const routerSrc = `#!/usr/bin/env bun
import { resolveCliMode } from "./cli-route.js";

const mode = resolveCliMode(process.argv);
if (mode === "wizard") {
  await import("./runtime/wizard-cli.js");
} else {
  await import("./runtime/subcommand-cli.js");
}
`;
  fs.writeFileSync(distFile, routerSrc, "utf8");

  ensureShebang(distFile);
  ensureShebang(path.join(runtimeDir, "subcommand-cli.js"));
  ensureShebang(path.join(runtimeDir, "wizard-cli.js"));

  const runtime = dirStats(runtimeDir);
  const subEntry = path.join(runtimeDir, "subcommand-cli.js");
  const wizEntry = path.join(runtimeDir, "wizard-cli.js");

  const wizardRefs = ["Wizard-", "wizard-launcher", "/ui/Wizard"];
  const subSrc = fs.readFileSync(subEntry, "utf8");
  for (const ref of wizardRefs) {
    if (subSrc.includes(ref)) {
      console.error(`❌ runtime/subcommand-cli.js vẫn tham chiếu wizard: ${ref}`);
      process.exit(1);
    }
  }

  let wizardOnlyKb = 0;
  let sharedKb = 0;
  for (const f of runtime.files) {
    const chunkPath = path.join(runtimeDir, f);
    const kb = fs.statSync(chunkPath).size / 1024;
    const src = fs.readFileSync(chunkPath, "utf8");
    const isWizardOnly = wizardRefs.some((r) => src.includes(r));
    if (isWizardOnly) wizardOnlyKb += kb;
    else sharedKb += kb;
  }
  console.log(
    `3️⃣  runtime: ~${sharedKb.toFixed(0)} KB shared + ~${wizardOnlyKb.toFixed(0)} KB wizard-only (${runtime.files.length} files)`
  );

  const manifest = writeChecksumManifest(pkg.version, runtime);
  const duration = Date.now() - startTime;
  const indexKb = (fs.statSync(distFile).size / 1024).toFixed(2);

  console.log("\n✨ stali-cli build completed!");
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📁 Router: dist/index.js (${indexKb} KB)`);
  console.log(`📦 Runtime (deduped): ${runtime.totalKb.toFixed(0)} KB`);
  console.log(`🔐 Checksums: dist/checksums.json (${Object.keys(manifest.files).length} files)`);

  if (!fs.existsSync(wizEntry)) {
    console.error("❌ Missing runtime/wizard-cli.js");
    process.exit(1);
  }

  if (runtime.totalKb > MAX_RUNTIME_KB) {
    console.error(`❌ Runtime ${runtime.totalKb.toFixed(0)} KB > ${MAX_RUNTIME_KB} KB`);
    process.exit(1);
  }
  if (manifest.sizesKb.total > MAX_TOTAL_DIST_KB) {
    console.error(`❌ Total dist ${manifest.sizesKb.total} KB > limit ${MAX_TOTAL_DIST_KB} KB`);
    process.exit(1);
  }
  console.log("");
} catch (error) {
  console.error("❌ stali-cli build failed:", error);
  process.exit(1);
}
