import { spawnSync } from "child_process";
import type { SelfUpdateResult } from "./self-update";
import type { UpdateChannel } from "./update-channel";
import { writeInstallModeMarker } from "./install-mode";

export function resolveNpmInstallSpec(options?: {
  channel?: string;
  version?: string;
}): string {
  const version = options?.version?.trim();
  if (version && version !== "latest") {
    return `stali-cli@${version.replace(/^v/, "")}`;
  }
  const ch = (options?.channel || "stable").toLowerCase();
  if (ch === "beta") return "stali-cli@beta";
  return "stali-cli@latest";
}

export function runNpmGlobalInstall(spec: string): { ok: boolean; detail: string } {
  const r = spawnSync(
    "npm",
    ["install", "-g", spec, "--no-fund", "--no-audit"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      timeout: 120_000,
    }
  );
  const detail = ((r.stdout || "") + (r.stderr || "")).slice(0, 500);
  return { ok: r.status === 0, detail };
}

export async function updateCliViaNpm(
  channel: UpdateChannel | string = "stable"
): Promise<SelfUpdateResult> {
  if (!spawnSync("npm", ["--version"], { encoding: "utf8" }).stdout?.trim()) {
    return {
      success: false,
      message: "Không tìm thấy npm",
      error: "Cài Node.js >= 18 hoặc dùng stali update (git/standalone)",
    };
  }

  const spec = resolveNpmInstallSpec({ channel });
  const result = runNpmGlobalInstall(spec);
  if (!result.ok) {
    return {
      success: false,
      message: "npm install -g thất bại",
      error: result.detail,
    };
  }

  await writeInstallModeMarker({
    mode: "npm-global",
    version: spec.replace("stali-cli@", ""),
  });

  return {
    success: true,
    message: `Đã cập nhật qua npm (${spec})`,
  };
}
