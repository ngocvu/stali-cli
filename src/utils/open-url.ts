import { spawnSync } from "child_process";

/** Mở URL trong trình duyệt mặc định (macOS / Windows / Linux). */
export function openUrlInBrowser(url: string): { ok: boolean; detail: string } {
  let cmd: string;
  let args: string[];

  if (process.platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (process.platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }

  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 10_000 });
  if (r.error) {
    return { ok: false, detail: r.error.message };
  }
  return { ok: r.status === 0 || process.platform === "win32", detail: url };
}
