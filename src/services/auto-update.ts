import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { getStaliBinDir, getStaliHome } from "../constants/paths";

const CRON_MARKER = "stali-cli auto-update";
const SYSTEMD_MARKER = "stali-cli";
export const WINDOWS_TASK_NAME = "stali-cli-auto-update";
export const LAUNCHD_LABEL = "com.stali.cli.update";
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

export interface TaskSchedulerStatus {
  installed: boolean;
  taskName: string;
}

export function getTaskSchedulerStatus(): TaskSchedulerStatus {
  const taskName = WINDOWS_TASK_NAME;
  if (process.platform !== "win32") {
    return { installed: false, taskName };
  }
  const r = spawnSync("schtasks", ["/Query", "/TN", taskName], {
    encoding: "utf8",
    windowsHide: true,
  });
  return { installed: r.status === 0, taskName };
}

/** Resolve stali executable for scheduled tasks (Windows/Linux/macOS). */
export function resolveStaliExecutableForScheduler(): string {
  if (process.platform === "win32") {
    const candidates = [
      path.join(getStaliBinDir(), "stali.cmd"),
      path.join(getStaliBinDir(), "stali.exe"),
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    const r = spawnSync("where", ["stali"], { encoding: "utf8", shell: true, windowsHide: true });
    if (r.status === 0) {
      const line = (r.stdout || "").split(/\r?\n/).find((l) => l.trim())?.trim();
      if (line) return line;
    }
    return path.join(getStaliBinDir(), "stali.cmd");
  }
  const stali = path.join(getStaliBinDir(), "stali");
  if (existsSync(stali)) return stali;
  const r = spawnSync("which", ["stali"], { encoding: "utf8" });
  if (r.status === 0) return (r.stdout || "").trim();
  return stali;
}

/** Windows Task Scheduler — daily 04:00 `stali update`. */
export async function installAutoUpdateTaskScheduler(channel = "stable"): Promise<{
  ok: boolean;
  message: string;
  error?: string;
}> {
  if (process.platform !== "win32") {
    return { ok: false, message: "Task Scheduler chỉ hỗ trợ Windows" };
  }
  const existing = getTaskSchedulerStatus();
  const stali = resolveStaliExecutableForScheduler();
  const logPath = path.join(getStaliHome(), LOG_FILE);
  await fs.mkdir(getStaliHome(), { recursive: true });
  const tr = `cmd /c "\\"${stali.replace(/"/g, '\\"')}\\" update --channel ${channel} >> \\"${logPath.replace(/\\/g, "\\\\")}\\" 2>&1"`;
  const r = spawnSync(
    "schtasks",
    ["/Create", "/TN", WINDOWS_TASK_NAME, "/SC", "DAILY", "/ST", "04:00", "/TR", tr, "/F"],
    { encoding: "utf8", windowsHide: true }
  );
  if (r.status !== 0) {
    return {
      ok: false,
      message: "schtasks /Create failed",
      error: (r.stderr || r.stdout || "").trim(),
    };
  }
  await writeAutoUpdateConfig({ channel, enabled: true });
  return {
    ok: true,
    message: existing.installed
      ? `Task Scheduler đã cập nhật (${WINDOWS_TASK_NAME}, 04:00)`
      : `Đã cài Task Scheduler 04:00 — log ${logPath}`,
  };
}

export async function uninstallAutoUpdateTaskScheduler(): Promise<{ ok: boolean; message: string }> {
  if (process.platform !== "win32") {
    return { ok: true, message: "Không có Task Scheduler" };
  }
  if (!getTaskSchedulerStatus().installed) {
    await writeAutoUpdateConfig({ enabled: false });
    return { ok: true, message: "Task Scheduler auto-update chưa cài" };
  }
  spawnSync("schtasks", ["/Delete", "/TN", WINDOWS_TASK_NAME, "/F"], {
    encoding: "utf8",
    windowsHide: true,
  });
  await writeAutoUpdateConfig({ enabled: false });
  return { ok: true, message: "Đã gỡ Task Scheduler auto-update" };
}

export interface LaunchdStatus {
  installed: boolean;
  plistPath: string;
  label: string;
}

export function getLaunchdStatus(): LaunchdStatus {
  const plistPath = path.join(os.homedir(), "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
  return {
    installed: process.platform === "darwin" && existsSync(plistPath),
    plistPath,
    label: LAUNCHD_LABEL,
  };
}

function launchctlUid(): string {
  const getuid = process.getuid;
  if (typeof getuid === "function") {
    return String(getuid.call(process));
  }
  const r = spawnSync("id", ["-u"], { encoding: "utf8" });
  return (r.stdout || "501").trim();
}

function launchctlLoad(plistPath: string): { ok: boolean; error?: string } {
  const uid = launchctlUid();
  let r = spawnSync("launchctl", ["bootstrap", `gui/${uid}`, plistPath], { encoding: "utf8" });
  if (r.status === 0) return { ok: true };
  r = spawnSync("launchctl", ["load", "-w", plistPath], { encoding: "utf8" });
  if (r.status === 0) return { ok: true };
  return { ok: false, error: (r.stderr || r.stdout || "launchctl load failed").trim() };
}

function launchctlUnload(plistPath: string): void {
  const uid = launchctlUid();
  spawnSync("launchctl", ["bootout", `gui/${uid}`, plistPath], { encoding: "utf8" });
  spawnSync("launchctl", ["unload", "-w", plistPath], { encoding: "utf8" });
}

/** macOS LaunchAgent — daily 04:00 `stali update`. */
export async function installAutoUpdateLaunchd(channel = "stable"): Promise<{
  ok: boolean;
  message: string;
  error?: string;
}> {
  if (process.platform !== "darwin") {
    return { ok: false, message: "launchd chỉ hỗ trợ macOS" };
  }
  const stali = resolveStaliExecutableForScheduler();
  const logPath = path.join(getStaliHome(), LOG_FILE);
  const agentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
  const plistPath = path.join(agentsDir, `${LAUNCHD_LABEL}.plist`);
  await fs.mkdir(agentsDir, { recursive: true });
  await fs.mkdir(getStaliHome(), { recursive: true });

  const wasInstalled = existsSync(plistPath);
  if (wasInstalled) launchctlUnload(plistPath);

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${stali}</string>
    <string>update</string>
    <string>--channel</string>
    <string>${channel}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>4</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${logPath}</string>
  <key>StandardErrorPath</key>
  <string>${logPath}</string>
</dict>
</plist>
`;
  await fs.writeFile(plistPath, plist, "utf8");
  const loaded = launchctlLoad(plistPath);
  if (!loaded.ok) {
    return { ok: false, message: "launchctl load failed", error: loaded.error };
  }
  await writeAutoUpdateConfig({ channel, enabled: true });
  return {
    ok: true,
    message: `Đã cài LaunchAgent 04:00 (${plistPath})`,
  };
}

export async function uninstallAutoUpdateLaunchd(): Promise<{ ok: boolean; message: string }> {
  if (process.platform !== "darwin") {
    return { ok: true, message: "Không có launchd agent" };
  }
  const { plistPath, installed } = getLaunchdStatus();
  if (!installed) {
    await writeAutoUpdateConfig({ enabled: false });
    return { ok: true, message: "LaunchAgent auto-update chưa cài" };
  }
  launchctlUnload(plistPath);
  await fs.rm(plistPath, { force: true }).catch(() => {});
  await writeAutoUpdateConfig({ enabled: false });
  return { ok: true, message: "Đã gỡ LaunchAgent auto-update" };
}

/** Cài cron 04:00 hàng ngày — `stali update` (ưu tiên standalone). */
export async function installAutoUpdateCron(channel = "stable"): Promise<{
  ok: boolean;
  message: string;
  error?: string;
}> {
  if (process.platform === "win32") {
    return installAutoUpdateTaskScheduler(channel);
  }
  if (process.platform === "darwin") {
    return installAutoUpdateLaunchd(channel);
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
    return uninstallAutoUpdateTaskScheduler();
  }
  if (process.platform === "darwin") {
    return uninstallAutoUpdateLaunchd();
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
