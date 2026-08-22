import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  getStaliBinDir,
  getStaliCliInstallDir,
  getStaliConfigPath,
  getStaliHome,
  LEGACY_PATHS,
} from "../constants/paths";

export interface UninstallOptions {
  /** Giữ ~/.stali/config.json (API key) */
  keepConfig?: boolean;
  /** Giữ ~/.stali/cli (source) */
  keepSource?: boolean;
}

export interface UninstallResult {
  success: boolean;
  removed: string[];
  skipped: string[];
  message: string;
  pathNote?: string;
}

async function safeUnlink(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

async function safeRmDir(dirPath: string): Promise<boolean> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function runUninstall(opts: UninstallOptions = {}): Promise<UninstallResult> {
  const removed: string[] = [];
  const skipped: string[] = [];

  const binCandidates = [
    path.join(getStaliBinDir(), "stali"),
    path.join(getStaliBinDir(), "stali.cmd"),
    path.join(os.homedir(), ".bun", "bin", "stali"),
    path.join(os.homedir(), ".bun", "bin", "stali.cmd"),
    LEGACY_PATHS.bunBinShim,
  ];

  for (const p of binCandidates) {
    if (await safeUnlink(p)) removed.push(p);
  }

  if (!opts.keepSource) {
    const cliDir = getStaliCliInstallDir();
    if (await safeRmDir(cliDir)) removed.push(cliDir);
    else skipped.push(cliDir);
  } else {
    skipped.push(getStaliCliInstallDir());
  }

  if (!opts.keepConfig) {
    const cfg = getStaliConfigPath();
    if (await safeUnlink(cfg)) removed.push(cfg);
    else skipped.push(cfg);
  } else {
    skipped.push(getStaliConfigPath());
  }

  const binDir = getStaliBinDir();
  try {
    const entries = await fs.readdir(binDir);
    if (entries.length === 0) {
      await fs.rmdir(binDir).catch(() => undefined);
    }
  } catch {
    /* bin dir may not exist */
  }

  const isWin = process.platform === "win32";
  const pathNote = isWin
    ? `Gỡ thủ công khỏi User PATH nếu cần: ${getStaliBinDir()}`
    : `Xóa khỏi ~/.bashrc nếu đã thêm: export PATH="${getStaliBinDir()}:$PATH"`;

  const success = removed.length > 0;
  const message = success
    ? `Đã gỡ stali-cli (${removed.length} mục). Bun runtime (~/.bun) không bị xóa.`
    : "Không tìm thấy file cài đặt stali-cli để gỡ.";

  return {
    success,
    removed,
    skipped,
    message,
    pathNote,
  };
}

export function getUninstallSummary(home = getStaliHome()): string {
  return [
    `Bin:    ${path.join(home, "bin")}`,
    `CLI:    ${path.join(home, "cli")}`,
    `Config: ${path.join(home, "config.json")}`,
  ].join("\n");
}
