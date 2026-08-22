import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import {
  getStaliBinDir,
  getStaliCliInstallDir,
} from "../constants/paths";

const DEFAULT_REPO = "https://github.com/ngocvu/stali-cli.git";
const DEFAULT_BRANCH = "main";

export interface SelfUpdateResult {
  success: boolean;
  message: string;
  installDir?: string;
  error?: string;
}

function bunBin(): string {
  return process.env.BUN_BIN || "bun";
}

function runBun(args: string[], cwd: string): { ok: boolean; detail: string } {
  const r = spawnSync(bunBin(), args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    timeout: 120_000,
  });
  const detail = ((r.stdout || "") + (r.stderr || "")).slice(0, 500);
  return { ok: r.status === 0, detail };
}

function githubZipUrl(repo: string, branch: string): string {
  const repoUrl = repo.replace(/\.git$/, "");
  const m = repoUrl.match(/github\.com[:/]([^/]+)\/([^/]+)$/);
  if (!m) throw new Error(`Cannot derive zip URL from ${repo}`);
  return `https://github.com/${m[1]}/${m[2]}/archive/refs/heads/${branch}.zip`;
}

async function fetchZipTo(installRoot: string, repo: string, branch: string) {
  const zipUrl = githubZipUrl(repo, branch);
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), "stali-update-"));
  try {
    const res = await fetch(zipUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const zipFile = path.join(stage, "repo.zip");
    await fs.writeFile(zipFile, buf);

    const extractDir = path.join(stage, "extract");
    await fs.mkdir(extractDir, { recursive: true });
    const unzip = spawnSync("unzip", ["-q", zipFile, "-d", extractDir], {
      encoding: "utf8",
    });
    if (unzip.status !== 0) {
      throw new Error("unzip failed — cài unzip hoặc dùng git");
    }

    const entries = await fs.readdir(extractDir, { withFileTypes: true });
    const folder = entries.find((e) => e.isDirectory() && e.name.startsWith("stali-cli"));
    if (!folder) throw new Error("Unexpected zip layout");

    await fs.rm(installRoot, { recursive: true, force: true });
    await fs.mkdir(path.dirname(installRoot), { recursive: true });
    await fs.rename(path.join(extractDir, folder.name), installRoot);
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
}

async function pullGit(installRoot: string, branch: string) {
  const pull = spawnSync("git", ["pull", "--ff-only", "origin", branch], {
    cwd: installRoot,
    encoding: "utf8",
  });
  if (pull.status !== 0) {
    throw new Error(pull.stderr || pull.stdout || "git pull failed");
  }
}

export async function registerStaliShim(installRoot: string): Promise<void> {
  const staliJs = path.join(installRoot, "bin", "stali.js");
  try {
    await fs.access(staliJs);
  } catch {
    throw new Error(`Missing ${staliJs} after build`);
  }

  const binDir = getStaliBinDir();
  await fs.mkdir(binDir, { recursive: true });

  if (process.platform === "win32") {
    const bunExe = spawnSync("where", ["bun"], { encoding: "utf8" }).stdout
      ?.trim()
      .split(/\r?\n/)[0] || "bun";
    const cmdPath = path.join(binDir, "stali.cmd");
    const shim = ["@echo off", "setlocal", `"${bunExe}" "${staliJs}" %*`].join("\r\n");
    await fs.writeFile(cmdPath, shim, "utf8");
    return;
  }

  const bun = bunBin();
  const shimPath = path.join(binDir, "stali");
  const body = `#!/usr/bin/env bash\nexec "${bun}" "${staliJs}" "$@"\n`;
  await fs.writeFile(shimPath, body, { mode: 0o755 });
}

export async function selfUpdate(options?: {
  repo?: string;
  branch?: string;
}): Promise<SelfUpdateResult> {
  const repo = options?.repo || process.env.STALI_CLI_REPO || DEFAULT_REPO;
  const branch = options?.branch || process.env.STALI_CLI_BRANCH || DEFAULT_BRANCH;
  const installRoot = getStaliCliInstallDir();

  try {
    const hasGit = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;
    const isGitCheckout = hasGit && (await fs.access(path.join(installRoot, ".git")).then(() => true).catch(() => false));

    if (isGitCheckout) {
      await pullGit(installRoot, branch);
    } else {
      await fetchZipTo(installRoot, repo, branch);
    }

    const install = runBun(["install"], installRoot);
    if (!install.ok) {
      return { success: false, message: "bun install failed", installDir: installRoot, error: install.detail };
    }

    const build = runBun(["run", "build"], installRoot);
    if (!build.ok) {
      return { success: false, message: "build failed", installDir: installRoot, error: build.detail };
    }

    await registerStaliShim(installRoot);

    return {
      success: true,
      message: `Đã cập nhật stali-cli tại ${installRoot}`,
      installDir: installRoot,
    };
  } catch (e: any) {
    return {
      success: false,
      message: "Self-update thất bại",
      installDir: installRoot,
      error: e?.message || String(e),
    };
  }
}
