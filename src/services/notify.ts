import { spawnSync } from "child_process";
import type { ToolHealthStatus } from "./syncers";

export function doctorSnapshotHash(statuses: ToolHealthStatus[]): string {
  return statuses
    .map(
      (s) =>
        `${s.toolId}:${s.configuredForStali ? "1" : "0"}:${s.model || ""}:${s.endpoint || ""}`
    )
    .join("|");
}

export function terminalBell(): void {
  process.stdout.write("\u0007");
}

export function notifyDesktop(title: string, body: string): boolean {
  if (process.platform === "darwin") {
    const r = spawnSync(
      "osascript",
      ["-e", `display notification "${body.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`],
      { encoding: "utf8", timeout: 5000 }
    );
    return r.status === 0;
  }
  if (process.platform === "win32") {
    const ps = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null; $template = '<toast><visual><binding template="ToastText02"><text id="1">${title.replace(/'/g, "''")}</text><text id="2">${body.replace(/'/g, "''")}</text></binding></visual></toast>'; $xml = New-Object Windows.Data.Xml.Dom.XmlDocument; $xml.LoadXml($template); $toast = [Windows.UI.Notifications.ToastNotification]::new($xml); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("stali-cli").Show($toast)`;
    const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
      timeout: 8000,
    });
    return r.status === 0;
  }
  const r = spawnSync("notify-send", [title, body], { encoding: "utf8", timeout: 5000 });
  return r.status === 0;
}

export function notifyChange(title: string, body: string): void {
  terminalBell();
  notifyDesktop(title, body);
}
