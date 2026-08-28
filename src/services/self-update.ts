import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import {
  getStaliBinDir,
  getStaliCliInstallDir,
} from "../constants/paths";
import { verifyDistChecksums } from "./checksum-verify";
import {
  detectInstallMode,
  resolveStandaloneDownloadUrl,
  resolveStandaloneAssetName,
  writeInstallModeMarker,
} from "./install-mode";
import { resolveUpdateChannelResolved, type UpdateChannel } from "./update-channel";
import type { UpdateChannelConfig } from "./update-channel";

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
  if (/^v?\d/.test(branch)) {
    const tag = branch.startsWith("v") ? branch : `v${branch}`;
    return `https://github.com/${m[1]}/${m[2]}/archive/refs/tags/${tag}.zip`;
  }
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

/** Checkout release tag hoặc pull branch. */
async function syncGitRef(installRoot: string, ref: string) {
  const isTag = /^v?\d/.test(ref);
  if (!isTag) {
    await pullGit(installRoot, ref);
    return;
  }
  const tag = ref.startsWith("v") ? ref : `v${ref}`;
  const fetch = spawnSync("git", ["fetch", "origin", "tag", tag, "--force"], {
    cwd: installRoot,
    encoding: "utf8",
  });
  if (fetch.status !== 0) {
    throw new Error(fetch.stderr || fetch.stdout || "git fetch tag failed");
  }
  const co = spawnSync("git", ["checkout", tag], {
    cwd: installRoot,
    encoding: "utf8",
  });
  if (co.status !== 0) {
    throw new Error(co.stderr || co.stdout || "git checkout failed");
  }
}

export async function registerStaliShim(installRoot: string): Promise<void> {
  const shellShim = path.join(installRoot, "bin", "stali");
  const staliJs = path.join(installRoot, "bin", "stali.js");
  const distEntry = path.join(installRoot, "dist", "index.js");

  let entry = distEntry;
  try {
    await fs.access(shellShim);
    entry = shellShim;
  } catch {
    try {
      await fs.access(staliJs);
      entry = staliJs;
    } catch {
      await fs.access(distEntry);
    }
  }

  const binDir = getStaliBinDir();
  await fs.mkdir(binDir, { recursive: true });

  if (process.platform === "win32") {
    const bunExe = spawnSync("where", ["bun"], { encoding: "utf8" }).stdout
      ?.trim()
      .split(/\r?\n/)[0] || "bun";
    const cmdPath = path.join(binDir, "stali.cmd");
    const shim = ["@echo off", "setlocal", `"${bunExe}" "${entry}" %*`].join("\r\n");
    await fs.writeFile(cmdPath, shim, "utf8");
    return;
  }

  const bun = bunBin();
  const shimPath = path.join(binDir, "stali");
  const body =
    entry.endsWith("bin/stali") && !entry.endsWith(".js")
      ? `#!/usr/bin/env bash\nexec "${entry}" "$@"\n`
      : `#!/usr/bin/env bash\nexec "${bun}" "${entry}" "$@"\n`;
  await fs.writeFile(shimPath, body, { mode: 0o755 });
}

