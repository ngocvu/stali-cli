import { spawnSync } from "child_process";

/** Load process command lines for discovery (one syscall batch per scan). */
export function loadProcessLines(): string[] {
  if (process.platform === "win32") {
    return loadWindowsProcessLines();
  }
  const r = spawnSync("ps", ["-ax", "-o", "args="], { encoding: "utf8", timeout: 8000 });
  if (r.status !== 0) {
    const fallback = spawnSync("ps", ["-A", "-o", "comm="], { encoding: "utf8", timeout: 5000 });
    if (fallback.status !== 0) return [];
    return (fallback.stdout || "")
      .split(/\r?\n/)
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);
  }
  return (r.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
}

function loadWindowsProcessLines(): string[] {
  const ps = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Get-CimInstance Win32_Process | ForEach-Object { $_.CommandLine }",
    ],
    { encoding: "utf8", timeout: 10_000, windowsHide: true }
  );
  if (ps.status === 0 && (ps.stdout || "").trim()) {
    return (ps.stdout || "")
      .toLowerCase()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const wmic = spawnSync("wmic", ["process", "get", "commandline"], {
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  });
  if (wmic.status === 0 && (wmic.stdout || "").trim()) {
    return (wmic.stdout || "")
      .toLowerCase()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && l !== "commandline");
  }

  const tasklist = spawnSync("tasklist", ["/FO", "CSV", "/NH"], {
    encoding: "utf8",
    shell: true,
    windowsHide: true,
    timeout: 5000,
  });
  return (tasklist.stdout || "")
    .toLowerCase()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
