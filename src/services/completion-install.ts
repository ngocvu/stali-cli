import fs from "fs/promises";
import path from "path";
import os from "os";
import { renderCompletion } from "../commands/completion";

const MARKER_START = "# >>> stali-cli completion >>>";
const MARKER_END = "# <<< stali-cli completion <<<";

export type CompletionShell = "bash" | "zsh" | "fish";

export function detectShellFromEnv(): CompletionShell | null {
  const shell = process.env.SHELL || "";
  if (shell.includes("fish")) return "fish";
  if (shell.includes("zsh")) return "zsh";
  if (shell.includes("bash")) return "bash";
  return null;
}

export function normalizeCompletionShell(input?: string): CompletionShell | null {
  const raw = (input || "auto").toLowerCase();
  if (raw === "auto") return detectShellFromEnv();
  if (raw === "bash" || raw === "zsh" || raw === "fish") return raw;
  return null;
}

export interface CompletionInstallResult {
  shell: CompletionShell;
  path: string;
  action: "created" | "updated" | "unchanged" | "removed" | "absent";
  message: string;
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function installBash(script: string, home: string): Promise<CompletionInstallResult> {
  const rcPath = path.join(home, ".bashrc");
  const block = `${MARKER_START}\neval "$(stali completion bash)"\n${MARKER_END}`;
  let existing = "";
  try {
    existing = await fs.readFile(rcPath, "utf8");
  } catch {
    existing = "";
  }

  if (existing.includes(MARKER_START)) {
    if (existing.includes(block)) {
      return {
        shell: "bash",
        path: rcPath,
        action: "unchanged",
        message: "Bash completion đã có trong ~/.bashrc",
      };
    }
    const updated = existing.replace(
      new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`),
      block
    );
    await fs.writeFile(rcPath, updated, "utf8");
    return {
      shell: "bash",
      path: rcPath,
      action: "updated",
      message: "Đã cập nhật block completion trong ~/.bashrc",
    };
  }

  const suffix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
  await fs.writeFile(rcPath, `${existing}${suffix}\n${block}\n`, "utf8");
  return {
    shell: "bash",
    path: rcPath,
    action: "created",
    message: "Đã thêm completion vào ~/.bashrc — chạy: source ~/.bashrc",
  };
}

async function installFish(script: string, home: string): Promise<CompletionInstallResult> {
  const target = path.join(home, ".config", "fish", "completions", "stali.fish");
  await ensureDir(target);
  let prev = "";
  try {
    prev = await fs.readFile(target, "utf8");
  } catch {
    prev = "";
  }
  if (prev === script) {
    return {
      shell: "fish",
      path: target,
      action: "unchanged",
      message: "Fish completion đã đúng tại ~/.config/fish/completions/stali.fish",
    };
  }
  await fs.writeFile(target, script, "utf8");
  return {
    shell: "fish",
    path: target,
    action: prev ? "updated" : "created",
    message: prev
      ? "Đã cập nhật fish completion"
      : "Đã ghi fish completion — mở shell fish mới hoặc exec fish",
  };
}

async function installZsh(script: string, home: string): Promise<CompletionInstallResult> {
  const compDir = path.join(home, ".config", "zsh", "completions");
  const target = path.join(compDir, "_stali");
  await ensureDir(target);
  let prev = "";
  try {
    prev = await fs.readFile(target, "utf8");
  } catch {
    prev = "";
  }
  if (prev === script) {
    return {
      shell: "zsh",
      path: target,
      action: "unchanged",
      message: "Zsh completion đã đúng tại ~/.config/zsh/completions/_stali",
    };
  }
  await fs.writeFile(target, script, "utf8");

  const zshrc = path.join(home, ".zshrc");
  const fpathLine = 'fpath=(~/.config/zsh/completions $fpath)';
  const autoloadLine = "autoload -Uz compinit && compinit";
  let rc = "";
  try {
    rc = await fs.readFile(zshrc, "utf8");
  } catch {
    rc = "";
  }
  let changedRc = false;
  if (!rc.includes(".config/zsh/completions")) {
    rc += `${rc.endsWith("\n") || rc.length === 0 ? "" : "\n"}${fpathLine}\n`;
    changedRc = true;
  }
  if (!rc.includes("compinit")) {
    rc += `${autoloadLine}\n`;
    changedRc = true;
  }
  if (changedRc) {
    await fs.writeFile(zshrc, rc, "utf8");
  }

  return {
    shell: "zsh",
    path: target,
    action: prev ? "updated" : "created",
    message: changedRc
      ? "Đã ghi _stali và cập nhật ~/.zshrc (fpath + compinit)"
      : "Đã ghi _stali — chạy: exec zsh",
  };
}

export async function installCompletion(
  shellInput?: string,
  homeDir?: string
): Promise<CompletionInstallResult> {
  const home = homeDir || os.homedir();
  const shell = normalizeCompletionShell(shellInput);
  if (!shell) {
    throw new Error("Shell không hỗ trợ — dùng: bash, zsh, fish hoặc auto");
  }
  const script = renderCompletion(shell);
  if (!script) {
    throw new Error(`Không tạo được script completion cho: ${shell}`);
  }

  switch (shell) {
    case "bash":
      return installBash(script, home);
    case "fish":
      return installFish(script, home);
    case "zsh":
      return installZsh(script, home);
  }
}

async function uninstallBash(home: string): Promise<CompletionInstallResult> {
  const rcPath = path.join(home, ".bashrc");
  let existing = "";
  try {
    existing = await fs.readFile(rcPath, "utf8");
  } catch {
    return {
      shell: "bash",
      path: rcPath,
      action: "absent",
      message: "Không có ~/.bashrc — không cần gỡ",
    };
  }
  if (!existing.includes(MARKER_START)) {
    return {
      shell: "bash",
      path: rcPath,
      action: "absent",
      message: "Không tìm thấy block stali-cli trong ~/.bashrc",
    };
  }
  const updated = existing
    .replace(new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`), "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  const content = updated ? `${updated}\n` : "";
  await fs.writeFile(rcPath, content, "utf8");
  return {
    shell: "bash",
    path: rcPath,
    action: "removed",
    message: "Đã gỡ block completion khỏi ~/.bashrc",
  };
}

async function uninstallFish(home: string): Promise<CompletionInstallResult> {
  const target = path.join(home, ".config", "fish", "completions", "stali.fish");
  try {
    await fs.unlink(target);
    return {
      shell: "fish",
      path: target,
      action: "removed",
      message: "Đã xóa ~/.config/fish/completions/stali.fish",
    };
  } catch {
    return {
      shell: "fish",
      path: target,
      action: "absent",
      message: "Fish completion chưa được cài",
    };
  }
}

async function uninstallZsh(home: string): Promise<CompletionInstallResult> {
  const target = path.join(home, ".config", "zsh", "completions", "_stali");
  try {
    await fs.unlink(target);
    return {
      shell: "zsh",
      path: target,
      action: "removed",
      message: "Đã xóa ~/.config/zsh/completions/_stali (giữ nguyên ~/.zshrc)",
    };
  } catch {
    return {
      shell: "zsh",
      path: target,
      action: "absent",
      message: "Zsh completion chưa được cài",
    };
  }
}

export async function uninstallCompletion(
  shellInput?: string,
  homeDir?: string
): Promise<CompletionInstallResult> {
  const home = homeDir || os.homedir();
  const shell = normalizeCompletionShell(shellInput);
  if (!shell) {
    throw new Error("Shell không hỗ trợ — dùng: bash, zsh, fish hoặc auto");
  }
  switch (shell) {
    case "bash":
      return uninstallBash(home);
    case "fish":
      return uninstallFish(home);
    case "zsh":
      return uninstallZsh(home);
  }
}

export type CompletionDiagStatus = "ok" | "missing" | "stale" | "absent";

export interface CompletionDiagnostic {
  shell: CompletionShell;
  installed: boolean;
  status: CompletionDiagStatus;
  path: string;
  message: string;
}

async function diagnoseBash(home: string): Promise<CompletionDiagnostic> {
  const rcPath = path.join(home, ".bashrc");
  try {
    const existing = await fs.readFile(rcPath, "utf8");
    if (!existing.includes(MARKER_START)) {
      return {
        shell: "bash",
        installed: false,
        status: "absent",
        path: rcPath,
        message: "Chưa có block stali-cli trong ~/.bashrc",
      };
    }
    return {
      shell: "bash",
      installed: true,
      status: "ok",
      path: rcPath,
      message: "Block completion có trong ~/.bashrc",
    };
  } catch {
    return {
      shell: "bash",
      installed: false,
      status: "missing",
      path: rcPath,
      message: "Không có ~/.bashrc",
    };
  }
}

async function diagnoseFish(home: string): Promise<CompletionDiagnostic> {
  const target = path.join(home, ".config", "fish", "completions", "stali.fish");
  const expected = renderCompletion("fish") || "";
  try {
    const prev = await fs.readFile(target, "utf8");
    if (prev === expected) {
      return {
        shell: "fish",
        installed: true,
        status: "ok",
        path: target,
        message: "Fish completion khớp phiên bản hiện tại",
      };
    }
    return {
      shell: "fish",
      installed: true,
      status: "stale",
      path: target,
      message: "Fish completion cũ — chạy: stali completion install fish",
    };
  } catch {
    return {
      shell: "fish",
      installed: false,
      status: "absent",
      path: target,
      message: "Chưa cài fish completion",
    };
  }
}

async function diagnoseZsh(home: string): Promise<CompletionDiagnostic> {
  const target = path.join(home, ".config", "zsh", "completions", "_stali");
  const expected = renderCompletion("zsh") || "";
  try {
    const prev = await fs.readFile(target, "utf8");
    if (prev === expected) {
      return {
        shell: "zsh",
        installed: true,
        status: "ok",
        path: target,
        message: "Zsh completion khớp phiên bản hiện tại",
      };
    }
    return {
      shell: "zsh",
      installed: true,
      status: "stale",
      path: target,
      message: "Zsh completion cũ — chạy: stali completion install zsh",
    };
  } catch {
    return {
      shell: "zsh",
      installed: false,
      status: "absent",
      path: target,
      message: "Chưa cài zsh completion",
    };
  }
}

export async function diagnoseCompletion(
  shellInput?: string,
  homeDir?: string
): Promise<CompletionDiagnostic[]> {
  const home = homeDir || os.homedir();
  const shell = shellInput && shellInput !== "auto" ? normalizeCompletionShell(shellInput) : null;
  if (shell) {
    switch (shell) {
      case "bash":
        return [await diagnoseBash(home)];
      case "fish":
        return [await diagnoseFish(home)];
      case "zsh":
        return [await diagnoseZsh(home)];
    }
  }
  return Promise.all([
    diagnoseBash(home),
    diagnoseFish(home),
    diagnoseZsh(home),
  ]);
}
