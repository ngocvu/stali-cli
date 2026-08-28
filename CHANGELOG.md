# Changelog

## [3.6.0] — 2026-08-28

### Added
- **Dual dist** — `dist/subcommand/` + `dist/wizard/` + `dist/checksums.json` (SHA256 manifest)
- **`stali completion --uninstall`** — gỡ completion bash/fish/zsh an toàn
- **`doctor --plugins-only --fix --ids`** — filter plugin khi sửa
- **`scripts/install.sh`** — pin `STALI_CLI_VERSION`, verify `STALI_CLI_SHA256` + checksums.json

### Changed
- **`doctor --watch` scoped** — hash/notify chỉ theo phạm vi tools/plugins
- **Build** — router `index.js` tách; giới hạn size riêng subcommand vs wizard

## [3.5.0] — 2026-08-28

### Added
- **`doctor --fix` scoped** — `--tools-only --fix`, `--plugins-only --fix`; full `--fix` sửa tools rồi plugins
- **`stali completion install [shell]`** — cài idempotent bash/fish/zsh (auto detect từ `$SHELL`)
- **Health Gate workflow** — PR offline gate + live `check --strict --tools-only` (dispatch)
- **Build guard** — `subcommand-cli.js` không được tham chiếu wizard/React

### Changed
- **`stali wizard`** route tới `wizard-cli` (tách graph bundle khỏi subcommand cold-start)
- **Release CI** — bỏ qua npm publish khi thiếu `NPM_TOKEN` (warning thay vì fail)
- **E2E live / CI** — thêm `check --strict --tools-only`, `doctor --fix --dry-run`

## [3.4.0] — 2026-08-28

### Added
- **Zsh completion** — đồng bộ subcommands (`wizard`, `check`, `init`, …) và cờ scoped
- **CI docs** — mẫu `check --strict --tools-only/--plugins-only` trong README
- **Tests** — `completion.test.ts`, e2e validate `scope` JSON và cờ xung đột

### Changed
- Benchmark thêm `check --plugins-only --json`

## [3.3.0] — 2026-08-28

### Added
- **`stali check --tools-only`** / **`--plugins-only`** — health check có phạm vi (đối xứng với `doctor`)
- **`stali wizard`** — subcommand rõ ràng mở wizard Ink (`stali` không tham số vẫn hoạt động)
- **Multi-entry build** — `index` + `subcommand-cli` + `wizard-cli` tách graph bundle

### Changed
- **`runHealthCheck`** — nhận object options; JSON có field `scope` (`full` | `tools` | `plugins`)

## [3.2.0] — 2026-08-28

### Added
- **`stali doctor --tools-only [--json]`** — chỉ scan 13 tool (bỏ plugin, nhanh hơn)
- **Dual-entry router** — `index.ts` tách wizard vs subcommand → subcommand không kéo React/Ink vào graph khởi động
- **`bun run analyze`** — báo cáo kích thước chunk dist

### Breaking
- **`plugins doctor --json`** — không còn chuyển tiếp; exit 2 (dùng `doctor --plugins-only --json`)

### Changed
- Build: `NODE_ENV=production` cho React prod bundle

## [3.1.0] — 2026-08-28

### Added
- **`stali doctor --plugins-only [--json]`** — chỉ quét plugin (bỏ scan 13 tool, nhanh hơn)
- **`doctor --watch --plugins-only`** — theo dõi plugin riêng

### Breaking
- **`plugins doctor`** — đã gỡ; `--json` vẫn chuyển tiếp sang `doctor --plugins-only --json`; không `--json` → exit 2

### Changed
- **Lazy-load commands** — doctor, models, configure, init, completion… tải dynamic → entry nhẹ hơn
- **Build limit** — tổng dist ≤ 1.6 MB (sau minify)

## [3.0.0] — 2026-08-28

### Breaking / Changed
- **`plugins doctor`** — chỉ còn alias mỏng → `stali doctor` (JSON legacy shape qua `toLegacyPluginsDoctorJson`)
- **Wizard Doctor** — một màn hình thống nhất tools + plugins; gỡ `PluginsDoctorView`
- **Configure-all wizard** — tự sync plugin khi `plugins.json` có entry (gỡ menu riêng 11+plugins)

### Added
- **`runPluginsDoctorAlias()`** — logic alias tập trung trong `commands/doctor.ts`
- **Build guard** — `--external react-devtools-core`, `--minify`, fail nếu còn devtools chunk; giới hạn tổng dist

