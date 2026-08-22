import os from "os";
import path from "path";

/** User data root: ~/.stali (Windows: %USERPROFILE%\.stali) */
export function getStaliHome(): string {
  if (process.env.STALI_HOME?.trim()) {
    return process.env.STALI_HOME.trim();
  }
  return path.join(os.homedir(), ".stali");
}

/** CLI source/build install: ~/.stali/cli */
export function getStaliCliInstallDir(): string {
  if (process.env.STALI_CLI_INSTALL_DIR?.trim()) {
    return process.env.STALI_CLI_INSTALL_DIR.trim();
  }
  return path.join(getStaliHome(), "cli");
}

/** Global stali shim directory: ~/.stali/bin */
export function getStaliBinDir(): string {
  return path.join(getStaliHome(), "bin");
}

/** User config: ~/.stali/config.json */
export function getStaliConfigPath(): string {
  return path.join(getStaliHome(), "config.json");
}

/** Legacy paths (pre-1.3) — for migration hints only */
export const LEGACY_PATHS = {
  winInstallLocalAppData: path.join(
    process.env.LOCALAPPDATA || os.homedir(),
    "stali-cli"
  ),
  bunBinShim: path.join(os.homedir(), ".bun", "bin", "stali.cmd"),
  unixShareInstall: path.join(
    os.homedir(),
    ".local",
    "share",
    "stali-cli"
  ),
} as const;
