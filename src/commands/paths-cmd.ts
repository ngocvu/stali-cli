import chalk from "chalk";
import { runDoctorScan } from "../services/syncers";
import {
  getStaliBinDir,
  getStaliCliInstallDir,
  getStaliHome,
  getStaliConfigPath,
} from "../constants/paths";
import {
  resolveAllToolPaths,
  hasPathSpec,
  type PathConfidence,
} from "../services/syncers/paths";
import { SUPPORTED_TOOLS } from "../constants/tools";

export async function runPaths() {
  console.log(chalk.bold.cyan("\n📁 STALI PATHS\n"));
  console.log(`${chalk.white("Home")}     ${getStaliHome()}`);
  console.log(`${chalk.white("CLI")}      ${getStaliCliInstallDir()}`);
  console.log(`${chalk.white("Bin")}      ${getStaliBinDir()}`);
  console.log(`${chalk.white("Config")}   ${getStaliConfigPath()}`);
  console.log(chalk.gray("\nThêm vào PATH nếu lệnh stali chưa nhận:"));
  console.log(chalk.yellow(`  export PATH="${getStaliBinDir()}:$PATH"`));
  console.log("");
}

function confidenceLabel(c: PathConfidence): string {
  switch (c) {
    case "verified":
      return chalk.green("đã kiểm chứng");
    case "convention":
      return chalk.yellow("theo quy ước");
    default:
      return chalk.gray("chưa xác minh");
  }
}

export async function runToolsList() {
  const statuses = await runDoctorScan();
  console.log(chalk.bold.cyan("\n🔧 STALI CLI — 13 công cụ hỗ trợ\n"));
  for (const s of statuses) {
    const icon = s.configuredForStali ? chalk.green("✓") : chalk.yellow("○");
    console.log(
      `${icon} ${chalk.white(s.toolId.padEnd(14))} ${chalk.gray(s.toolName)}`
    );
    console.log(chalk.gray(`     ${s.configPath}`));
  }
  console.log(chalk.gray("\nCấu hình: stali configure <toolId> -k sk-stali-...\n"));
}

/**
 * `stali paths --tools` — in đường dẫn cấu hình THẬT của từng tool kèm mức
 * tin cậy, để người dùng tự kiểm chứng thay vì tin vào lời hứa của CLI.
 *
 * Cột "tồn tại" cho biết file/thư mục đã có trên máy chưa; nếu có, stali-cli
 * sẽ dùng đúng đường dẫn đó (tôn trọng cấu hình sẵn có).
 */
export async function runToolPaths(opts?: { json?: boolean }): Promise<number> {
  const infos = await resolveAllToolPaths();
  const byId = new Map(infos.map((i) => [i.toolId, i]));

  if (opts?.json) {
    const payload = {
      schemaVersion: 2,
      command: "paths-tools",
      tools: SUPPORTED_TOOLS.map((t) => {
        const info = byId.get(t.id);
        return {
          toolId: t.id,
          toolName: t.name,
          path: info?.chosen ?? t.configFile,
          exists: info?.exists ?? false,
          confidence: info?.confidence ?? "unverified",
          candidates: info?.candidates.map((c) => c.path) ?? [],
          note: info?.note,
        };
      }),
    };
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }

  console.log(chalk.bold.cyan("\n🔍 ĐƯỜNG DẪN CẤU HÌNH THẬT CỦA TỪNG TOOL\n"));
  console.log(
    chalk.gray(
      "Mức tin cậy: " +
        chalk.green("đã kiểm chứng") +
        " = đối chiếu với tool/package thật · " +
        chalk.yellow("theo quy ước") +
        " = XDG/VS Code globalStorage · " +
        chalk.gray("chưa xác minh") +
        " = chưa kiểm chứng được"
    )
  );
  console.log("");

  for (const t of SUPPORTED_TOOLS) {
    const info = byId.get(t.id);
    if (!info) {
      console.log(
        `${chalk.gray("?")} ${chalk.white(t.id.padEnd(14))} ${chalk.gray("(chưa có định nghĩa đường dẫn)")}`
      );
      continue;
    }
    const existsMark = info.exists ? chalk.green("có") : chalk.gray("chưa");
    console.log(
      `${chalk.white(t.id.padEnd(14))} ${confidenceLabel(info.confidence)} · tồn tại: ${existsMark}`
    );
    console.log(chalk.cyan(`  ${info.chosen}`));
    if (info.note) console.log(chalk.gray(`  ${info.note}`));
    if (info.candidates.length > 1) {
      console.log(chalk.gray("  đường dẫn khác đã xét:"));
      for (const c of info.candidates.slice(1)) {
        console.log(chalk.gray(`    · ${c.path}  (${c.note})`));
      }
    }
    console.log("");
  }

  const unverified = infos.filter((i) => i.confidence === "unverified");
  if (unverified.length > 0) {
    console.log(
      chalk.yellow(
        `⚠ ${unverified.length} tool chưa xác minh được đường dẫn/định dạng: ` +
          unverified.map((u) => u.toolId).join(", ")
      )
    );
    console.log(
      chalk.gray(
        "  stali-cli KHÔNG hứa cấu hình đúng cho nhóm này. Cài tool rồi chạy lại để kiểm chứng.\n"
      )
    );
  }
  return 0;
}