### Removed
- **`react-devtools-core`** devDependency (~0.75 MB chunk không còn bundle)
- **`PluginsDoctorView.tsx`**

## [2.7.0] — 2026-08-28

### Added
- **Auto-include plugins** — `stali init` và `stali configure-all` tự bật sync plugin khi `plugins.json` có entry
- **`--no-plugins`** — tắt sync plugin trên `init` / `configure-all`
- **CI publish** — tag `v*` tự `npm publish` khi có `NPM_TOKEN`
- **E2E live** — skip an toàn khi chưa có `STALI_E2E_KEY`

### Changed
- **`plugins doctor`** — deprecated; gợi ý `stali doctor [--json]` (JSON giữ tương thích + `meta.deprecated`)
- **Wizard Plugins menu** — nhãn trỏ `stali doctor`

### Fixed
- **Typecheck** — mock `fetch` trong tests; `saveClaudeFullSettings` dùng `resolveStaliUrls` (custom baseUrl)

## [2.6.0] — 2026-08-28

### Added
- **`stali init --include-plugins`** — khởi tạo kèm đồng bộ plugin từ `~/.stali/plugins.json`
- **`stali check --strict`** — khi có plugin đã khai báo, yêu cầu cả tool lẫn plugin trỏ Stali
- **`stali doctor --json`** — payload thống nhất: `meta`, `tools`, `plugins` (gộp `plugins doctor`)
- **`stali info`** — hiển thị tóm tắt plugin khi `plugins.json` không rỗng
- **`doctor --watch --notify`** — hash thay đổi gồm cả plugin

### Changed
- **Lazy-load wizard** — Ink/React chỉ tải khi chạy `stali` (không tham số); cold-start subcommand nhẹ hơn
- **Build** — `bun build --splitting` tách chunk UI riêng
- **npm `bin`** — trỏ `./dist/index.js` (sửa cảnh báo publish)

## [2.5.0] — 2026-08-28

### Added
- **`stali configure-all --include-plugins`** — batch tool + plugin trong một lệnh
- **`stali plugins doctor [--json]`** — health check plugin tùy chỉnh + meta API
- **Wizard** — menu Plugin (sync / doctor), configure-all + plugins
- **`bun run bench`** — benchmark cold-start (`scripts/benchmark-cold-start.ts`)

### Fixed
- **`doctor --fix` / configure dry-run** — validate token format trước khi scan tool

## [2.4.0] — 2026-08-28

### Added
- **`stali config set base-url <url>`** / **`--reset`** — quản lý API endpoint từ CLI
- **`stali plugins sync`** — đồng bộ plugin tùy chỉnh (`patchStyle`, `defaultModel`)
- **`doctor --json`** — thêm `meta.baseUrl`, `modelsEndpoint`, `anthropicBaseUrl`, `openAiBaseUrl`
- **Tách `commands/`** — `register.ts`, `doctor.ts`, `configure-cmd.ts`, … (index.ts gọn)
- **Tests** — `doctor-fix.test.ts`, `plugin-sync.test.ts`
- **CI E2E live** — workflow tùy chọn với `STALI_E2E_KEY`

### Fixed
- **Doctor** nhận diện custom `baseUrl` (staging/self-hosted) qua `isStaliLikeUrl`
- **Preview dry-run** dùng `baseUrl` từ config

### Changed
- Shell completion: `config set`, `plugins sync`
- `plugins.json` schema: `patchStyle`, `defaultModel`

## [2.3.0] — 2026-08-28

### Added
- **`resolveStaliUrls()`** — `~/.stali/config.json` `baseUrl` được tôn trọng khi gọi API và patch syncer
- **Tests** — `api.test.ts`, `stali-urls.test.ts`; mở rộng `init-cli.test.ts`

### Fixed
- **`stali init`** — `success=false` khi `configure-all` thất bại một phần (trước đây vẫn báo OK)
- **`fetchRealtimeModels`** — trả lỗi cụ thể thay vì nuốt về `[]`; `stali ls` hiển thị endpoint + message

### Changed
- `auth login`, `configure-all`, `doctor --fix`, `export-env`, wizard dùng `baseUrl` từ config
- Syncer 13 tool nhận `SyncOptions.baseUrl` (staging / self-hosted)

## [2.2.0] — 2026-08-22

