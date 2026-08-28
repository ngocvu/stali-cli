import Table from "cli-table3";
import chalk from "chalk";
import { fetchRealtimeModels } from "../services/api";
import { formatPricingSummary, formatTokens } from "../utils/format";
import { resolveApiKey, resolveBaseUrl } from "./context";

export async function displayModelsTable(apiKey?: string) {
  const token = await resolveApiKey(apiKey);
  const baseUrl = await resolveBaseUrl();
  const result = await fetchRealtimeModels(token, { baseUrl });

  if (result.models.length === 0) {
    console.log(chalk.red("\n❌ Không thể lấy danh sách model thời gian thực từ Stali API."));
    if (result.error) {
      console.log(chalk.yellow(`   ${result.error}`));
    }
    if (result.endpoint) {
      console.log(chalk.gray(`   Endpoint: ${result.endpoint}`));
    }
    console.log(
      chalk.yellow(
        "Vui lòng kiểm tra kết nối mạng hoặc cung cấp API token hợp lệ với 'stali -k <token>' hoặc 'stali ls -k <token>'.\n"
      )
    );
    process.exit(1);
  }

  const models = result.models;
  const table = new Table({
    head: [
      chalk.cyan("Tên Model"),
      chalk.cyan("Mã Model (ID)"),
      chalk.yellow("Giá Token / Lượt"),
      chalk.magenta("Context"),
      chalk.green("Giao thức"),
    ],
  });

  models.forEach((m) => {
    table.push([
      chalk.white(m.display_name),
      chalk.gray(m.id),
      chalk.yellow(formatPricingSummary(m.billing_unit, m.pricing)),
      chalk.magenta(formatTokens(m.context_window)),
      chalk.green(m.supported_endpoint_types.join(", ")),
    ]);
  });

  console.log(
    chalk.bold.magenta(
      `\n📊 BẢNG GIÁ MODEL STALI API (${models.length} models - ${result.endpoint || "https://api.stali.vn/v1/models"}):\n`
    )
  );
  console.log(table.toString());
  console.log(
    chalk.gray(
      "\n💡 Chạy 'stali' để mở wizard cấu hình cho 13 công cụ AI (Claude, Codex, OpenClaw, …).\n"
    )
  );
}
