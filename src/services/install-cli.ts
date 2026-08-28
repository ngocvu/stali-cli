import { spawnSync } from "child_process";
import { platform } from "os";
import { VERSION } from "../version";
import { resolveNpmInstallSpec } from "./npm-update";

export type InstallMethod = "npm" | "standalone" | "git" | "curl";

export interface InstallMethodInfo {
  method: InstallMethod;
  label: string;
  command: string;
  notes?: string;
}

export interface InstallPlan {
  recommended: InstallMethod;
  version: string;
  platform: string;
  methods: InstallMethodInfo[];
}

function resolveTargetVersion(version?: string): string {
  const v = (version || "latest").trim();
  if (!v || v === "latest") return "latest";
  return v.startsWith("v") ? v : `v${v}`;
}

export function buildInstallPlan(version?: string, channel = "stable"): InstallPlan {
  const target = resolveTargetVersion(version);
  const ch = channel.toLowerCase();
  const npmSpec =
    target === "latest"
      ? ch === "beta"
        ? "stali-cli@beta"
        : "stali-cli@latest"
      : `stali-cli@${target.replace(/^v/, "")}`;
  const isWin = platform() === "win32";
  const standaloneVersion = target === "latest" ? `v${VERSION}` : target;

  const methods: InstallMethodInfo[] = [
    {
      method: "npm",
      label: "npm global (nhanh nhất)",
      command: `npm install -g ${npmSpec} --no-fund --no-audit`,
      notes: "Cần Node.js >= 18",
    },
    {
      method: "curl",
      label: "One-liner (Linux/macOS)",
      command:
        target === "latest"
          ? "curl -fsSL https://api.stali.vn/install/stali-cli.sh | bash"
          : `STALI_CLI_VERSION=${standaloneVersion.replace(/^v/, "")} curl -fsSL https://api.stali.vn/install/stali-cli.sh | bash`,
    },
  ];

  if (isWin) {
    methods.push({
      method: "standalone",
      label: "Windows standalone binary",
      command: `$env:STALI_CLI_VERSION="${standaloneVersion}"; irm https://raw.githubusercontent.com/ngocvu/stali-cli/main/scripts/install.ps1 | iex`,
    });
  } else {
    methods.push({
      method: "standalone",
      label: "GitHub Release binary",
      command: `STALI_CLI_STANDALONE=1 STALI_CLI_VERSION=${standaloneVersion} curl -fsSL https://api.stali.vn/install/stali-cli.sh | bash`,
    });
  }

  methods.push({
    method: "git",
    label: "Build từ GitHub source",
    command: isWin
      ? `$env:STALI_CLI_INSTALL_METHOD="git"; irm https://api.stali.vn/install/stali-cli.ps1 | iex`
      : `STALI_CLI_INSTALL_METHOD=git curl -fsSL https://api.stali.vn/install/stali-cli.sh | bash`,
    notes: "Cần Bun để build",
  });

  return {
    recommended: "npm",
    version: target,
    platform: platform(),
    methods,
  };
}

function findMethod(plan: InstallPlan, method: InstallMethod): InstallMethodInfo | undefined {
  return plan.methods.find((m) => m.method === method);
}

export function printInstallPlan(plan: InstallPlan): void {
  console.log("\n📦 STALI CLI — HƯỚNG DẪN CÀI ĐẶT\n");
  console.log(`Khuyến nghị: ${plan.recommended} (${plan.platform})`);
  console.log(`Phiên bản:   ${plan.version}\n`);
  for (const m of plan.methods) {
    console.log(`• ${m.label}`);
    console.log(`  ${m.command}`);
    if (m.notes) console.log(`  (${m.notes})`);
    console.log("");
  }
}

function runNpmInstall(version?: string, channel = "stable"): number {
  if (!spawnSync("npm", ["--version"], { encoding: "utf8" }).stdout?.trim()) {
    console.error("❌ Không tìm thấy npm. Cài Node.js >= 18: https://nodejs.org");
    return 1;
  }
  const spec = resolveNpmInstallSpec({ version, channel });
  const result = spawnSync(
    "npm",
    ["install", "-g", spec, "--no-fund", "--no-audit"],
    { stdio: "inherit", shell: process.platform === "win32" }
  );
  if ((result.status ?? 1) === 0) {
    console.log("\n✅ Cài xong. Chạy: stali --version\n");
  }
  return result.status ?? 1;
}

function runShellCommand(command: string): number {
  const shell = process.platform === "win32" ? "powershell.exe" : "bash";
  const args =
    process.platform === "win32"
      ? ["-NoProfile", "-Command", command]
      : ["-lc", command];
  const result = spawnSync(shell, args, { stdio: "inherit" });
  return result.status ?? 1;
}

export async function runInstallCli(options?: {
  npm?: boolean;
  standalone?: boolean;
  git?: boolean;
  json?: boolean;
  version?: string;
  channel?: string;
  dryRun?: boolean;
}): Promise<number> {
  const channel = options?.channel || "stable";
  const plan = buildInstallPlan(options?.version, channel);

  if (options?.json) {
    console.log(JSON.stringify(plan, null, 2));
    return 0;
  }

  const method: InstallMethod | undefined = options?.npm
    ? "npm"
    : options?.standalone
      ? "standalone"
      : options?.git
        ? "git"
        : undefined;

  if (!method) {
    printInstallPlan(plan);
    return 0;
  }

  const info = findMethod(plan, method);
  if (!info) {
    console.error(`❌ Không hỗ trợ method: ${method}`);
    return 1;
  }

  if (options?.dryRun) {
    console.log(info.command);
    return 0;
  }

  if (method === "npm") {
    return runNpmInstall(options?.version, channel);
  }

  return runShellCommand(info.command);
}