### Added
- **`stali init`** — khởi tạo nhanh: `auth login` + `configure-all` (11 tool) + `check` (`--skip-configure`)
- **`stali plugins [--init]`** — stub plugin tùy chỉnh qua `~/.stali/plugins.json`
- **i18n** — `--lang vi|en` hoặc `STALI_LANG` cho thông báo CLI
- **`stali doctor --watch --notify`** — chuông terminal + desktop notify khi cấu hình đổi

### Changed
- `update --check`, `check`, `init`, `plugins` dùng chuỗi i18n
- Shell completion: `init`, `plugins`, `--lang`, `--notify`

## [2.1.0] — 2026-08-22

### Added
- **`stali check [--strict]`** — health check auth + doctor (JSON, exit code)
- **`stali config show [--json]`** — xem ~/.stali/config.json (masked)
- **`stali backups [-t tool]`** — liệt kê file .bak
- **`stali doctor --watch [-i sec]`** — theo dõi cấu hình liên tục
- **`stali update --check`** — kiểm tra phiên bản mới từ GitHub
- **`stali info`** — hiển thị trạng thái update available

## [2.0.0] — 2026-08-22

### Added
- **`stali auth login|status|logout`** — quản lý API key chính thức
- **`stali info [--json]`** — version, paths, auth, doctor tóm tắt
- **`stali open keys|docs`** — mở Dashboard / docs trong trình duyệt
- **`stali guide <app>`** — hướng dẫn Cursor, Chatbox, n8n (không patch file)
- **Wizard** — menu «Mở Dashboard Keys»

### Changed
- Major version 2.0 — CLI đủ bộ lệnh vận hành production

## [1.9.0] — 2026-08-22

### Added
- **QwenDetailMenu**, **OpenAiJsonDetailMenu** — hoàn thiện **13/13 menu wizard riêng**
- **ConfigureAllMenu** — cấu hình hàng loạt từ wizard (11/13 tool, dry-run)
- **`stali uninstall --purge-path`** — gỡ `~/.stali/bin` khỏi User PATH (Windows)
- **npm publishConfig** — sẵn sàng `npm publish`

## [1.8.0] — 2026-08-22

### Added
- **OpenAiTomlDetailMenu** — wizard riêng cho DeepSeek TUI, Grok Build, jcode
- **OpenCodeDetailMenu** — wizard riêng cho OpenCode
- **`stali uninstall`** — gỡ wrapper CLI (`--keep-config`, `--keep-source`)
- **Wizard doctor fix** — menu «Sửa tất cả tool chưa OK» + nút fix trong DoctorView

## [1.7.0] — 2026-08-22

### Added
- **VsCodeAgentDetailMenu** — wizard riêng cho Cline, Roo Code, Kilo Code
- **`stali export-env <tool>`** — xuất biến môi trường (shell/dotenv/json/powershell)
- **`stali doctor --fix`** — tự cấu hình lại tool chưa trỏ Stali (`--dry-run`, `--force`, `--tools`)

## [1.6.0] — 2026-08-22

### Added
- **OpenClawDetailMenu** — menu wizard riêng cho OpenClaw (status live, shortcuts model Anthropic)
- **`stali configure-all`** — cấu hình hàng loạt với `--tools`, `--dry-run`, `--continue-on-error`, `--skip-advanced`
- **`stali completion bash|zsh|fish`** — shell completion cho subcommand và 13 tool id

### Changed
- Wizard: OpenClaw dùng menu chuyên biệt thay generic menu
- Docs / connect-catalog: bổ sung lệnh mới vào cheatsheet

## [1.5.0] — 2026-08-22

### Added
- Alias configure (`claude-code`, `vscode-cline`, `deepseek`, …)
- Model shortcuts theo protocol trong wizard generic
- `stali doctor --json`
- Menu wizard **Cập nhật CLI**

## [1.4.0] — 2026-08-22

### Added
- `stali update` (self-update từ GitHub)
- `stali configure --dry-run`
- DoctorView endpoint trong wizard
- Windows PATH persistence (`~/.stali/bin`)

## [1.3.0] — 2026-08-22

### Added
- Layout `~/.stali` (cli, bin, config)
- `stali paths`
- Install scripts cập nhật (Windows/macOS/Linux)

## [1.2.0] — 2026-08-22

### Added
- Doctor schema-aware cho 13 tool
- `stali tools`, preview/dry-run
- GenericToolDetailMenu với status live
- E2E verify 13/13
