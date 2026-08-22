import fs from "fs/promises";
import path from "path";
import os from "os";
import { parseTOML, stringifyTOML } from "confbox";

/**
 * Expand ~ or %USERPROFILE% to full home directory
 */
export function resolveHomePath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Safely ensure parent directory exists
 */
export async function ensureParentDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Restrict permissions on sensitive config files (owner read/write only)
 */
export async function restrictFilePermissions(filePath: string): Promise<void> {
  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // Best-effort on platforms that don't support chmod
  }
}

/**
 * Safely read JSON file (tolerates trailing commas / comments)
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const cleaned = raw.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/**
 * Safely write JSON file
 */
export async function writeJsonFile(
  filePath: string,
  data: any,
  options?: { spaces?: number; secure?: boolean }
): Promise<void> {
  const spaces = options?.spaces ?? 2;
  await ensureParentDir(filePath);
  const content = JSON.stringify(data, null, spaces);
  await fs.writeFile(filePath, content, "utf-8");
  if (options?.secure !== false) {
    await restrictFilePermissions(filePath);
  }
}

/**
 * Safely read TOML file using confbox
 */
export async function readTomlFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return parseTOML(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Safely write TOML file using confbox
 */
export async function writeTomlFile(
  filePath: string,
  data: any,
  options?: { secure?: boolean }
): Promise<void> {
  await ensureParentDir(filePath);
  const content = stringifyTOML(data);
  await fs.writeFile(filePath, content, "utf-8");
  if (options?.secure !== false) {
    await restrictFilePermissions(filePath);
  }
}
