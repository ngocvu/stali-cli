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

/** Số bản backup tối đa giữ lại cho mỗi file (có thể chỉnh qua STALI_BACKUP_KEEP). */
const DEFAULT_BACKUP_KEEP = 10;

function backupKeepCount(): number {
  const raw = Number(process.env.STALI_BACKUP_KEEP);
  if (Number.isFinite(raw) && raw >= 0) return Math.trunc(raw);
  return DEFAULT_BACKUP_KEEP;
}

export class BackupRequiredError extends Error {
  constructor(filePath: string) {
    super(`Không thể tạo backup cho ${filePath}. Dùng --force để bỏ qua.`);
    this.name = "BackupRequiredError";
  }
}

/**
 * Giới hạn quyền file backup về 0600.
 *
 * QUAN TRỌNG: backup của config tool (`~/.claude/settings.json`, `~/.codex/auth.json`…)
 * CHỨA API KEY. `fs.copyFile` giữ umask mặc định (thường 0644) → key bị lộ cho
 * mọi user khác trên máy. Luôn siết quyền sau khi copy.
 */
async function restrictBackupPermissions(backupPath: string): Promise<void> {
  try {
    await fs.chmod(backupPath, 0o600);
  } catch {
    // Windows / FS không hỗ trợ chmod — bỏ qua
  }
}

/**
 * Dọn backup cũ, chỉ giữ `keep` bản mới nhất cho mỗi file.
 * Tránh việc `~/.claude/` phình ra hàng trăm file `.bak` sau nhiều lần chạy.
 */
export async function pruneBackups(filePath: string, keep = backupKeepCount()): Promise<number> {
  if (keep < 0) return 0;
  const backups = await listBackupsForFile(filePath);
  const stale = backups.slice(keep);
  let removed = 0;
  for (const old of stale) {
    try {
      await fs.unlink(old);
      removed++;
    } catch {
      /* bỏ qua file không xoá được */
    }
  }
  return removed;
}

/**
 * Safely create a backup of a file with timestamp: <file>.<YYYYMMDD_HHmmss>.bak
 * Returns backup path if created, or null if source doesn't exist
 */
export async function createTimestampBackup(
  filePath: string,
  options?: { requireExistingBackup?: boolean; keep?: number }
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
    await restrictBackupPermissions(backupPath);
    await pruneBackups(filePath, options?.keep ?? backupKeepCount());
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
