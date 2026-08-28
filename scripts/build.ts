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
const subDir = path.join(distDir, "subcommand");
const wizDir = path.join(distDir, "wizard");
const distFile = path.join(distDir, "index.js");
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));

const MAX_SUBCOMMAND_KB = Number(process.env.STALI_MAX_SUBCOMMAND_KB || 700);
const MAX_WIZARD_KB = Number(process.env.STALI_MAX_WIZARD_KB || 1100);
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

function writeChecksumManifest(
  version: string,
  sub: { files: string[]; totalKb: number },
  wiz: { files: string[]; totalKb: number }
) {
  const entries: Record<string, string> = {};
  for (const rel of ["index.js"]) {
    const p = path.join(distDir, rel);
    if (fs.existsSync(p)) entries[rel] = sha256File(p);
  }
  for (const f of sub.files) {
    entries[`subcommand/${f}`] = sha256File(path.join(subDir, f));
  }
  for (const f of wiz.files) {
    entries[`wizard/${f}`] = sha256File(path.join(wizDir, f));
  }
  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    sizesKb: {
      subcommand: Math.round(sub.totalKb),
      wizard: Math.round(wiz.totalKb),
      total: Math.round(sub.totalKb + wiz.totalKb + (fs.statSync(distFile).size / 1024)),
    },
    files: entries,
  };
  fs.writeFileSync(path.join(distDir, "checksums.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

console.log(`📦 Building stali-cli v${pkg.version} (dual dist)...\n`);

const startTime = Date.now();
const defineFlags = [
  `--define process.env.NODE_ENV='"production"'`,
  `--define __STALI_VERSION__='"${pkg.version}"'`,
].join(" ");

try {
  rimraf(distDir);
  fs.mkdirSync(subDir, { recursive: true });
  fs.mkdirSync(wizDir, { recursive: true });

  console.log("1️⃣  Subcommand bundle → dist/subcommand/ …");
  execSync(
    [
      "bun build src/subcommand-cli.ts",
      "--outdir dist/subcommand",
      "--target bun",
      "--splitting",
      "--minify",
      defineFlags,
    ].join(" "),
    { cwd: rootDir, stdio: "inherit" }
  );

  console.log("2️⃣  Wizard bundle → dist/wizard/ …");
  execSync(
    [
      "bun build src/wizard-cli.ts",
      "--outdir dist/wizard",
      "--target bun",
      "--splitting",
      "--minify",
      defineFlags,
    ].join(" "),
    { cwd: rootDir, stdio: "inherit" }
  );

  console.log("3️⃣  Router (cli-route + index.js)…");
  execSync(
    `bun build src/cli-route.ts --outdir dist --target bun --minify ${defineFlags}`,
    { cwd: rootDir, stdio: "inherit" }
  );

  const routerSrc = `#!/usr/bin/env bun
import { resolveCliMode } from "./cli-route.js";

const mode = resolveCliMode(process.argv);
if (mode === "wizard") {
  await import("./wizard/wizard-cli.js");
} else {
  await import("./subcommand/subcommand-cli.js");
}
`;
  fs.writeFileSync(distFile, routerSrc, "utf8");

  ensureShebang(distFile);
  ensureShebang(path.join(subDir, "subcommand-cli.js"));
  ensureShebang(path.join(wizDir, "wizard-cli.js"));

  const sub = dirStats(subDir);
  const wiz = dirStats(wizDir);

  for (const f of sub.files.filter((n) => n.includes("devtools"))) {
    const kb = fs.statSync(path.join(subDir, f)).size / 1024;
    if (kb > 5) {
      console.error(`❌ devtools chunk quá lớn (${kb.toFixed(1)} KB): subcommand/${f}`);
      process.exit(1);
    }
  }

  const subEntry = path.join(subDir, "subcommand-cli.js");
  const subSrc = fs.readFileSync(subEntry, "utf8");
  const wizardRefs = ["Wizard-", "wizard-launcher", "/ui/Wizard"];
  for (const ref of wizardRefs) {
    if (subSrc.includes(ref)) {
      console.error(`❌ subcommand/subcommand-cli.js vẫn tham chiếu wizard: ${ref}`);
      process.exit(1);
    }
  }
  for (const f of sub.files) {
    const chunk = fs.readFileSync(path.join(subDir, f), "utf8");
    for (const ref of wizardRefs) {
      if (chunk.includes(ref)) {
        console.error(`❌ subcommand/${f} tham chiếu wizard: ${ref}`);
        process.exit(1);
      }
    }
  }
  console.log("4️⃣  subcommand bundle: tách khỏi wizard/React ✓");

  const manifest = writeChecksumManifest(pkg.version, sub, wiz);
  const totalKb = manifest.sizesKb.total;
  const duration = Date.now() - startTime;
  const indexKb = (fs.statSync(distFile).size / 1024).toFixed(2);

  console.log("\n✨ stali-cli build completed!");
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📁 Router: dist/index.js (${indexKb} KB)`);
  console.log(
    `📦 Subcommand: ${sub.totalKb.toFixed(0)} KB (${sub.files.length} files) | Wizard: ${wiz.totalKb.toFixed(0)} KB (${wiz.files.length} files)`
  );
  console.log(`🔐 Checksums: dist/checksums.json (${Object.keys(manifest.files).length} files)`);

  if (sub.totalKb > MAX_SUBCOMMAND_KB) {
    console.error(`❌ Subcommand ${sub.totalKb.toFixed(0)} KB > ${MAX_SUBCOMMAND_KB} KB`);
    process.exit(1);
  }
  if (wiz.totalKb > MAX_WIZARD_KB) {
    console.error(`❌ Wizard ${wiz.totalKb.toFixed(0)} KB > ${MAX_WIZARD_KB} KB`);
    process.exit(1);
  }
  if (totalKb > MAX_TOTAL_DIST_KB) {
    console.error(`❌ Total dist ${totalKb} KB > limit ${MAX_TOTAL_DIST_KB} KB`);
    process.exit(1);
  }
  console.log("");
} catch (error) {
  console.error("❌ stali-cli build failed:", error);
  process.exit(1);
}
