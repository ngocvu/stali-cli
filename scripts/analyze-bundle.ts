#!/usr/bin/env bun
/** In báo cáo kích thước chunk dist (sau build). */
import fs from "fs";
import path from "path";

const distDir = path.resolve(import.meta.dir, "..", "dist");
if (!fs.existsSync(distDir)) {
  console.error("Chạy bun run build trước.");
  process.exit(1);
}

const files = fs
  .readdirSync(distDir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => {
    const stat = fs.statSync(path.join(distDir, f));
    return { name: f, kb: stat.size / 1024 };
  })
  .sort((a, b) => b.kb - a.kb);

let total = 0;
console.log("\n📊 dist chunk sizes (KB)\n");
for (const f of files) {
  total += f.kb;
  console.log(`${f.kb.toFixed(1).padStart(8)}  ${f.name}`);
}
console.log(`${"—".repeat(40)}`);
console.log(`${total.toFixed(0).padStart(8)}  TOTAL (${files.length} files)\n`);
