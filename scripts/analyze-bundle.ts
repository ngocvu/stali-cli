#!/usr/bin/env bun
/** In báo cáo kích thước shared runtime dist (sau build). */
import fs from "fs";
import path from "path";

const distDir = path.resolve(import.meta.dir, "..", "dist");
const runtimeDir = path.join(distDir, "runtime");

if (!fs.existsSync(distDir)) {
  console.error("Chạy bun run build trước.");
  process.exit(1);
}

function reportDir(label: string, dir: string) {
  if (!fs.existsSync(dir)) {
    console.log(`\n⚠️  ${label}: (missing)\n`);
    return 0;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, kb: stat.size / 1024 };
    })
    .sort((a, b) => b.kb - a.kb);

  let total = 0;
  console.log(`\n📊 ${label} (${files.length} files)\n`);
  for (const f of files.slice(0, 15)) {
    total += f.kb;
    console.log(`${f.kb.toFixed(1).padStart(8)}  ${f.name}`);
  }
  if (files.length > 15) console.log(`   … +${files.length - 15} more`);
  const all = files.reduce((s, f) => s + f.kb, 0);
  console.log(`${"—".repeat(40)}`);
  console.log(`${all.toFixed(0).padStart(8)}  TOTAL\n`);
  return all;
}

const routerKb =
  (fs.existsSync(path.join(distDir, "index.js"))
    ? fs.statSync(path.join(distDir, "index.js")).size
    : 0) / 1024;
const runtimeKb = reportDir("dist/runtime (shared)", runtimeDir);
console.log(`Router: ${routerKb.toFixed(1)} KB`);
console.log(`Grand total: ${(routerKb + runtimeKb).toFixed(0)} KB`);

const checksums = path.join(distDir, "checksums.json");
if (fs.existsSync(checksums)) {
  const m = JSON.parse(fs.readFileSync(checksums, "utf8"));
  console.log(`Checksum manifest v${m.version} layout=${m.layout}: ${Object.keys(m.files).length} files`);
}
