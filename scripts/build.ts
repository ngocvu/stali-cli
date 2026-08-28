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

console.log(`📦 Building stali-cli v${pkg.version} with Bun...\n`);

const startTime = Date.now();

try {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  console.log("1️⃣  Bundling TypeScript (target: bun, code-splitting)...");
  execSync(
    `bun build src/index.ts --outdir dist --target bun --splitting --define __STALI_VERSION__='"${pkg.version}"'`,
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

  const duration = Date.now() - startTime;
  const stat = fs.statSync(distFile);
  const sizeKb = (stat.size / 1024).toFixed(2);
  const chunks = fs.readdirSync(distDir).filter((f) => f.endsWith(".js"));

  console.log("\n✨ stali-cli build completed!");
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📁 Output: dist/index.js (${sizeKb} KB), ${chunks.length} chunk(s)\n`);
} catch (error) {
  console.error("❌ stali-cli build failed:", error);
  process.exit(1);
}
