import { spawnSync } from "child_process";
import { getStaliBinDir } from "../constants/paths";

export interface PathPurgeResult {
  purged: boolean;
  detail: string;
  platform: string;
}

/** Gỡ ~/.stali/bin khỏi User PATH (Windows) hoặc hướng dẫn thủ công (Unix). */
export function purgeStaliFromUserPath(): PathPurgeResult {
  const binDir = getStaliBinDir();
  const platform = process.platform;

  if (platform === "win32") {
    const ps = `
$bin = '${binDir.replace(/'/g, "''")}'
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($null -eq $userPath) { $userPath = '' }
$parts = $userPath -split ';' | Where-Object { $_ -and ($_ -ne $bin) -and ($_.Trim() -ne $bin) }
$newPath = ($parts -join ';').Trim(';')
[Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
Write-Output 'OK'
`.trim();

    const r = spawnSync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", ps],
      { encoding: "utf8", timeout: 15000 }
    );
    const ok = r.status === 0 && (r.stdout || "").includes("OK");
    return {
      purged: ok,
      detail: ok
        ? `Đã gỡ ${binDir} khỏi User PATH`
        : r.stderr?.trim() || "Không thể cập nhật User PATH",
      platform,
    };
  }

  return {
    purged: false,
    detail: `Unix: xóa thủ công khỏi shell profile nếu đã thêm: export PATH="${binDir}:$PATH"`,
    platform,
  };
}
