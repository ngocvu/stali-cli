import { Command } from "commander";
import chalk from "chalk";
import {
  loadStaliConfig,
  loadStaliConfigOrCorrupt,
  resetStaliConfig,
  setStaliBaseUrl,
} from "../services/config";
import {
  authLogin,
  authLogout,
  authStatus,
  STALI_DASHBOARD_KEYS_URL,
} from "../services/auth-cli";
import { openUrlInBrowser } from "../utils/open-url";
import { renderAppGuide, listGuideIds } from "../constants/guides";
import { STALI_DOCS_URL } from "../constants/api";
import { runHealthCheck } from "../services/health-check";
import { fetchLatestVersion } from "../services/version-check";
import { resolveUpdateChannelResolved } from "../services/update-channel";
import { maskToken } from "../utils/token";
import { getToolById, resolveToolId } from "../utils/tool-utils";
import { VERSION } from "../version";
import { setLocale, resolveLocale, t } from "../i18n";
import { loadPlugins, writePluginsExample, getPluginsPath } from "../services/plugins";
import { resolveApiKey } from "./context";
import { runBackupsList } from "./backups";
import { runPaths, runToolsList } from "./paths-cmd";
import { resolveIncludePluginsFromHome } from "../utils/include-plugins";

async function runPluginsList(opts: { init?: boolean }) {
  if (opts.init) {
    const p = await writePluginsExample();
    console.log(chalk.green(`\n✅ Created: ${p}\n`));
  }
  const plugins = await loadPlugins();
  console.log(chalk.bold.cyan(`\n${t("plugins_title")}\n`));
  console.log(chalk.gray(`File: ${getPluginsPath()}\n`));
  if (plugins.length === 0) {
    console.log(chalk.yellow(`${t("plugins_empty")}\n`));
    console.log(chalk.gray("Create sample: stali plugins --init\n"));
    process.exit(0);
  }
  for (const p of plugins) {
    console.log(`• ${chalk.white(p.name)} (${p.id}) — ${p.protocol}`);
    console.log(chalk.gray(`  ${p.configFile}${p.description ? ` — ${p.description}` : ""}`));
  }
  console.log(chalk.gray("\nĐồng bộ config plugin: stali plugins sync\n"));
  process.exit(0);
}

