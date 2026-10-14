import chalk from "chalk";
import { loadStaliConfig } from "./config";
import { discoverStaliKey } from "./key-discovery";
import { resolveStaliUrls } from "../utils/stali-urls";
import { loadModelCatalog, modelsForProtocol } from "./model-catalog";
import { getToolById, resolveToolId } from "../utils/tool-utils";
import { runDoctorScan } from "./syncers";

export interface VerifyResult {
  ok: boolean;
  keyValid: boolean;
  /** Nơi tìm thấy key đang kiểm tra. */
  keySource?: string;
  modelCount: number;
  /** Model đã cấu hình cho từng tool còn tồn tại trên API không. */
  toolModels: Array<{
    toolId: string;
    model: string;
    ok: boolean;
    note: string;
  }>;
  error?: string;
}

/**
 * Xác minh END-TO-END: key còn sống không, và model đã ghi vào từng tool
 * có còn tồn tại trên API không.
 *
 * Vì sao cần: `doctor` chỉ kiểm tra "file có trỏ Stali không" nên vẫn báo
 * "đã cấu hình" khi key đã hết hiệu lực hoặc model đã bị NCC gỡ. Người dùng
 * chỉ phát hiện khi mở app và gặp lỗi. Hàm này gọi API thật để chắc chắn.
 */
export async function verifyConfiguration(opts?: {
  apiKey?: string;
  baseUrl?: string;
  toolId?: string;
}): Promise<VerifyResult> {
  const cfg = await loadStaliConfig();
  let apiKey = opts?.apiKey?.trim() || cfg?.apiKey?.trim() || "";
  let keySource = cfg?.apiKey?.trim() ? "~/.stali/config.json" : "";

  // Người dùng có thể đã cấu hình qua `stali configure` mà chưa `auth login`
  // → key nằm trong config của tool. Dò ra để vẫn xác minh được.
  if (!apiKey) {
    const found = await discoverStaliKey();
    if (found) {
      apiKey = found.key;
      keySource = found.source;
    }
  }

  const baseUrl = opts?.baseUrl || cfg?.baseUrl;

  if (!apiKey) {
    return {
      ok: false,
      keyValid: false,
      modelCount: 0,
      toolModels: [],
      error:
        "Không tìm thấy API key Stali nào trên máy. Chạy: stali setup -k sk-stali-...",
    };
  }

  // 1. Key còn sống? Gọi API thật.
  const catalog = await loadModelCatalog({ apiKey, baseUrl, force: true });
  const keyValid = catalog.models.length > 0 && !catalog.error;

  // 2. Quét model đã ghi vào từng tool, đối chiếu với danh mục thật.
  const scan = await runDoctorScan({ bypassCache: true });
  const toolModels: VerifyResult["toolModels"] = [];

  for (const t of scan) {
    if (opts?.toolId && t.toolId !== resolveToolId(opts.toolId)) continue;
    if (!t.configuredForStali) continue;
    const model = (t.model || "").trim();
    const tool = getToolById(t.toolId);

    if (!model) {
      toolModels.push({
        toolId: t.toolId,
        model: "(mặc định của tool)",
        ok: true,
        note: "không ghim model — app tự chọn",
      });
      continue;
    }

    if (!keyValid) {
      toolModels.push({
        toolId: t.toolId,
        model,
        ok: false,
        note: "chưa kiểm chứng được (key không gọi được API)",
      });
      continue;
    }

    const exists = catalog.models.some((m) => m.id === model);
    if (exists) {
      const m = catalog.models.find((x) => x.id === model)!;
      const protocol = tool?.protocol ?? "openai";
      const fits =
        protocol === "both" || m.supported_endpoint_types?.includes(protocol as any);
      toolModels.push({
        toolId: t.toolId,
        model,
        ok: fits,
        note: fits
          ? "còn tồn tại và hợp giao thức"
          : `model không hỗ trợ giao thức ${protocol} của tool này`,
      });
    } else {
      toolModels.push({
        toolId: t.toolId,
        model,
        ok: false,
        note: "MODEL KHÔNG CÒN trên API — cần đổi model",
      });
    }
  }

  return {
    ok: keyValid && toolModels.every((t) => t.ok),
    keyValid,
    keySource,
    modelCount: catalog.models.length,
    toolModels,
    error: catalog.error,
  };
}

/** In kết quả xác minh cho người dùng. */
export async function runVerify(opts?: {
  json?: boolean;
  apiKey?: string;
  baseUrl?: string;
  toolId?: string;
}): Promise<number> {
  const r = await verifyConfiguration(opts);

  if (opts?.json) {
    console.log(JSON.stringify({ schemaVersion: 2, command: "verify", ...r }, null, 2));
    return r.ok ? 0 : 1;
  }

  console.log(chalk.bold.cyan("\n🔎 XÁC MINH CẤU HÌNH (gọi API thật)\n"));

  if (!r.keyValid) {
    console.log(chalk.red(`✗ API key KHÔNG dùng được: ${r.error || "không gọi được /v1/models"}`));
    console.log(
      chalk.gray("\n  → Key có thể đã hết hiệu lực hoặc bị thu hồi.")
    );
    console.log(chalk.cyan("  → Tạo key mới: https://api.stali.vn/dashboard/keys"));
    console.log(chalk.cyan("  → Rồi chạy: stali setup -k sk-stali-...\n"));
    return 1;
  }

  console.log(chalk.green(`✓ API key còn sống — thấy ${r.modelCount} model`));
  if (r.keySource) console.log(chalk.gray(`  (key lấy từ ${r.keySource})\n`));

  if (r.toolModels.length === 0) {
    console.log(chalk.yellow("○ Chưa tool nào được cấu hình trỏ Stali."));
    console.log(chalk.cyan("  → stali setup -k sk-stali-...\n"));
    return r.ok ? 0 : 1;
  }

  for (const t of r.toolModels) {
    const icon = t.ok ? chalk.green("✓") : chalk.red("✗");
    console.log(`${icon} ${chalk.white(t.toolId.padEnd(14))} ${chalk.gray(t.model)}`);
    if (!t.ok) console.log(chalk.red(`    ${t.note}`));
  }

  const bad = r.toolModels.filter((t) => !t.ok);
  if (bad.length > 0) {
    console.log(chalk.red(`\n✗ ${bad.length} tool cần xử lý ở trên.\n`));
    console.log(chalk.cyan("  Sửa: stali configure <tool> -k sk-stali-...\n"));
    return 1;
  }

  console.log(chalk.green("\n✅ Tất cả tool đã cấu hình đều dùng key sống + model còn tồn tại.\n"));
  return 0;
}
