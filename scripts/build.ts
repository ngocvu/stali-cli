#!/usr/bin/env bun

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const distFile = path.join(distDir, "index.js");
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));

const MAX_TOTAL_DIST_KB = Number(process.env.STALI_MAX_DIST_KB || 1600);

console.log(`📦 Building stali-cli v${pkg.version} with Bun...\n`);

const startTime = Date.now();

try {
  if (fs.existsSync(distDir)) {
    for (const f of fs.readdirSync(distDir)) {
      if (f.endsWith(".js")) fs.unlinkSync(path.join(distDir, f));
    }
  } else {
    fs.mkdirSync(distDir, { recursive: true });
  }

  console.log("1️⃣  Bundling (splitting, minify)...");
  execSync(
    [
      "bun build src/index.ts",
      "--outdir dist",
      "--target bun",
      "--splitting",
      "--minify",
      `--define process.env.NODE_ENV='"production"'`,
      `--define __STALI_VERSION__='"${pkg.version}"'`,
    ].join(" "),
    { cwd: rootDir, stdio: "inherit" }
  );

  if (fs.existsSync(distFile)) {
    let content = fs.readFileSync(distFile, "utf8");
    if (!content.startsWith("#!/usr/bin/env bun")) {
      content = "#!/usr/bin/env bun\n" + content;
      fs.writeFileSync(distFile, content, "utf8");
    }
    try {
      fs.chmodSync(distFile, 0o755);
    } catch {}
  }

  const chunks = fs.readdirSync(distDir).filter((f) => f.endsWith(".js"));
  const devtoolsChunks = chunks.filter((f) => f.includes("devtools"));
  for (const f of devtoolsChunks) {
    const kb = fs.statSync(path.join(distDir, f)).size / 1024;
    if (kb > 5) {
      console.error(`❌ devtools chunk quá lớn (${kb.toFixed(1)} KB): ${f}`);
      process.exit(1);
    }
  }

  let totalBytes = 0;
  for (const f of chunks) {
    totalBytes += fs.statSync(path.join(distDir, f)).size;
  }
  const totalKb = totalBytes / 1024;

  const duration = Date.now() - startTime;
  const stat = fs.statSync(distFile);
  const sizeKb = (stat.size / 1024).toFixed(2);

  console.log("\n✨ stali-cli build completed!");
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📁 Entry: dist/index.js (${sizeKb} KB)`);
  console.log(`📦 Total dist: ${totalKb.toFixed(0)} KB across ${chunks.length} chunk(s)`);

  if (totalKb > MAX_TOTAL_DIST_KB) {
    console.error(`❌ Total dist ${totalKb.toFixed(0)} KB > limit ${MAX_TOTAL_DIST_KB} KB`);
    process.exit(1);
  }
  console.log("");
} catch (error) {
  console.error("❌ stali-cli build failed:", error);
  process.exit(1);
}
