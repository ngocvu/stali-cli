import fs from "fs/promises";
import path from "path";
import { getStaliBinDir, getStaliCliInstallDir, getStaliHome } from "../constants/paths";
import { fetchReleaseAssets, type GithubReleaseAsset } from "./github-release";

export type InstallMode = "standalone" | "git" | "source" | "npm-global" | "unknown";

export interface InstallModeInfo {
  mode: InstallMode;
  detail?: string;
  version?: string;
}

export interface InstallModeMarker {
  mode: InstallMode;
  version?: string;
  asset?: string;
  updatedAt?: string;
}

const MARKER_FILE = "install-mode.json";

export function resolveStandaloneAssetName(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): string {
  if (platform === "win32") {
    return "stali-standalone-win-x64";
  }
  const os =
    platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : platform.replace(/[^a-z0-9-]/gi, "");
  const cpu = arch === "x64" ? "x64" : arch === "arm64" ? "arm64" : arch;
  return `stali-standalone-${os}-${cpu}`;
}

/** Chọn asset standalone phù hợp platform (fallback tên legacy). */
export function pickStandaloneAsset(
  assets: GithubReleaseAsset[],
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): GithubReleaseAsset | null {
  const preferred = resolveStandaloneAssetName(platform, arch);
  const hit = assets.find((a) => a.name === preferred);
  if (hit) return hit;
  if (platform === "linux" && arch === "x64") {
    return assets.find((a) => a.name === "stali-standalone") || null;
  }
  return null;
}

function isCompiledBinaryHeader(buf: Buffer): boolean {
  if (buf.length < 2) return false;
  if (buf[0] === 0x4d && buf[1] === 0x5a) return true;
  if (buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) return true;
  const le = buf.readUInt32LE(0);
  const be = buf.readUInt32BE(0);
  const mach = [0xfeedface, 0xfeedfacf, 0xcafebabe, 0xcefaedfe];
  return mach.includes(le) || mach.includes(be);
}

export async function isStandaloneBinary(binPath: string): Promise<boolean> {
  try {
    const buf = Buffer.alloc(4);
    const fh = await fs.open(binPath, "r");
    try {
      await fh.read(buf, 0, 4, 0);
    } finally {
      await fh.close();
    }
    return isCompiledBinaryHeader(buf);
  } catch {
    return false;
  }
}

export async function readInstallModeMarker(): Promise<InstallModeMarker | null> {
  try {
    const raw = await fs.readFile(path.join(getStaliHome(), MARKER_FILE), "utf8");
    return JSON.parse(raw) as InstallModeMarker;
  } catch {
    return null;
  }
}

export async function writeInstallModeMarker(marker: InstallModeMarker): Promise<void> {
  const home = getStaliHome();
  await fs.mkdir(home, { recursive: true });
  await fs.writeFile(
    path.join(home, MARKER_FILE),
    JSON.stringify({ ...marker, updatedAt: new Date().toISOString() }, null, 2) + "\n",
    "utf8"
  );
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Phát hiện cách cài hiện tại (standalone / git / source / npm-global). */
export async function detectInstallMode(): Promise<InstallModeInfo> {
  const marker = await readInstallModeMarker();
  if (marker?.mode) {
    return { mode: marker.mode, detail: marker.asset, version: marker.version };
  }

  const entry = (process.argv[1] || "").replace(/\\/g, "/");
  if (entry.includes("/node_modules/stali-cli/")) {
    return { mode: "npm-global", detail: "node_modules" };
  }

  const binPath = path.join(getStaliBinDir(), "stali");
  if (await isStandaloneBinary(binPath)) {
    return { mode: "standalone", detail: resolveStandaloneAssetName() };
  }

  const cliDir = getStaliCliInstallDir();
  if (await pathExists(path.join(cliDir, ".git"))) {
    return { mode: "git", detail: cliDir };
  }
  if (await pathExists(path.join(cliDir, "package.json"))) {
    return { mode: "source", detail: cliDir };
  }

  if (await pathExists(binPath)) {
    const shim = await fs.readFile(binPath, "utf8").catch(() => "");
    if (shim.includes("node_modules/stali-cli")) {
      return { mode: "npm-global" };
    }
  }

  return { mode: "unknown" };
}

export async function resolveStandaloneDownloadUrl(
  tag: string,
  repo?: string
): Promise<{ url: string; assetName: string } | null> {
  const assets = await fetchReleaseAssets(tag, repo);
  const picked = pickStandaloneAsset(assets);
  if (!picked) return null;
  return { url: picked.url, assetName: picked.name };
}