export function registerCommands(program: Command): void {
  program
    .name("stali")
    .description(
      "Stali API CLI — setup nhanh: stali -k sk-stali-... | stali setup | stali status"
    )
    .version(VERSION)
    .option("--lang <locale>", "Ngôn ngữ CLI: vi | en (hoặc STALI_LANG)")
    .option("-k, --key <token>", "Stali API Token để xác thực trực tiếp")
    .option("--models", "Xem nhanh danh sách và bảng giá model thời gian thực")
    .option("-r, --reset", "Xóa token đã lưu trong ~/.stali/config.json để đăng nhập lại")
    .option("--logout", "Đăng xuất / xóa token đã lưu")
    .hook("preAction", (thisCommand, actionCommand) => {
      const globals = actionCommand.optsWithGlobals?.() ?? thisCommand.opts();
      const lang = globals.lang || process.env.STALI_LANG;
      if (lang) setLocale(resolveLocale(String(lang)));
    })
    .hook("postAction", async (_thisCommand, actionCommand) => {
      const name = actionCommand.name();
      const parent = actionCommand.parent?.name();
      if (!name || name === "bench" || name === "telemetry" || parent === "telemetry") return;
      try {
        const { recordCliTelemetry } = await import("../services/telemetry");
        await recordCliTelemetry(name);
      } catch {
        /* ignore */
      }
    });

  program.action(async (options: { reset?: boolean; logout?: boolean; models?: boolean; key?: string }) => {
    if (options.reset || options.logout) {
      await resetStaliConfig();
      console.log(chalk.green("✅ Đã xóa token đã lưu trong ~/.stali/config.json thành công."));
      process.exit(0);
    }
    if (options.models) {
      const { displayModelsTable } = await import("./models");
      await displayModelsTable(options.key);
      process.exit(0);
    }
    program.outputHelp();
    process.exit(1);
  });

  program
    .command("ls")
    .description("Xem nhanh bảng giá model thời gian thực (tương đương stali --models)")
    .option("-k, --key <token>", "Stali API Token")
    .action(async (opts) => {
      const globals = program.opts<{ key?: string }>();
      const { displayModelsTable } = await import("./models");
      await displayModelsTable(opts.key || globals.key);
      process.exit(0);
    });

  program
    .command("check")
    .description("Kiểm tra nhanh: auth + doctor (exit 1 nếu lỗi)")
    .option("--strict", "Yêu cầu tất cả tool (và plugin nếu có) đã trỏ Stali")
    .option("--tools-only", "Chỉ kiểm tra 13 tool (bỏ plugin)")
    .option("--plugins-only", "Chỉ kiểm tra plugin (~/.stali/plugins.json)")
    .option("--json", "Xuất JSON")
    .action(async (opts: {
      strict?: boolean;
      json?: boolean;
      toolsOnly?: boolean;
      pluginsOnly?: boolean;
    }) => {
      if (opts.toolsOnly && opts.pluginsOnly) {
        console.error(chalk.red("❌ --tools-only và --plugins-only không dùng cùng lúc"));
        process.exit(1);
      }
      const result = await runHealthCheck({
        strict: opts.strict,
        toolsOnly: opts.toolsOnly,
        pluginsOnly: opts.pluginsOnly,
      });
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }
      console.log(chalk.bold.cyan(`\n${t("check_title")}\n`));
      for (const msg of result.messages) {
        console.log(` • ${msg}`);
      }
      console.log(result.ok ? chalk.green(`\n${t("check_ok")}\n`) : chalk.red(`\n${t("check_fail")}\n`));
      process.exit(result.ok ? 0 : 1);
    });

  program
    .command("setup")
    .description("Cài Stali API nhanh nhất: auth + gateway auto + kiểm tra (khuyến nghị)")
    .option("-k, --key <token>", "Stali API key (sk-stali-...)")
    .option("--include-plugins", "Đồng bộ plugin nếu có plugins.json")
    .option("--no-plugins", "Bỏ qua plugin")
    .option("--all-apps", "Cài gateway cả 13 tool (không chỉ app đang dùng)")
    .option("--skip-configure", "Chỉ lưu API key")
    .option("--json", "JSON output (CI/script)")
    .action(async (opts: {
      key?: string;
      includePlugins?: boolean;
      noPlugins?: boolean;
      allApps?: boolean;
      skipConfigure?: boolean;
      json?: boolean;
    }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = opts.key || globals.key;
      if (!apiKey?.trim()) {
        console.error(chalk.red(`❌ ${t("missing_key")}`));
        console.log(chalk.cyan(`\nVí dụ: stali setup -k sk-stali-...\n${STALI_DASHBOARD_KEYS_URL}\n`));
        process.exit(1);
      }
      const { runUserSetup } = await import("../services/init-cli");
      const { printSetupResult, formatSetupJson } = await import("../services/setup-cli");
      const result = await runUserSetup({
        apiKey: apiKey.trim(),
        skipConfigure: opts.skipConfigure,
        includePlugins: opts.includePlugins,
        noPlugins: opts.noPlugins,
        installedOnly: !opts.allApps,
      });
      if (opts.json) {
        console.log(JSON.stringify(formatSetupJson(result), null, 2));
      } else {
        printSetupResult(result);
      }
      process.exit(result.success ? 0 : 1);
    });

  program
    .command("status")
    .description("Trạng thái setup nhanh (auth + gateway) — không cần wizard")
    .option("--json", "JSON output")
    .option("--online", "Validate API key qua mạng")
    .action(async (opts: { json?: boolean; online?: boolean }) => {
      const { runUserStatus } = await import("../services/status-cli");
      const code = await runUserStatus({ json: opts.json, validateAuth: opts.online });
      process.exit(code);
    });

  program
    .command("init")
    .description("Khởi tạo đầy đủ (completion, kiểm tra phiên bản). Nhanh hơn: stali setup")
    .option("-k, --key <token>", "Stali API key")
    .option("--skip-configure", "Chỉ lưu API key, không configure-all")
    .option("--include-plugins", "Đồng bộ plugin (mặc định: bật nếu plugins.json có entry)")
    .option("--no-plugins", "Bỏ qua plugin khi configure-all")
    .option("--skip-completion", "Bỏ qua cài shell completion (bash/fish/zsh)")
    .option("--skip-cli-check", "Bỏ qua kiểm tra phiên bản stali-cli")
    .option("--upgrade-cli", "Nâng cấp stali-cli qua npm nếu có bản mới")
    .option("--all-apps", "Configure cả 13 tool (bỏ qua quét app đang dùng)")
    .option("-y, --yes", "Gateway không in banner kế hoạch (CI/script)")
    .action(async (opts: {
      key?: string;
      skipConfigure?: boolean;
      includePlugins?: boolean;
      noPlugins?: boolean;
      skipCompletion?: boolean;
      skipCliCheck?: boolean;
      upgradeCli?: boolean;
      allApps?: boolean;
      yes?: boolean;
    }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = opts.key || globals.key;
      if (!apiKey?.trim()) {
        console.error(chalk.red(`❌ ${t("missing_key")}`));
        console.log(chalk.cyan(`\n${STALI_DASHBOARD_KEYS_URL}\n`));
        process.exit(1);
      }
      console.log(chalk.bold.cyan(`\n${t("init_title")}\n`));
      const { runInit } = await import("../services/init-cli");
      const { printSetupResult } = await import("../services/setup-cli");
      const result = await runInit({
        apiKey: apiKey.trim(),
        skipConfigure: opts.skipConfigure,
        includePlugins: opts.includePlugins,
        noPlugins: opts.noPlugins,
        skipCompletion: opts.skipCompletion,
        skipCliCheck: opts.skipCliCheck,
        upgradeCli: opts.upgradeCli,
        installedOnly: !opts.allApps,
        yes: opts.yes ?? true,
      });
      printSetupResult(result, { title: t("init_title"), done: t("init_done") });
      process.exit(result.success ? 0 : 1);
    });

  const pluginsCmd = program
    .command("plugins")
    .description("Plugin tùy chỉnh (~/.stali/plugins.json)");

  pluginsCmd
    .command("list", { isDefault: true })
    .description("Liệt kê plugin đã khai báo")
    .option("--init", "Tạo file plugins.json mẫu nếu chưa có")
    .action(async (opts: { init?: boolean }) => {
      await runPluginsList(opts);
    });

  pluginsCmd
    .command("sync")
    .description("Đồng bộ config cho plugin (~/.stali/plugins.json)")
    .option("-k, --key <token>", "Stali API key")
    .option("-m, --model <model>", "Model Stali áp dụng")
    .option("--dry-run", "Chỉ liệt kê, không ghi file")
    .option("--ids <list>", "Chỉ các plugin id (cách nhau bởi dấu phẩy)")
    .action(async (opts: { key?: string; model?: string; dryRun?: boolean; ids?: string }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = await resolveApiKey(opts.key || globals.key);
      if (!apiKey) {
        console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua wizard."));
        process.exit(1);
      }
      const cfg = await loadStaliConfig();
      const pluginIds = opts.ids
        ? opts.ids.split(",").map((id) => id.trim()).filter(Boolean)
        : undefined;

      const { runPluginsSync } = await import("../services/plugin-sync");
      const { items, allOk } = await runPluginsSync({
        apiKey,
        baseUrl: cfg?.baseUrl,
        model: opts.model,
        pluginIds,
        dryRun: opts.dryRun,
      });

      if (opts.dryRun) {
        console.log(chalk.bold.cyan("\n🔍 Plugins sync (dry-run)\n"));
      } else {
        console.log(chalk.bold.cyan("\n🔌 PLUGINS SYNC\n"));
      }
      for (const item of items) {
        const icon = item.success ? chalk.green("✓") : chalk.red("✗");
        console.log(`${icon} ${chalk.white(item.pluginName || item.pluginId)} — ${item.message}`);
        if (item.configPath) console.log(chalk.gray(`   ${item.configPath}`));
      }
      console.log("");
      process.exit(allOk ? 0 : 1);
    });

  pluginsCmd
    .command("doctor")
    .description("(đã gỡ v3.2) dùng: stali doctor --plugins-only")
    .option("--json", "deprecated")
    .action(async () => {
      console.error(
        chalk.red("\n✖ plugins doctor đã gỡ trong v3.2\n") +
          chalk.cyan("  → stali doctor --plugins-only [--json]\n")
      );
      process.exit(2);
    });

  const configCmd = program
    .command("config")
    .description("Xem cấu hình ~/.stali/config.json (masked)");

  configCmd
    .command("show")
    .description("Hiển thị config đã lưu (API key masked)")
    .option("--json", "Xuất JSON (key masked)")
    .action(async (opts: { json?: boolean }) => {
      const { config, corrupt } = await loadStaliConfigOrCorrupt();
      if (corrupt) {
        console.error(chalk.red("❌ ~/.stali/config.json bị lỗi định dạng"));
        process.exit(1);
      }
      if (!config) {
        console.log(chalk.yellow("\n○ Chưa có config — stali auth login -k sk-stali-...\n"));
        process.exit(1);
      }
      const masked = { ...config, apiKey: maskToken(config.apiKey) };
      if (opts.json) {
        console.log(JSON.stringify(masked, null, 2));
        process.exit(0);
      }
      console.log(chalk.bold.cyan("\n⚙️  STALI CONFIG\n"));
      console.log(JSON.stringify(masked, null, 2));
      console.log("");
      process.exit(0);
    });

  const configSetCmd = configCmd
    .command("set")
    .description("Cập nhật giá trị trong ~/.stali/config.json");

  configSetCmd
    .command("base-url [url]")
    .description("Đặt hoặc reset API base URL")
    .option("--reset", "Reset về URL mặc định (https://api.stali.vn/v1)")
    .action(async (url: string | undefined, opts: { reset?: boolean }) => {
      try {
        if (opts.reset) {
          const cfg = await setStaliBaseUrl(null);
          console.log(chalk.green(`\n✅ Đã reset base URL về mặc định: ${cfg.baseUrl}\n`));
          process.exit(0);
        }
        if (!url?.trim()) {
          console.error(chalk.red("❌ Thiếu URL. Dùng: stali config set base-url <url> hoặc --reset"));
          process.exit(1);
        }
        const cfg = await setStaliBaseUrl(url);
        console.log(chalk.green(`\n✅ Đã lưu base URL: ${cfg.baseUrl}\n`));
        process.exit(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n❌ ${message}\n`));
        process.exit(1);
      }
    });

  program
    .command("backups")
    .description("Liệt kê file backup .bak của tool")
    .option("-t, --tool <toolId>", "Chỉ một tool")
    .action(async (opts: { tool?: string }) => {
      await runBackupsList(opts.tool);
      process.exit(0);
    });

  program
    .command("info")
    .description("Thông tin cài đặt stali-cli, auth và doctor tóm tắt")
    .option("--json", "Xuất JSON")
    .option("--offline", "Không gọi mạng (nhanh; mặc định với --json)")
    .option("--online", "Validate auth + kiểm tra npm (chậm hơn)")
    .action(async (opts: { json?: boolean; offline?: boolean; online?: boolean }) => {
      const { gatherCliInfo } = await import("../services/cli-info");
      const offline = opts.offline ?? (opts.json && !opts.online);
      const info = await gatherCliInfo({
        offline,
        validateAuth: opts.online || (!offline && !opts.json),
        checkNpm: opts.online || (!offline && !opts.json),
        skipPluginScan: true,
        skipBunVersion: offline,
      });
      if (opts.json) {
        console.log(JSON.stringify(info, null, 2));
        process.exit(0);
      }
      console.log(chalk.bold.cyan("\n📋 STALI CLI INFO\n"));
      console.log(`${chalk.white("Version")}     ${info.version}`);
      console.log(`${chalk.white("Platform")}    ${info.platform}`);
      console.log(
        `${chalk.white("Install")}     ${info.installMode}${info.installVersion ? chalk.gray(` (${info.installVersion})`) : ""}`
      );
      if (info.bunVersion) console.log(`${chalk.white("Bun")}         ${info.bunVersion}`);
      const ver = info.npm ?? (await fetchLatestVersion());
      if (ver.updateAvailable) {
        console.log(
          `${chalk.white("npm")}         ${chalk.yellow(`${ver.current} → ${ver.latest}`)} ${chalk.gray("(npm i -g stali-cli@latest)")}`
        );
      } else if (ver.source !== "error" && ver.source !== "unavailable" && ver.source !== "npm-error") {
        console.log(`${chalk.white("npm")}         ${chalk.green("đã mới nhất")} (${ver.latest})`);
      }
      console.log(`${chalk.white("Home")}        ${info.staliHome}`);
      console.log(`${chalk.white("CLI")}         ${info.cliInstallDir}`);
      console.log(`${chalk.white("Bin")}         ${info.binDir}`);
      console.log(`${chalk.white("Config")}      ${info.configPath}${info.configExists ? "" : chalk.gray(" (chưa có)")}`);
      const authLine = info.auth.hasKey
        ? info.auth.valid
          ? chalk.green(`✓ ${info.auth.masked}`)
          : chalk.yellow(`○ ${info.auth.masked} (không hợp lệ)`)
        : chalk.gray("○ chưa đăng nhập");
      console.log(`${chalk.white("Auth")}        ${authLine}`);
      console.log(
        `${chalk.white("Doctor")}      ${chalk.green(info.doctor.configured)}/${info.doctor.total} tool trỏ Stali`
      );
      const gw = info.gateway;
      const gwLine =
        gw.installed === 0
          ? chalk.gray("không phát hiện app AI")
          : `${chalk.green(gw.configured)}/${gw.installed} đã gateway` +
            (gw.pending > 0
              ? chalk.yellow(` · ${gw.pending} chờ cài (stali gateway install)`)
              : "");
      console.log(`${chalk.white("Gateway")}     ${gwLine}`);
      if (gw.tools.length > 0 && gw.tools.length <= 6) {
        for (const t of gw.tools) {
          const mark = t.configured ? chalk.green("✓") : chalk.yellow("○");
          console.log(`  ${mark} ${t.name} ${chalk.gray(`(${t.signals})`)}`);
        }
      } else if (gw.tools.length > 6) {
        console.log(
          chalk.gray(`  ${gw.tools.map((t) => t.name).join(", ")}`)
        );
      }
      if (info.plugins.total > 0) {
        console.log(
          `${chalk.white("Plugins")}     ${chalk.magenta(`${info.plugins.configured}/${info.plugins.total} trỏ Stali`)}`
        );
      }
      console.log("");
      process.exit(0);
    });

  const authCmd = program
    .command("auth")
    .description("Quản lý API key Stali (~/.stali/config.json)");

  authCmd
    .command("login")
    .description("Validate và lưu API key")
    .option("-k, --key <token>", "Stali API key (sk-stali-...)")
    .action(async (opts: { key?: string }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = opts.key || globals.key;
      if (!apiKey?.trim()) {
        console.error(chalk.red("❌ Thiếu API key. Dùng: stali auth login -k sk-stali-..."));
        console.log(chalk.cyan(`\nTạo key: ${STALI_DASHBOARD_KEYS_URL}\n`));
        process.exit(1);
      }
      const result = await authLogin(apiKey);
      if (result.success) {
        console.log(chalk.green(`\n✅ ${result.message}`));
        if (result.defaultModel) {
          console.log(chalk.gray(`   Model mặc định API: ${result.defaultModel}\n`));
        }
        process.exit(0);
      }
      console.error(chalk.red(`\n❌ ${result.message}\n`));
      process.exit(1);
    });

  authCmd
    .command("status")
    .description("Kiểm tra token đã lưu")
    .option("--json", "Xuất JSON")
    .action(async (opts: { json?: boolean }) => {
      const status = await authStatus();
      if (opts.json) {
        console.log(JSON.stringify(status, null, 2));
        process.exit(status.hasKey && status.valid !== false ? 0 : 1);
      }
      console.log(chalk.bold.cyan("\n🔑 STALI AUTH STATUS\n"));
      if (status.corrupt) {
        console.log(chalk.red("❌ ~/.stali/config.json bị lỗi định dạng"));
        process.exit(1);
      }
      if (!status.hasKey) {
        console.log(chalk.yellow("○ Chưa lưu API key"));
        console.log(chalk.cyan(`\nTạo key: ${STALI_DASHBOARD_KEYS_URL}`));
        console.log(chalk.gray("Lưu: stali auth login -k sk-stali-...\n"));
        process.exit(1);
      }
      const valid = status.valid ? chalk.green("hợp lệ") : chalk.red("không hợp lệ");
      console.log(`Token: ${chalk.yellow(status.masked)} — ${valid}`);
      if (status.lastUpdated) console.log(chalk.gray(`Cập nhật: ${status.lastUpdated}`));
      if (status.error) console.log(chalk.red(`Lỗi: ${status.error}`));
      console.log("");
      process.exit(status.valid ? 0 : 1);
    });

  authCmd
    .command("logout")
    .description("Xóa token đã lưu")
    .action(async () => {
      const ok = await authLogout();
      if (ok) {
        console.log(chalk.green("\n✅ Đã xóa token ~/.stali/config.json\n"));
        process.exit(0);
      }
      console.log(chalk.yellow("\n○ Không có config để xóa\n"));
      process.exit(0);
    });

  program
    .command("open [target]")
    .description("Mở trình duyệt: keys | docs")
    .action(async (target?: string) => {
      const t = (target || "keys").toLowerCase();
      const url =
        t === "docs" || t === "doc"
          ? STALI_DOCS_URL
          : STALI_DASHBOARD_KEYS_URL;
      const opened = openUrlInBrowser(url);
      if (opened.ok) {
        console.log(chalk.green(`\n✅ Đã mở: ${url}\n`));
        process.exit(0);
      }
      console.log(chalk.yellow(`\n⚠️  Không mở được trình duyệt — truy cập thủ công:`));
      console.log(chalk.cyan(`   ${url}\n`));
      process.exit(1);
    });

  program
    .command("guide <app>")
    .description("Hướng dẫn gắn Stali cho app không patch file (cursor, chatbox, n8n)")
    .action((app: string) => {
      const text = renderAppGuide(app);
      if (!text) {
        console.error(chalk.red(`❌ Không có guide cho: ${app}`));
        console.log(chalk.gray(`Có sẵn: ${listGuideIds().join(", ")}\n`));
        process.exit(1);
      }
      console.log(text);
      process.exit(0);
    });

  program
    .command("paths")
    .description("Hiển thị thư mục ~/.stali (cli, bin, config)")
    .action(async () => {
      await runPaths();
      process.exit(0);
    });

  program
    .command("tools")
    .description("Liệt kê 13 công cụ AI và file config tương ứng")
    .action(async () => {
      await runToolsList();
      process.exit(0);
    });

  program
    .command("export-env <tool>")
    .description("In biến môi trường / snippet cấu hình để copy thủ công")
    .option("-m, --model <model>", "Model Stali")
    .option(
      "-f, --format <format>",
      "Định dạng: shell | dotenv | json | powershell",
      "shell"
    )
    .action(async (tool: string, opts: { model?: string; format?: string }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = await resolveApiKey(globals.key);
      if (!apiKey) {
        console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua wizard."));
        process.exit(1);
      }
      const toolId = resolveToolId(tool);
      const toolDef = getToolById(toolId);
      if (!toolDef) {
        console.error(chalk.red(`❌ Tool không hợp lệ: ${tool}`));
        process.exit(1);
      }
      const fmt = (opts.format || "shell") as "shell" | "dotenv" | "json" | "powershell";
      if (!["shell", "dotenv", "json", "powershell"].includes(fmt)) {
        console.error(chalk.red(`❌ Format không hợp lệ: ${fmt}`));
        process.exit(1);
      }
      const model = opts.model || toolDef.defaultModel;
      const cfg = await loadStaliConfig();
      const { renderEnvExport } = await import("../services/export-env");
      console.log(renderEnvExport(toolId, apiKey, model, fmt, cfg?.baseUrl));
      process.exit(0);
    });

  program
    .command("doctor")
    .description("Kiểm tra công cụ nào đã trỏ Stali API")
    .option("--json", "Xuất JSON (cho script/automation)")
    .option("--fix", "Tự cấu hình lại tool chưa trỏ Stali")
    .option("--dry-run", "Với --fix: chỉ liệt kê, không ghi file")
    .option("--force", "Với --fix: cấu hình lại cả tool đã OK")
    .option("--installed-only", "Với --fix: chỉ app đã phát hiện trên máy (binary/config/VS Code)")
    .option("--tools <list>", "Với --fix: chỉ các tool (cách nhau bởi dấu phẩy)")
    .option("--ids <list>", "Với --plugins-only --fix: chỉ các plugin id (cách nhau bởi dấu phẩy)")
    .option("-m, --model <model>", "Với --fix: model áp dụng")
    .option("--plugins-only", "Chỉ kiểm tra plugin (~/.stali/plugins.json)")
    .option("--tools-only", "Chỉ kiểm tra 13 tool (bỏ qua plugin)")
    .option("--watch", "Theo dõi liên tục (Ctrl+C thoát)")
    .option("--notify", "Với --watch: chuông + desktop notify khi thay đổi")
    .option("--prometheus", "Xuất metrics Prometheus text (one-shot hoặc --watch)")
    .option("--metrics-port <port>", "Với --watch: HTTP /metrics (mặc định bind 127.0.0.1)")
    .option("--metrics-bind <host>", "Bind address cho --metrics-port", "127.0.0.1")
    .option("-i, --interval <seconds>", "Với --watch: chu kỳ giây (mặc định 10)", "10")
    .option("--max-cycles <n>", "Với --watch: số lần quét rồi thoát (CI)")
    .option("--duration <seconds>", "Với --watch: chạy tối đa N giây rồi thoát (CI)")
    .action(async (opts: {
      json?: boolean;
      fix?: boolean;
      dryRun?: boolean;
      force?: boolean;
      installedOnly?: boolean;
      tools?: string;
      ids?: string;
      model?: string;
      watch?: boolean;
      notify?: boolean;
      prometheus?: boolean;
      metricsPort?: string;
      metricsBind?: string;
      interval?: string;
      maxCycles?: string;
      duration?: string;
      pluginsOnly?: boolean;
      toolsOnly?: boolean;
    }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = await resolveApiKey(globals.key);
      const { runDoctor, runDoctorWatch } = await import("./doctor");
      if (opts.pluginsOnly && opts.toolsOnly) {
        console.error(chalk.red("❌ --plugins-only và --tools-only không dùng cùng lúc"));
        process.exit(1);
      }
      const view = {
        pluginsOnly: opts.pluginsOnly,
        toolsOnly: opts.toolsOnly,
      };
      if (opts.watch && !opts.fix) {
        const sec = parseInt(opts.interval || "10", 10) || 10;
        const maxCycles = opts.maxCycles ? parseInt(opts.maxCycles, 10) : undefined;
        const durationSec = opts.duration ? parseInt(opts.duration, 10) : undefined;
        if (maxCycles !== undefined && (!Number.isFinite(maxCycles) || maxCycles < 1)) {
          console.error(chalk.red("❌ --max-cycles phải là số nguyên ≥ 1"));
          process.exit(2);
        }
        if (durationSec !== undefined && (!Number.isFinite(durationSec) || durationSec < 1)) {
          console.error(chalk.red("❌ --duration phải là số giây ≥ 1"));
          process.exit(2);
        }
        const metricsPort = opts.metricsPort ? parseInt(opts.metricsPort, 10) : undefined;
        if (metricsPort !== undefined && (!Number.isFinite(metricsPort) || metricsPort < 1 || metricsPort > 65535)) {
          console.error(chalk.red("❌ --metrics-port phải là 1–65535"));
          process.exit(2);
        }
        if (metricsPort && !opts.watch) {
          console.error(chalk.red("❌ --metrics-port chỉ dùng với --watch"));
          process.exit(2);
        }
        const metricsBind = opts.metricsBind || "127.0.0.1";
        await runDoctorWatch(sec, opts.json, opts.notify, view, {
          maxCycles,
          durationSec,
        }, opts.prometheus, metricsPort, metricsBind);
        return;
      }
      const code = await runDoctor(opts.json, {
        apiKey,
        fix: opts.fix,
        dryRun: opts.dryRun,
        force: opts.force,
        tools: opts.tools,
        installedOnly: opts.installedOnly,
        ids: opts.ids,
        model: opts.model,
      }, view, opts.prometheus);
      process.exit(code);
    });

  program
    .command("gateway")
    .alias("gw")
    .description("Quét app AI đang dùng và cài Stali gateway (base URL + API key)")
    .argument("[action]", "scan | plan | auto | install (mặc định: auto nếu đã có key)")
    .option("--json", "JSON output (scan | plan | install)")
    .option("--dry-run", "Với install: preview, không ghi file")
    .option("--all", "Cài gateway cho cả 13 tool (bỏ qua quét)")
    .option("--force", "Cài lại cả tool đã trỏ Stali")
    .option("-m, --model <model>", "Model áp dụng khi install")
    .option("--continue-on-error", "Tiếp tục khi một tool lỗi")
    .option("--include-plugins", "Đồng bộ plugin khi install")
    .option("--no-plugins", "Bỏ qua plugin khi install")
    .option("-y, --yes", "Không in banner kế hoạch — chạy ngay (CI/script)")
    .action(async (action: string | undefined, opts: {
      json?: boolean;
      dryRun?: boolean;
      all?: boolean;
      force?: boolean;
      model?: string;
      continueOnError?: boolean;
      includePlugins?: boolean;
      noPlugins?: boolean;
      yes?: boolean;
    }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = await resolveApiKey(globals.key);
      const { runGatewayCommand } = await import("./gateway-cmd");
      await runGatewayCommand(action, opts, apiKey);
    });

  program
    .command("install")
    .description("Hướng dẫn hoặc thực hiện cài đặt stali-cli")
    .option("--npm", "Cài qua npm global (Node >= 18)")
    .option("--standalone", "Cài binary từ GitHub Release")
    .option("--git", "Cài từ GitHub source + build")
    .option("--channel <name>", "Kênh npm: stable | beta", "stable")
    .option("--version <ver>", "Phiên bản (vd. 3.13.0 hoặc latest)")
    .option("--dry-run", "Chỉ in lệnh, không thực hiện")
    .option("--json", "JSON install plan")
    .action(async (opts: {
      npm?: boolean;
      standalone?: boolean;
      git?: boolean;
      channel?: string;
      version?: string;
      dryRun?: boolean;
      json?: boolean;
    }) => {
      const { runInstallCli } = await import("../services/install-cli");
      const code = await runInstallCli(opts);
      process.exit(code);
    });

  program
    .command("bench")
    .description("Benchmark cold-start các lệnh CLI (median ms)")
    .option("--json", "Xuất JSON")
    .option("--runs <n>", "Số lần chạy mỗi case", "5")
    .option("--strict", "Fail nếu vượt ngưỡng STALI_BENCH_MAX_*_MS")
    .action(async (opts: { json?: boolean; runs?: string; strict?: boolean }) => {
      const { runColdStartBench, formatBenchReport } = await import("../services/bench-cli");
      const runs = Number(opts.runs || 5);
      const report = runColdStartBench({ runs, strict: opts.strict });
      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatBenchReport(report));
      }
      process.exit(report.failed ? 1 : 0);
    });

  const telemetryCmd = program
    .command("telemetry")
    .description("Telemetry ẩn danh opt-in (command + version, không gửi API key)");

  telemetryCmd
    .command("status")
    .description("Trạng thái telemetry")
    .option("--json", "JSON output")
    .action(async (opts: { json?: boolean }) => {
      const { readTelemetryConfig, fetchTelemetryEndpointHealth, readTelemetryQueueDepth } =
        await import("../services/telemetry");
      const cfg = await readTelemetryConfig();
      const endpoint = await fetchTelemetryEndpointHealth();
      const queueDepth = await readTelemetryQueueDepth();
      if (opts.json) {
        console.log(JSON.stringify({ ...cfg, endpoint, queueDepth }, null, 2));
        process.exit(0);
      }
      console.log(chalk.bold.cyan("\n📡 STALI TELEMETRY\n"));
      console.log(
        `Trạng thái: ${cfg.enabled ? chalk.green("bật") : chalk.gray("tắt (mặc định)")}`
      );
      if (cfg.consentAt) console.log(`Đồng ý lúc: ${cfg.consentAt}`);
      console.log(
        `Endpoint:    ${endpoint.ok ? chalk.green("sẵn sàng") : chalk.yellow("không phản hồi")}${
          endpoint.status ? chalk.gray(` (HTTP ${endpoint.status})`) : ""
        }`
      );
      if (queueDepth > 0) {
        console.log(`Hàng đợi:    ${chalk.yellow(String(queueDepth))} event chờ gửi lại`);
      }
      console.log(chalk.gray("\nChỉ gửi: tên lệnh, phiên bản CLI, platform. Không gửi API key.\n"));
      process.exit(0);
    });

  telemetryCmd
    .command("flush")
    .description("Gửi lại event telemetry trong hàng đợi")
    .option("--json", "JSON output")
    .action(async (opts: { json?: boolean }) => {
      const { flushTelemetryQueue, readTelemetryQueueDepth } = await import("../services/telemetry");
      const before = await readTelemetryQueueDepth();
      const result = await flushTelemetryQueue();
      const after = await readTelemetryQueueDepth();
      if (opts.json) {
        console.log(JSON.stringify({ before, ...result, after }, null, 2));
        process.exit(after === 0 ? 0 : 1);
      }
      console.log(chalk.bold.cyan("\n📡 TELEMETRY FLUSH\n"));
      console.log(`Đã gửi: ${chalk.green(String(result.sent))} · còn lại: ${after}`);
      process.exit(after === 0 ? 0 : 1);
    });

  telemetryCmd
    .command("on")
    .description("Bật telemetry ẩn danh")
    .action(async () => {
      const { setTelemetryEnabled } = await import("../services/telemetry");
      await setTelemetryEnabled(true);
      console.log(chalk.green("✅ Đã bật telemetry (opt-in). Tắt: stali telemetry off\n"));
      process.exit(0);
    });

  telemetryCmd
    .command("off")
    .description("Tắt telemetry")
    .action(async () => {
      const { setTelemetryEnabled } = await import("../services/telemetry");
      await setTelemetryEnabled(false);
      console.log(chalk.green("✅ Đã tắt telemetry.\n"));
      process.exit(0);
    });

  program
    .command("update")
    .description("Cập nhật stali-cli (npm global / git / standalone)")
    .option("--check", "Chỉ kiểm tra phiên bản mới (không cập nhật)")
    .option("--json", "JSON output (với --check hoặc --dry-run)")
    .option("--channel <name>", "Kênh cập nhật: stable | beta", "stable")
    .option("--install-cron", "Cài cron 04:00 tự update (Linux/macOS; Windows → Task Scheduler)")
    .option("--uninstall-cron", "Gỡ cron / Task Scheduler auto-update")
    .option("--cron-status", "Trạng thái auto-update (cron / systemd / Task Scheduler)")
    .option("--install-systemd", "Cài systemd user timer 04:00 (Linux)")
    .option("--uninstall-systemd", "Gỡ systemd user timer")
    .option("--install-launchd", "Cài macOS LaunchAgent 04:00")
    .option("--uninstall-launchd", "Gỡ macOS LaunchAgent auto-update")
    .option("--install-task", "Cài Windows Task Scheduler 04:00 (alias cron trên Windows)")
    .option("--uninstall-task", "Gỡ Windows Task Scheduler auto-update")
    .option("--dry-run", "Chỉ xem kế hoạch update (không thực hiện)")
    .action(async (opts: {
      check?: boolean;
      channel?: string;
      installCron?: boolean;
      uninstallCron?: boolean;
      cronStatus?: boolean;
      installSystemd?: boolean;
      uninstallSystemd?: boolean;
      installLaunchd?: boolean;
      uninstallLaunchd?: boolean;
      installTask?: boolean;
      uninstallTask?: boolean;
      dryRun?: boolean;
      json?: boolean;
    }) => {
      if (opts.cronStatus) {
        const {
          getAutoUpdateCronStatus,
          readAutoUpdateConfig,
          getSystemdTimerStatus,
          getTaskSchedulerStatus,
          getLaunchdStatus,
        } = await import("../services/auto-update");
        const status = getAutoUpdateCronStatus();
        const systemd = getSystemdTimerStatus();
        const task = getTaskSchedulerStatus();
        const launchd = getLaunchdStatus();
        const cfg = await readAutoUpdateConfig();
        console.log(chalk.bold.cyan("\n⏰ STALI AUTO-UPDATE\n"));
        if (process.platform === "win32") {
          console.log(
            `Task:      ${task.installed ? chalk.green("đã cài") : chalk.gray("chưa cài")} (${task.taskName})`
          );
        } else if (process.platform === "darwin") {
          console.log(
            `Launchd:   ${launchd.installed ? chalk.green("đã cài") : chalk.gray("chưa cài")} (${launchd.label})`
          );
        } else {
          console.log(`Cron:      ${status.installed ? chalk.green("đã cài") : chalk.gray("chưa cài")}`);
          if (status.line) console.log(chalk.gray(`  ${status.line}`));
          console.log(
            `Systemd:   ${systemd.installed ? chalk.green("đã cài") : chalk.gray("chưa cài")} (${systemd.unitDir})`
          );
        }
        console.log(`Log:       ${status.logPath}`);
        if (cfg) console.log(`Config:    channel=${cfg.channel || "stable"} enabled=${cfg.enabled}`);
        console.log("");
        process.exit(0);
      }
      if (opts.installLaunchd) {
        const { installAutoUpdateLaunchd } = await import("../services/auto-update");
        const r = await installAutoUpdateLaunchd(opts.channel);
        console.log(r.ok ? chalk.green(`✅ ${r.message}`) : chalk.red(`❌ ${r.message}`));
        if (r.error) console.error(chalk.red(r.error));
        process.exit(r.ok ? 0 : 1);
      }
      if (opts.uninstallLaunchd) {
        const { uninstallAutoUpdateLaunchd } = await import("../services/auto-update");
        const r = await uninstallAutoUpdateLaunchd();
        console.log(chalk.green(`✅ ${r.message}`));
        process.exit(0);
      }
      if (opts.installTask) {
        const { installAutoUpdateTaskScheduler } = await import("../services/auto-update");
        const r = await installAutoUpdateTaskScheduler(opts.channel);
        console.log(r.ok ? chalk.green(`✅ ${r.message}`) : chalk.red(`❌ ${r.message}`));
        if (r.error) console.error(chalk.red(r.error));
        process.exit(r.ok ? 0 : 1);
      }
      if (opts.uninstallTask) {
        const { uninstallAutoUpdateTaskScheduler } = await import("../services/auto-update");
        const r = await uninstallAutoUpdateTaskScheduler();
        console.log(chalk.green(`✅ ${r.message}`));
        process.exit(0);
      }
      if (opts.installSystemd) {
        const { installAutoUpdateSystemd } = await import("../services/auto-update");
        const r = await installAutoUpdateSystemd(opts.channel);
        console.log(r.ok ? chalk.green(`✅ ${r.message}`) : chalk.red(`❌ ${r.message}`));
        if (r.error) console.error(chalk.red(r.error));
        process.exit(r.ok ? 0 : 1);
      }
      if (opts.uninstallSystemd) {
        const { uninstallAutoUpdateSystemd } = await import("../services/auto-update");
        const r = await uninstallAutoUpdateSystemd();
        console.log(chalk.green(`✅ ${r.message}`));
        process.exit(0);
      }
      if (opts.installCron) {
        const { installAutoUpdateCron } = await import("../services/auto-update");
        const r = await installAutoUpdateCron(opts.channel);
        console.log(r.ok ? chalk.green(`✅ ${r.message}`) : chalk.red(`❌ ${r.message}`));
        if (r.error) console.error(chalk.red(r.error));
        process.exit(r.ok ? 0 : 1);
      }
      if (opts.uninstallCron) {
        const { uninstallAutoUpdateCron } = await import("../services/auto-update");
        const r = await uninstallAutoUpdateCron();
        console.log(chalk.green(`✅ ${r.message}`));
        process.exit(0);
      }
      const channelCfg = await resolveUpdateChannelResolved(opts.channel);
      if (opts.check) {
        const { detectInstallMode } = await import("../services/install-mode");
        const installInfo = await detectInstallMode();
        const useNpm =
          installInfo.mode === "npm-global" ||
          opts.channel === "beta";
        let ver;
        if (useNpm) {
          const { fetchNpmVersionForChannel } = await import("../services/version-check");
          ver = await fetchNpmVersionForChannel(opts.channel || "stable");
        } else {
          ver = await fetchLatestVersion(channelCfg.versionUrl);
        }
        if (opts.json) {
          console.log(
            JSON.stringify(
              {
                channel: channelCfg.label,
                ref: channelCfg.releaseTag || channelCfg.branch,
                installMode: installInfo.mode,
                installVersion: installInfo.version ?? null,
                current: ver.current,
                latest: ver.latest,
                updateAvailable: ver.updateAvailable,
                versionSource: ver.source,
              },
              null,
              2
            )
          );
          process.exit(ver.updateAvailable ? 1 : 0);
        }
        console.log(chalk.bold.cyan("\n⬆️  STALI CLI VERSION CHECK\n"));
        const refLabel = channelCfg.releaseTag || channelCfg.branch;
        console.log(`Kênh:      ${chalk.white(channelCfg.label)} (${refLabel})`);
        console.log(`Cài đặt:   ${chalk.white(installInfo.mode)}${installInfo.version ? chalk.gray(` (${installInfo.version})`) : ""}`);
        console.log(`Hiện tại: ${chalk.white(ver.current)}`);
        console.log(`Mới nhất:  ${chalk.white(ver.latest)}`);
        if (ver.updateAvailable) {
          console.log(chalk.yellow(`\n${t("update_available")}\n`));
          process.exit(1);
        }
        console.log(chalk.green(`\n${t("update_latest")}\n`));
        process.exit(0);
      }
      if (opts.dryRun && opts.json) {
        const { planSelfUpdate } = await import("../services/self-update");
        const plan = await planSelfUpdate({ channel: opts.channel });
        console.log(JSON.stringify({ dryRun: true, channel: channelCfg.label, plan }, null, 2));
        process.exit(0);
      }
      console.log(
        opts.dryRun
          ? chalk.cyan(`\n🔍 Kế hoạch cập nhật stali-cli (${channelCfg.label})…\n`)
          : chalk.cyan(`\n⬇️  Đang cập nhật stali-cli (${channelCfg.label})…\n`)
      );
      const { selfUpdate } = await import("../services/self-update");
      const result = await selfUpdate({ channel: opts.channel, dryRun: opts.dryRun });
      if (result.success) {
        console.log(chalk.green(`✅ ${result.message}`));
        console.log(chalk.gray(`   Chạy lại: stali --version\n`));
        process.exit(0);
      }
      console.error(chalk.red(`❌ ${result.message}`));
      if (result.error) console.error(chalk.red(`   ${result.error}`));
      process.exit(1);
    });

  program
    .command("configure <tool>")
    .description("Cấu hình non-interactive cho một công cụ AI")
    .option("-m, --model <model>", "Model Stali API")
    .option("--dry-run", "Xem preview config, không ghi file")
    .action(async (tool: string, opts: { model?: string; dryRun?: boolean }) => {
      const globals = program.opts<{ key?: string }>();
      const apiKey = await resolveApiKey(globals.key);
      if (!apiKey) {
        console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua wizard trước."));
        process.exit(1);
      }
      const { runConfigure } = await import("./configure-cmd");
      await runConfigure(tool, apiKey, opts.model, opts.dryRun);
    });

  program
    .command("configure-all")
    .description("Cấu hình hàng loạt nhiều công cụ AI (mặc định 11 tool, bỏ claude/codex)")
    .option("-m, --model <model>", "Model áp dụng cho tất cả tool (mặc định: theo protocol từng tool)")
    .option("--tools <list>", "Danh sách tool cách nhau bởi dấu phẩy (vd: openclaw,cline,codex)")
    .option("--dry-run", "Xem preview, không ghi file")
    .option("--continue-on-error", "Tiếp tục khi một tool lỗi")
    .option("--skip-advanced", "Bỏ qua claude/codex (mặc định bật khi không chỉ định --tools)")
    .option("--installed-only", "Chỉ app đã phát hiện trên máy (binary/config/VS Code)")
    .option("--include-plugins", "Đồng bộ plugin (mặc định: bật nếu plugins.json có entry)")
    .option("--no-plugins", "Bỏ qua plugin")
    .action(
      async (opts: {
        model?: string;
        tools?: string;
        dryRun?: boolean;
        continueOnError?: boolean;
        skipAdvanced?: boolean;
        installedOnly?: boolean;
        includePlugins?: boolean;
        noPlugins?: boolean;
      }) => {
        const globals = program.opts<{ key?: string }>();
        const apiKey = await resolveApiKey(globals.key);
        if (!apiKey) {
          console.error(chalk.red("❌ Thiếu API key. Dùng -k hoặc lưu token qua wizard trước."));
          process.exit(1);
        }

        const toolInputs = opts.tools
          ? opts.tools.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined;
        const skipAdvanced = toolInputs ? false : opts.skipAdvanced !== false;
        const cfg = await loadStaliConfig();
        const includePlugins = await resolveIncludePluginsFromHome({
          includePlugins: opts.includePlugins,
          noPlugins: opts.noPlugins,
        });

        const { runConfigureBatch } = await import("../services/configure-batch");
        const { items, allOk } = await runConfigureBatch({
          apiKey,
          model: opts.model,
          baseUrl: cfg?.baseUrl,
          toolInputs,
          dryRun: opts.dryRun,
          continueOnError: opts.continueOnError,
          skipAdvanced,
          includePlugins,
          installedOnly: opts.installedOnly,
        });

        if (opts.dryRun) {
          console.log(chalk.bold.cyan("\n🔍 Dry-run configure-all\n"));
          for (const item of items) {
            const icon = item.success ? chalk.green("✓") : chalk.red("✗");
            console.log(`${icon} ${chalk.white(item.toolName || item.toolId)} — ${item.message}`);
            if (item.preview) {
              console.log(chalk.gray(JSON.stringify(item.preview, null, 2).slice(0, 400) + "…"));
            }
          }
          console.log(chalk.gray("\n(Không ghi file — bỏ --dry-run để áp dụng)\n"));
          process.exit(allOk ? 0 : 1);
        }

        console.log(chalk.bold.cyan("\n⚙️  CONFIGURE-ALL\n"));
        let ok = 0;
        for (const item of items) {
          const icon = item.success ? chalk.green("✓") : chalk.red("✗");
          if (item.success) ok++;
          console.log(`${icon} ${chalk.white(item.toolName)} — ${item.message}`);
          if (item.configPath) console.log(chalk.gray(`   ${item.configPath}`));
        }
        console.log(
          chalk.green(`\n✅ Thành công: ${ok}/${items.length}\n`)
        );
        process.exit(allOk ? 0 : 1);
      }
    );

  program
    .command("completion")
    .description("Shell completion: in script hoặc cài vào ~/.bashrc / fish / zsh")
    .argument("[shellOrAction]", "bash | zsh | fish | install | uninstall | auto")
    .argument("[shell]", "Shell khi dùng: stali completion install <shell>")
    .option("--install", "Ghi completion vào shell config (idempotent)")
    .option("--all", "Cài completion cho bash + fish + zsh (với --install)")
    .option("--uninstall", "Gỡ completion đã cài (idempotent)")
    .option("--doctor", "Kiểm tra completion đã cài (bash/fish/zsh)")
    .option("--json", "JSON output (với --doctor)")
    .action(async (
      shellOrAction: string | undefined,
      shellArg: string | undefined,
      cmdOpts: { install?: boolean; all?: boolean; uninstall?: boolean; doctor?: boolean; json?: boolean }
    ) => {
      let shell = shellOrAction;
      let installMode = !!cmdOpts.install;
      let uninstallMode = !!cmdOpts.uninstall;
      if (shellOrAction?.toLowerCase() === "install") {
        installMode = true;
        shell = shellArg;
      } else if (shellOrAction?.toLowerCase() === "uninstall") {
        uninstallMode = true;
        shell = shellArg;
      }
      if (installMode && uninstallMode) {
        console.error(chalk.red("❌ --install và --uninstall không dùng cùng lúc"));
        process.exit(1);
      }
      if (cmdOpts.doctor) {
        const { diagnoseCompletion } = await import("../services/completion-install");
        const rows = await diagnoseCompletion(shell || "auto");
        if (cmdOpts.json) {
          console.log(JSON.stringify({ shells: rows }, null, 2));
        } else {
          console.log(chalk.bold.cyan("\n🔍 STALI COMPLETION DOCTOR\n"));
          for (const row of rows) {
            const icon =
              row.status === "ok" ? chalk.green("✓") : row.status === "stale" ? chalk.yellow("○") : chalk.red("✗");
            console.log(`${icon} ${chalk.white(row.shell)} — ${row.message}`);
            console.log(chalk.gray(`   ${row.path}`));
          }
          console.log("");
        }
        const ok = rows.every((r) => r.status === "ok" || r.status === "absent");
        process.exit(ok ? 0 : 1);
      }
      if (uninstallMode) {
        const { uninstallCompletion } = await import("../services/completion-install");
        try {
          const result = await uninstallCompletion(shell || "auto");
          console.log(`✅ ${result.message}`);
          console.log(`   ${result.shell} → ${result.path} (${result.action})`);
          process.exit(0);
        } catch (err) {
          console.error(chalk.red(`❌ ${err instanceof Error ? err.message : String(err)}`));
          process.exit(1);
        }
      }
      if (installMode) {
        const { installCompletion, installAllCompletions } = await import(
          "../services/completion-install"
        );
        try {
          if (cmdOpts.all || shell?.toLowerCase() === "all") {
            const results = await installAllCompletions();
            for (const result of results) {
              console.log(`✅ ${result.shell}: ${result.message}`);
              console.log(`   ${result.shell} → ${result.path} (${result.action})`);
            }
            process.exit(0);
          }
          const result = await installCompletion(shell || "auto");
          console.log(`✅ ${result.message}`);
          console.log(`   ${result.shell} → ${result.path} (${result.action})`);
          process.exit(0);
        } catch (err) {
          console.error(chalk.red(`❌ ${err instanceof Error ? err.message : String(err)}`));
          process.exit(1);
        }
      }
      if (!shell) {
        console.error(chalk.red("❌ Thiếu shell. Ví dụ: stali completion bash | stali completion install zsh"));
        process.exit(1);
      }
      const { renderCompletion } = await import("./completion");
      const script = renderCompletion(shell);
      if (!script) {
        console.error(chalk.red(`❌ Shell không hỗ trợ: ${shell}. Dùng: bash, zsh, fish`));
        process.exit(1);
      }
      console.log(script);
      process.exit(0);
    });

  program
    .command("uninstall")
    .description("Gỡ stali-cli (wrapper ~/.stali/bin, tùy chọn giữ config/source)")
    .option("--keep-config", "Giữ ~/.stali/config.json (API key)")
    .option("--keep-source", "Giữ ~/.stali/cli (source)")
    .option("--purge-path", "Gỡ ~/.stali/bin khỏi User PATH (Windows)")
    .action(async (opts: { keepConfig?: boolean; keepSource?: boolean; purgePath?: boolean }) => {
      console.log(chalk.bold.yellow("\n🗑️  STALI CLI — UNINSTALL\n"));
      const { runUninstall } = await import("../services/uninstall");
      const result = await runUninstall({
        keepConfig: opts.keepConfig,
        keepSource: opts.keepSource,
        purgePath: opts.purgePath,
      });
      if (result.removed.length > 0) {
        console.log(chalk.green(`✅ ${result.message}\n`));
        console.log(chalk.gray("Đã xóa:"));
        result.removed.forEach((p) => console.log(chalk.gray(`  • ${p}`)));
      } else {
        console.log(chalk.yellow(result.message));
      }
      if (result.skipped.length > 0) {
        console.log(chalk.gray("\nGiữ lại:"));
        result.skipped.forEach((p) => console.log(chalk.gray(`  • ${p}`)));
      }
      if (result.pathNote) {
        console.log(chalk.cyan(`\n💡 ${result.pathNote}\n`));
      }
      process.exit(result.success ? 0 : 1);
    });

  program
    .command("restore")
    .description("Khôi phục config từ backup gần nhất")
    .requiredOption("-t, --tool <toolId>", "ID công cụ (vd: claude, codex, openclaw)")
    .option("-b, --backup <path>", "Đường dẫn file .bak cụ thể")
    .action(async (opts: { tool: string; backup?: string }) => {
      const { runRestore } = await import("./configure-cmd");
      await runRestore(opts.tool, opts.backup);
      process.exit(0);
    });
}
