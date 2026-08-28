#!/usr/bin/env bun
/**
 * Verify npm pack tarball: chỉ bin/dist, không src/, có dist/index.js + bin/stali.js
 */
import { execSync } from "child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`✓ ${msg}`);
}

const root = join(import.meta.dir, "..");
process.chdir(root);

const tgzName = execSync("npm pack --silent", { encoding: "utf8" }).trim();
if (!tgzName.endsWith(".tgz")) fail(`npm pack unexpected output: ${tgzName}`);

const stage = mkdtempSync(join(tmpdir(), "stali-pack-"));
try {
  execSync(`tar -xzf ${JSON.stringify(join(root, tgzName))}`, { cwd: stage });
  const pkgDir = join(stage, "package");
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
    name: string;
    version: string;
    files?: string[];
    bin?: Record<string, string>;
  };

  if (pkg.name !== "stali-cli") fail(`wrong package name: ${pkg.name}`);
  if (!pkg.version) fail("missing version");
  ok(`package ${pkg.name}@${pkg.version}`);

  const required = ["bin/stali.js", "dist/index.js", "CHANGELOG.md", "scripts/npm-postinstall.cjs"];
  for (const rel of required) {
    const p = join(pkgDir, rel);
    if (!statSync(p, { throwIfNoEntry: false })) fail(`missing in tarball: ${rel}`);
    ok(`has ${rel}`);
  }

  if (statSync(join(pkgDir, "src"), { throwIfNoEntry: false })) {
    fail("tarball must not include src/");
  }
  ok("no src/ in tarball");

  const files = readdirSync(join(pkgDir, "dist"));
  if (!files.some((f) => f.endsWith(".js"))) fail("dist/ has no .js bundles");
  ok(`dist/ has ${files.length} entries`);

  if (pkg.bin?.stali !== "./bin/stali.js") fail("bin.stali must point to ./bin/stali.js");
  ok("bin entry OK");

  const allowedRoots = new Set(pkg.files || []);
  if (!allowedRoots.has("bin") || !allowedRoots.has("dist")) {
    fail("package.json files must include bin and dist");
  }
  ok("files field OK");
} finally {
  rmSync(stage, { recursive: true, force: true });
  rmSync(join(root, tgzName), { force: true });
}

console.log("\n✅ npm pack verification passed\n");