async function updateStandaloneInstall(
  channelCfg: UpdateChannelConfig,
  tag: string
): Promise<SelfUpdateResult> {
  const binPath = path.join(getStaliBinDir(), "stali");
  const assetName = resolveStandaloneAssetName();
  const resolved = await resolveStandaloneDownloadUrl(tag);
  if (!resolved) {
    return {
      success: false,
      message: "Không tìm thấy standalone binary trên GitHub Release",
      error: `Thiếu asset ${assetName} (tag ${tag})`,
    };
  }

  const res = await fetch(resolved.url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    return {
      success: false,
      message: "Tải standalone thất bại",
      error: `HTTP ${res.status}`,
    };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(getStaliBinDir(), { recursive: true });
  const backup = `${binPath}.bak`;
  try {
    await fs.copyFile(binPath, backup);
  } catch {
    /* first install */
  }
  await fs.writeFile(binPath, buf, { mode: 0o755 });
  await writeInstallModeMarker({
    mode: "standalone",
    version: tag,
    asset: resolved.assetName,
  });

  return {
    success: true,
    message: `Đã cập nhật standalone (${channelCfg.label}) → ${resolved.assetName}`,
    installDir: getStaliBinDir(),
  };
}

export interface SelfUpdatePlan {
  mode: string;
  action: string;
  ref: string;
  channel: string;
  assetName?: string;
  downloadUrl?: string;
  installDir?: string;
}

export async function planSelfUpdate(options?: {
  repo?: string;
  branch?: string;
  channel?: UpdateChannel | string;
}): Promise<SelfUpdatePlan> {
  const channelCfg = await resolveUpdateChannelResolved(options?.channel);
  const branch = options?.branch || channelCfg.branch;
  const installRoot = getStaliCliInstallDir();
  const installInfo = await detectInstallMode();
  const tag = channelCfg.releaseTag || branch;
  const releaseTag = /^v?\d/.test(tag) ? (tag.startsWith("v") ? tag : `v${tag}`) : tag;

  if (installInfo.mode === "npm-global") {
    const { resolveNpmInstallSpec } = await import("./npm-update");
    const spec = resolveNpmInstallSpec({ channel: channelCfg.channel });
    return {
      mode: "npm-global",
      action: "npm-install-global",
      ref: spec,
      channel: channelCfg.label,
    };
  }

  if (installInfo.mode === "standalone") {
    const resolved = /^v?\d/.test(releaseTag)
      ? await resolveStandaloneDownloadUrl(releaseTag)
      : null;
    return {
      mode: "standalone",
      action: "download-release-binary",
      ref: releaseTag,
      channel: channelCfg.label,
      assetName: resolved?.assetName,
      downloadUrl: resolved?.url,
      installDir: getStaliBinDir(),
    };
  }

  const hasGit =
    spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0 &&
    (await fs.access(path.join(installRoot, ".git")).then(() => true).catch(() => false));

  return {
    mode: installInfo.mode,
    action: hasGit ? "git-sync-ref" : "zip-fetch-build",
    ref: branch,
    channel: channelCfg.label,
    installDir: installRoot,
  };
}

export async function selfUpdate(options?: {
  repo?: string;
  branch?: string;
  channel?: UpdateChannel | string;
  skipChecksum?: boolean;
  forceStandalone?: boolean;
  dryRun?: boolean;
}): Promise<SelfUpdateResult> {
  const repo = options?.repo || process.env.STALI_CLI_REPO || DEFAULT_REPO;
  const channelCfg = await resolveUpdateChannelResolved(options?.channel);
  const branch = options?.branch || channelCfg.branch;
  const installRoot = getStaliCliInstallDir();
  const installInfo = await detectInstallMode();
  const tag = channelCfg.releaseTag || branch;

  try {
    if (options?.dryRun) {
      const plan = await planSelfUpdate(options);
      return {
        success: true,
        message: `Dry-run: ${plan.action} → ${plan.ref} (${plan.channel})`,
        installDir: plan.installDir,
        error: plan.assetName ? `asset=${plan.assetName}` : undefined,
      };
    }

    if (installInfo.mode === "npm-global") {
      const { updateCliViaNpm } = await import("./npm-update");
      return updateCliViaNpm(channelCfg.channel);
    }

    if (installInfo.mode === "standalone" || options?.forceStandalone) {
      if (!/^v?\d/.test(tag)) {
        return {
          success: false,
          message: "Standalone update cần release tag",
          error: `Ref hiện tại: ${tag}`,
        };
      }
      const releaseTag = tag.startsWith("v") ? tag : `v${tag}`;
      return updateStandaloneInstall(channelCfg, releaseTag);
    }

    const hasGit = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;
    const isGitCheckout = hasGit && (await fs.access(path.join(installRoot, ".git")).then(() => true).catch(() => false));

    if (isGitCheckout) {
      await syncGitRef(installRoot, branch);
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

    if (!options?.skipChecksum) {
      const verify = await verifyDistChecksums(installRoot);
      if (!verify.ok) {
        return {
          success: false,
          message: "checksum verify failed sau build",
          installDir: installRoot,
          error: verify.errors.slice(0, 3).join("; "),
        };
      }
    }

    await registerStaliShim(installRoot);

    return {
      success: true,
      message: `Đã cập nhật stali-cli (${channelCfg.label}) tại ${installRoot}`,
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
