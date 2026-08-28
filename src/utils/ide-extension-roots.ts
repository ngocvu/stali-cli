import os from "os";
import path from "path";
import { IDE_EXTENSION_ROOTS } from "../constants/tool-binaries";

/** Absolute paths to scan for VS Code / Cursor / Windsurf extensions. */
export function resolveIdeExtensionRoots(home = os.homedir()): string[] {
  const roots = IDE_EXTENSION_ROOTS.map((rel) => path.join(home, rel));

  if (process.env.APPDATA?.trim() || process.env.LOCALAPPDATA?.trim() || process.platform === "win32") {
    const appData = process.env.APPDATA?.trim();
    const localAppData = process.env.LOCALAPPDATA?.trim();
    if (appData) {
      roots.push(
        path.join(appData, "Code", "extensions"),
        path.join(appData, "Cursor", "extensions"),
        path.join(appData, "Windsurf", "extensions"),
        path.join(appData, "Code", "User", "globalStorage"),
        path.join(appData, "Cursor", "User", "globalStorage"),
        path.join(appData, "Windsurf", "User", "globalStorage"),
        path.join(appData, "Code - Insiders", "extensions"),
        path.join(appData, "Code - Insiders", "User", "globalStorage")
      );
    }
    if (localAppData) {
      roots.push(
        path.join(localAppData, "Programs", "Microsoft VS Code", "resources", "app", "extensions"),
        path.join(localAppData, "Programs", "cursor", "resources", "app", "extensions")
      );
    }
  }

  return [...new Set(roots)];
}
