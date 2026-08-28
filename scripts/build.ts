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
const wizardOnlyDir = path.join(runtimeDir, "wizard-only");
const distFile = path.join(distDir, "index.js");
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));

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

function listJsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      for (const sub of listJsFiles(p)) out.push(path.join(f, sub));
    } else if (f.endsWith(".js")) {
      out.push(f);
    }
  }
  return out;
}

function dirTotalKb(dir: string): number {
  let bytes = 0;
  for (const rel of listJsFiles(dir)) {
    bytes += fs.statSync(path.join(dir, rel)).size;
  }
  return bytes / 1024;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function extractLocalImports(src: string): string[] {
  const imports = new Set<string>();
  for (const re of [/from"\.\/([^"]+\.js)"/g, /import\("\.\/([^"]+\.js)"\)/g]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) imports.add(m[1]);
  }
  return [...imports];
}

function reachableFrom(entry: string, dir: string, files: Set<string>): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f) || !files.has(f)) continue;
    seen.add(f);
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    for (const dep of extractLocalImports(src)) {
      if (!dep.includes("/")) queue.push(dep);
    }
  }
  return seen;
}

function rewriteImports(filePath: string, rewrites: Map<string, string>) {
  let src = fs.readFileSync(filePath, "utf8");
  for (const [from, to] of rewrites) {
    src = src.replaceAll(`from"./${from}"`, `from"./${to}"`);
    src = src.replaceAll(`import("./${from}")`, `import("./${to}")`);
  }
  fs.writeFileSync(filePath, src);
}

/** Chunks chỉ wizard entry cần → dist/runtime/wizard-only/ */
function partitionWizardOnlyChunks() {
  const topFiles = fs.readdirSync(runtimeDir).filter((f) => f.endsWith(".js"));
  const fileSet = new Set(topFiles);
  const subReach = reachableFrom("subcommand-cli.js", runtimeDir, fileSet);
  const wizReach = reachableFrom("wizard-cli.js", runtimeDir, fileSet);
  const wizardOnly = [...wizReach].filter((f) => !subReach.has(f) && f !== "wizard-cli.js");

  if (wizardOnly.length === 0) return { moved: 0, wizardOnlyKb: 0 };

  fs.mkdirSync(wizardOnlyDir, { recursive: true });
  const rewrites = new Map<string, string>();
  let wizardOnlyKb = 0;

  for (const f of wizardOnly) {
    const srcPath = path.join(runtimeDir, f);
    const destPath = path.join(wizardOnlyDir, f);
    fs.renameSync(srcPath, destPath);
    rewrites.set(f, `wizard-only/${f}`);
    wizardOnlyKb += fs.statSync(destPath).size / 1024;
  }

  const allRuntimeJs: string[] = [];
  for (const f of fs.readdirSync(runtimeDir)) {
    if (f.endsWith(".js")) allRuntimeJs.push(path.join(runtimeDir, f));
  }
  for (const f of listJsFiles(wizardOnlyDir)) {
    allRuntimeJs.push(path.join(wizardOnlyDir, f));
  }
  for (const abs of allRuntimeJs) rewriteImports(abs, rewrites);

  return { moved: wizardOnly.length, wizardOnlyKb };
}

function writeChecksumManifest(version: string) {
  const entries: Record<string, string> = {};
  for (const rel of ["dist/index.js", "dist/cli-route.js"]) {
    const p = path.join(rootDir, rel);
    if (fs.existsSync(p)) entries[rel] = sha256File(p);
  }
  const standalone = path.join(distDir, "stali-standalone");
  if (fs.existsSync(standalone)) {
    entries["dist/stali-standalone"] = sha256File(standalone);
  }
  for (const rel of listJsFiles(runtimeDir)) {
    entries[`dist/runtime/${rel.replace(/\\/g, "/")}`] = sha256File(path.join(runtimeDir, rel));
  }

  const runtimeKb = dirTotalKb(runtimeDir);
  const routerKb =
    (fs.existsSync(distFile) ? fs.statSync(distFile).size : 0) +
    (fs.existsSync(path.join(distDir, "cli-route.js"))
      ? fs.statSync(path.join(distDir, "cli-route.js")).size
      : 0);
  const standaloneKb = fs.existsSync(standalone) ? fs.statSync(standalone).size / 1024 : 0;
  const bundleKb = runtimeKb + routerKb / 1024;

  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    layout: "runtime-shared+wizard-only",
    sizesKb: {
      runtime: Math.round(runtimeKb),
      router: Math.round(routerKb / 1024),
      standalone: Math.round(standaloneKb),
      bundle: Math.round(bundleKb),
      total: Math.round(bundleKb + standaloneKb),
    },
    files: entries,
  };
  fs.writeFileSync(path.join(distDir, "checksums.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

console.log(`📦 Building stali-cli v${pkg.version} (shared runtime + wizard-only)...\n`);

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

  const wizardRefs = ["Wizard-", "wizard-launcher", "/ui/Wizard"];
  const subSrc = fs.readFileSync(path.join(runtimeDir, "subcommand-cli.js"), "utf8");
  for (const ref of wizardRefs) {
    if (subSrc.includes(ref)) {
      console.error(`❌ subcommand-cli.js vẫn tham chiếu wizard: ${ref}`);
      process.exit(1);
    }
  }

  const { moved, wizardOnlyKb } = partitionWizardOnlyChunks();
  const runtimeKb = dirTotalKb(runtimeDir);
  const topLevelCount = fs.readdirSync(runtimeDir).filter((f) => f.endsWith(".js")).length;
  console.log(
    `3️⃣  wizard-only: ${moved} chunk(s) → runtime/wizard-only/ (~${wizardOnlyKb.toFixed(0)} KB); subcommand dir: ${topLevelCount} top-level files`
  );

  if (process.env.STALI_BUILD_STANDALONE === "1") {
    console.log("4️⃣  Standalone binary (subcommand entry)…");
    const out = path.join(distDir, "stali-standalone");
    try {
      execSync(
        `bun build "${path.join(runtimeDir, "subcommand-cli.js")}" --compile --outfile "${out}"`,
        { cwd: rootDir, stdio: "inherit" }
      );
      fs.chmodSync(out, 0o755);
      console.log(`   → dist/stali-standalone (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
    } catch (e) {
      console.warn("   ⚠️  Standalone compile skipped:", (e as Error).message);
    }
  }

  const manifest = writeChecksumManifest(pkg.version);
  const duration = Date.now() - startTime;

  console.log("\n✨ stali-cli build completed!");
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📁 Router: dist/index.js`);
  console.log(`📦 Runtime total: ${runtimeKb.toFixed(0)} KB`);
  console.log(`🔐 Checksums: ${Object.keys(manifest.files).length} files`);

  if (runtimeKb > MAX_RUNTIME_KB) {
    console.error(`❌ Runtime ${runtimeKb.toFixed(0)} KB > ${MAX_RUNTIME_KB} KB`);
    process.exit(1);
  }
  if (manifest.sizesKb.bundle > MAX_TOTAL_DIST_KB) {
    console.error(`❌ Bundle ${manifest.sizesKb.bundle} KB > ${MAX_TOTAL_DIST_KB} KB`);
    process.exit(1);
  }
  console.log("");
} catch (error) {
  console.error("❌ stali-cli build failed:", error);
  process.exit(1);
}
