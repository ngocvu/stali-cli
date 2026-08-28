import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { getStaliBinDir, getStaliHome } from "../constants/paths";

const CRON_MARKER = "stali-cli auto-update";
const SYSTEMD_MARKER = "stali-cli";
const LOG_FILE = "auto-update.log";

export interface AutoUpdateCronStatus {
  installed: boolean;
  line?: string;
  logPath: string;
}

function readCrontab(): string {
  if (process.platform === "win32") return "";
  const r = spawnSync("crontab", ["-l"], { encoding: "utf8" });
  if (r.status !== 0) return "";
  return r.stdout || "";
}

function writeCrontab(content: string): { ok: boolean; error?: string } {
  const r = spawnSync("crontab", ["-"], {
    input: content,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    return { ok: false, error: (r.stderr || r.stdout || "crontab failed").trim() };
  }
  return { ok: true };
}

export function getAutoUpdateCronStatus(): AutoUpdateCronStatus {
  const logPath = path.join(getStaliHome(), LOG_FILE);
  const tab = readCrontab();
  const lines = tab.split("\n").filter((l) => l.includes(CRON_MARKER));
  return {
    installed: lines.length > 0,
    line: lines[0],
    logPath,
  };
}

/** Cài cron 04:00 hàng ngày — `stali update` (ưu tiên standalone). */
export async function installAutoUpdateCron(channel = "stable"): Promise<{
  ok: boolean;
  message: string;
  error?: string;
}> {
  if (process.platform === "win32") {
    await writeAutoUpdateConfig({ channel, enabled: true });
    return {
      ok: true,
      message:
        "Windows: đã ghi ~/.stali/auto-update.json — dùng Task Scheduler hoặc `stali update` thủ công",
    };
  }

  const stali = path.join(getStaliBinDir(), "stali");
  const logPath = path.join(getStaliHome(), LOG_FILE);
  await fs.mkdir(getStaliHome(), { recursive: true });
  const cronLine = `0 4 * * * "${stali}" update --channel ${channel} >> "${logPath}" 2>&1 # ${CRON_MARKER}`;

  const existing = readCrontab();
  if (existing.includes(CRON_MARKER)) {
    return { ok: true, message: "Cron auto-update đã cài (idempotent)" };
  }

  const trimmed = existing.trimEnd();
  const next = (trimmed ? trimmed + "\n" : "") + cronLine + "\n";
  const wrote = writeCrontab(next);
  if (!wrote.ok) {
    return { ok: false, message: "Không ghi được crontab", error: wrote.error };
  }
  await writeAutoUpdateConfig({ channel, enabled: true });
  return { ok: true, message: `Đã cài cron 04:00 — log ${logPath}` };
}

export async function uninstallAutoUpdateCron(): Promise<{ ok: boolean; message: string }> {
  if (process.platform === "win32") {
    await writeAutoUpdateConfig({ enabled: false });
    return { ok: true, message: "Đã tắt auto-update config (Windows)" };
  }

  const existing = readCrontab();
  if (!existing.includes(CRON_MARKER)) {
    return { ok: true, message: "Cron auto-update chưa cài" };
  }
  const next = existing
    .split("\n")
    .filter((l) => !l.includes(CRON_MARKER))
    .join("\n")
    .replace(/\n+$/, "\n");
  const wrote = writeCrontab(next || "\n");
  if (!wrote.ok) {
    return { ok: false, message: wrote.error || "crontab remove failed" };
  }
  await writeAutoUpdateConfig({ enabled: false });
  return { ok: true, message: "Đã gỡ cron auto-update" };
}

export interface AutoUpdateConfig {
  enabled: boolean;
  channel?: string;
  updatedAt?: string;
}

export async function writeAutoUpdateConfig(partial: AutoUpdateConfig): Promise<void> {
  const file = path.join(getStaliHome(), "auto-update.json");
  let prev: AutoUpdateConfig = { enabled: false };
  try {
    prev = JSON.parse(await fs.readFile(file, "utf8")) as AutoUpdateConfig;
  } catch {
    /* new */
  }
  const next = { ...prev, ...partial, updatedAt: new Date().toISOString() };
  await fs.mkdir(getStaliHome(), { recursive: true });
  await fs.writeFile(file, JSON.stringify(next, null, 2) + "\n", "utf8");
}

export async function readAutoUpdateConfig(): Promise<AutoUpdateConfig | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(getStaliHome(), "auto-update.json"), "utf8"));
  } catch {
    return null;
  }
}

export interface SystemdTimerStatus {
  installed: boolean;
  unitDir: string;
}

export function getSystemdTimerStatus(): SystemdTimerStatus {
  const unitDir = path.join(os.homedir(), ".config", "systemd", "user");
  const servicePath = path.join(unitDir, "stali-update.service");
  return { installed: existsSync(servicePath), unitDir };
}

/** systemd user timer 04:00 — thay cron trên Linux có systemd. */
export async function installAutoUpdateSystemd(channel = "stable"): Promise<{
  ok: boolean;
  message: string;
  error?: string;
}> {
  if (process.platform !== "linux") {
    return { ok: false, message: "systemd timer chỉ hỗ trợ Linux" };
  }
  const unitDir = path.join(os.homedir(), ".config", "systemd", "user");
  const stali = path.join(getStaliBinDir(), "stali");
  const logPath = path.join(getStaliHome(), LOG_FILE);
  await fs.mkdir(unitDir, { recursive: true });
  await fs.mkdir(getStaliHome(), { recursive: true });

  const service = `[Unit]
Description=${SYSTEMD_MARKER} auto-update
After=network-online.target

[Service]
Type=oneshot
ExecStart=${stali} update --channel ${channel}
StandardOutput=append:${logPath}
StandardError=append:${logPath}
`;
  const timer = `[Unit]
Description=${SYSTEMD_MARKER} daily update timer

[Timer]
OnCalendar=*-*-* 04:00:00
Persistent=true

[Install]
WantedBy=timers.target
`;
  await fs.writeFile(path.join(unitDir, "stali-update.service"), service, "utf8");
  await fs.writeFile(path.join(unitDir, "stali-update.timer"), timer, "utf8");

  const reload = spawnSync("systemctl", ["--user", "daemon-reload"], { encoding: "utf8" });
  if (reload.status !== 0) {
    return { ok: false, message: "systemctl daemon-reload failed", error: reload.stderr };
  }
  const enable = spawnSync("systemctl", ["--user", "enable", "--now", "stali-update.timer"], {
    encoding: "utf8",
  });
  if (enable.status !== 0) {
    return { ok: false, message: "systemctl enable timer failed", error: enable.stderr };
  }
  await writeAutoUpdateConfig({ channel, enabled: true });
  return { ok: true, message: `Đã bật systemd user timer 04:00 (${unitDir})` };
}

export async function uninstallAutoUpdateSystemd(): Promise<{ ok: boolean; message: string }> {
  if (process.platform !== "linux") {
    return { ok: true, message: "Không có systemd timer" };
  }
  spawnSync("systemctl", ["--user", "disable", "--now", "stali-update.timer"], { encoding: "utf8" });
  const unitDir = path.join(os.homedir(), ".config", "systemd", "user");
  for (const f of ["stali-update.service", "stali-update.timer"]) {
    await fs.rm(path.join(unitDir, f), { force: true }).catch(() => {});
  }
  spawnSync("systemctl", ["--user", "daemon-reload"], { encoding: "utf8" });
  await writeAutoUpdateConfig({ enabled: false });
  return { ok: true, message: "Đã gỡ systemd user timer" };
}
