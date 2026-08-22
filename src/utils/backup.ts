import fs from "fs/promises";
import path from "path";

/**
 * Format timestamp string YYYYMMDD_HHmmss
 */
export function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

export class BackupRequiredError extends Error {
  constructor(filePath: string) {
    super(`Không thể tạo backup cho ${filePath}. Dùng --force để bỏ qua.`);
    this.name = "BackupRequiredError";
  }
}

/**
 * Safely create a backup of a file with timestamp: <file>.<YYYYMMDD_HHmmss>.bak
 * Returns backup path if created, or null if source doesn't exist
 */
export async function createTimestampBackup(
  filePath: string,
  options?: { requireExistingBackup?: boolean }
): Promise<string | null> {
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }

  const timestamp = getTimestamp();
  const backupPath = `${filePath}.${timestamp}.bak`;

  try {
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error) {
    if (options?.requireExistingBackup) {
      throw new BackupRequiredError(filePath);
    }
    console.warn(`[stali] Warning: Failed to create backup for ${filePath}:`, error);
    return null;
  }
}

/**
 * List backup files for a config path, newest first
 */
export async function listBackupsForFile(filePath: string): Promise<string[]> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const pattern = `${base}.`;
  const suffix = ".bak";

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  return entries
    .filter((name) => name.startsWith(pattern) && name.endsWith(suffix))
    .map((name) => path.join(dir, name))
    .sort((a, b) => b.localeCompare(a));
}

/**
 * Restore config from a backup file
 */
export async function restoreFromBackup(
  backupPath: string,
  targetPath?: string
): Promise<{ restored: string; target: string }> {
  const resolvedBackup = path.resolve(backupPath);
  if (!resolvedBackup.endsWith(".bak")) {
    throw new Error("File backup phải có đuôi .bak");
  }

  await fs.access(resolvedBackup);

  const target =
    targetPath ||
    resolvedBackup.replace(/\.(\d{8}_\d{6})\.bak$/, "");

  if (!target || target === resolvedBackup) {
    throw new Error("Không xác định được file đích từ backup path");
  }

  await fs.copyFile(resolvedBackup, target);
  return { restored: resolvedBackup, target };
}
