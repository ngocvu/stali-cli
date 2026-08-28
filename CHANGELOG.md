# Changelog

## [3.39.0] — 2026-08-28

### Added
- **`status --json`** — `gateway.pendingGateway[]`, `pendingGatewayCount`; human hiện tên app gateway chờ
- **`doctor --strict`** — exit 1 khi còn app/plugin chưa trỏ Stali hoặc `pendingGateway` (CI gate; `--watch` tôn trọng strict khi kết thúc)
- **Wizard gateway plan** — preview inline (`GatewayPlanView`) trước khi cài, không nhảy thẳng sang màn done

### Changed
- Shell completion: `doctor --strict` (bash/zsh/fish)
- README: luồng plugin suggest/preview, doctor strict, status pendingGateway

## [3.38.0] — 2026-08-28

### Added
- **`doctor` human** — section `Gateway chờ` (app đã cài, chưa trỏ Stali) + gợi ý `stali gw auto`
- **Wizard plugins** — Preview sync (xác nhận trước khi ghi), Gợi ý patchStyle, Doctor hiện pending gateway + Gateway auto
- **Release CI** — `scripts/e2e-standalone-smoke.ts` chạy trên mỗi standalone artifact (matrix)

### Changed
- Wizard doctor dùng `buildDoctorJsonOutput` (đồng bộ JSON v2 / `pendingGateway`)

## [3.37.3] — 2026-08-28

### Fixed
- Windows CI: timeout doctor tests 30s; `paths` test cô lập `STALI_HOME` (tránh leak từ test khác)

## [3.37.2] — 2026-08-28

### Fixed
- **Bench trên Windows** — bỏ `wizard spawn` mặc định trên `win32`; `STALI_BENCH_FAST=1` cho CI; e2e bench timeout 60s

## [3.37.1] — 2026-08-28

### Fixed
- Windows CI: test `STALI_HOME` dùng `os.tmpdir()`; ngưỡng `gatherCliInfo` offline phù hợp Windows runner

## [3.37.0] — 2026-08-28

### Added
- **`plugins sync --preview`** / **`--json`** — xem preview config (masked key) trước khi ghi; `--dry-run` cũng kèm preview
- **`plugins suggest`** — gợi ý `patchStyle` từ file config thực tế (`--json`)
- **`doctor --json` v2** — `pendingGateway[]`, `meta.pendingGatewayCount`, `meta.schemaVersion: 2`
- **CI Windows** — typecheck, test, build, e2e offline, bench smoke trên `windows-latest`

### Changed
- Shell completion: `plugins suggest`, `plugins sync --preview` / `--json`

## [3.36.0] — 2026-08-28

### Added
- **`doctor --json`** — field `installedTools` + `meta.installedToolsCount` (app AI đã phát hiện)
- **Plugin sync** — patch style `cowork`, preview `buildPluginConfigPreview`, sync song song
- **`bun run bench:wizard`** — đo wizard spawn (Ink cold-start proxy)
- **Shell completion** — `scan`, `config get/set`, `--all-apps` (bash/zsh/fish)

### Changed
- `plugins sync` chạy parallel khi nhiều entry
- Bench cold-start thêm case `wizard spawn`

## [3.35.0] — 2026-08-28

### Added
- **`stali scan`** — quét app AI đang dùng (alias user-first của `gateway scan`)
- **`stali config get base-url`** — xem base URL (+ `--json` với endpoints đầy đủ)
- **`scripts/e2e-live.ts`** — E2E live với `STALI_E2E_KEY` (CI optional job)

### Changed
- **`doctor --fix`** — mặc định chỉ sửa app đã phát hiện; `--all-apps` cho cả 13 tool
- **`configure-all`** — mặc định `installed-only` khi không có `--tools`; `--all-apps` bỏ qua quét
- Help user-first thêm `scan`; `stali user` gợi ý `scan` + `gw`

## [3.34.1] — 2026-08-28

### Fixed
- CI typecheck — `runDoctorScan` đảm bảo `statusCtx.urls`; mock `fetch` trong tests dùng `unknown` cast

## [3.34.0] — 2026-08-28

### Added
- **`stali help`** / **`stali help advanced`** — help user-first; advanced = toàn bộ lệnh
- **`bun run bench:setup`** — đo `durationMs` của `setup --skip-configure --json`

### Changed
- **`stali --help`** — chỉ hiện lệnh user (setup, status, doctor, gw, …); lệnh nâng cao ẩn
- `STALI_HELP_FULL=1 stali --help` — hiện đầy đủ như trước

### Fixed
- Help visibility — set `_hidden` (Commander internal) thay vì property `hidden` không có hiệu lực

## [3.33.0] — 2026-08-28

### Added
- **`stali onboard`** — alias `stali setup` (onboarding user)
- **`stali user`** — quick reference lệnh user (không admin)
- **`stali check --full`** — kiểm tra đầy đủ; mặc định `check` nhanh như `status`
- **Setup JSON** — field `nextCommand` gợi ý bước tiếp theo

### Changed
- **`stali check`** — mặc định quick/offline; `--full` cho hành vi cũ
- Bench thêm `ready --json`, `check` (quick)

## [3.32.0] — 2026-08-28

### Added
- **`stali ready`** — alias `stali status` (kiểm tra API sẵn sàng)
- **Setup `durationMs`** — hiển thị thời gian + JSON field `version`/`durationMs`
- **Bench** — thêm `status --json`, `setup --skip-configure --json` + ngưỡng perf

### Changed
- **Doctor scan cache** (TTL 4s) — setup/status/doctor không quét lại ngay sau configure
- **`--help`** — footer gợi ý luồng user
- Setup thành công gợi ý `stali status` trước `doctor`

## [3.31.0] — 2026-08-28

### Added
- **`stali status`** — trạng thái setup nhanh (auth + gateway), `--json` / `--online`

### Changed
- **Gateway configure song song** — cài nhiều app AI cùng lúc (parallel `syncTool`)
- **Setup bỏ validate API trùng** — `prefetchedValidation` từ bước auth, không GET `/v1/models` lần 2
- **Health check setup** — `toolsOnly` bỏ quét plugin khi không cần
- **Telemetry** — flush queue nền khi khởi động CLI (không chặn lệnh)
- Mô tả `--help` tập trung luồng user

## [3.30.0] — 2026-08-28

### Added
- **`stali setup --json`** — output JSON cho CI/script
- **`stali info --json`** — field `setup` (`ready`, `gatewayPending`, `nextCommand`)

### Changed
- **Setup song song** — validate API key + quét app AI đồng thời; tái dùng discovery (không quét 2–3 lần)
- **Health check sau setup** — `authLocalOnly` bỏ validate API lần 2
- README Quickstart + postinstall gợi ý `stali -k`

## [3.29.0] — 2026-08-28

### Changed
- **`stali -k sk-stali-...`** — tự chạy `setup` (không mở wizard Ink); nhanh nhất cho user mới

## [3.28.0] — 2026-08-28

### Added
- **`stali setup`** — lệnh chính cho user: auth + gateway auto + check (nhanh nhất)
- **`printSetupResult`** — hướng dẫn bước tiếp theo sau setup/init

### Changed
- **`stali init`** — mặc định `-y` gateway; gợi ý dùng `stali setup` cho luồng nhanh
- Postinstall/README tập trung user setup, bỏ tham chiếu admin telemetry

### Removed
- (api.stali.vn) Admin CLI telemetry dashboard/API — không dùng cho user

## [3.27.0] — 2026-08-28

### Added
- **`stali telemetry flush`** — gửi lại event trong `telemetry-queue.jsonl`
- **`stali init -y`** — gateway auto không banner (CI/script)
- **`stali info --json`** — field `telemetry.enabled` + `telemetry.queueDepth`

### Fixed
- **`stali init`** — dùng `runGatewayAuto` (quét + cài) thay `runGatewayInstall` trực tiếp

### Changed
- Admin SSE telemetry: push ngay khi POST (notify) + poll dự phòng 10s
- Postinstall hints: `stali gw` default auto, `telemetry on`

## [3.26.0] — 2026-08-28

### Added
- **`stali gw -y|--yes`** — chạy gateway ngay, không in banner kế hoạch (CI/script)
- **Telemetry retry + queue** — backoff 3 lần; lưu `~/.stali/telemetry-queue.jsonl`, flush lần sau
- **`telemetry status`** — hiển thị độ sâu hàng đợi
- **Admin SSE** — `/api/admin/cli-telemetry/stream` + badge Trực tiếp trên dashboard

### Changed
- Shell completion: `auto` đầu tiên, `-y/--yes`, zsh/fish đồng bộ
- `fetchWithRetry` utility cho POST telemetry

## [3.25.0] — 2026-08-28

### Added
- **Wizard first-run auto gateway** — sau login lần đầu tự chạy `gateway auto` (fallback menu nếu lỗi)
- **Bench `gateway --dry-run`** — đo default subcommand (= auto khi có `-k`)
- **Admin CSV export** — `GET /api/admin/cli-telemetry?format=csv`

### Changed
- **Telemetry GET public** — chỉ `?ping=1`; aggregate yêu cầu admin (dashboard `/admin/cli-telemetry`)
- `wizard-gateway` helper — map kết quả install cho wizard

## [3.24.0] — 2026-08-28

### Added
- **Windows IDE discovery** — `%APPDATA%\Cursor|Code|Windsurf\extensions` + `globalStorage`
- **Wizard first-run** — sau login lần đầu, tự mở gateway menu khi có app chờ cài
- **`stali gw` default `auto`** — khi đã lưu API key (không subcommand)
- **Admin CLI telemetry** — `/admin/cli-telemetry` + API aggregate từ `cli-telemetry.jsonl`

### Changed
- `buildDiscoveryScanContext` dùng `resolveIdeExtensionRoots()` (đa nền tảng)

## [3.23.0] — 2026-08-28

### Added
- **Linux discovery** — flatpak exports + snap bin (`package` signal)
- **Wizard menu** — hiển thị số app chờ gateway + gợi ý `stali gw auto`
- **Telemetry ping** — `telemetry status` dùng `?ping=1`

### Changed
- Gateway menu label động khi có app pending

## [3.22.0] — 2026-08-28

### Added
- **Windows process discovery** — PowerShell `Win32_Process.CommandLine` + WMIC fallback
- **`stali init`** — dùng `gateway auto` (quét + cài app phát hiện) thay configure-all riêng
- **Telemetry endpoint** — `POST/GET https://api.stali.vn/v1/telemetry/cli` (opt-in, JSONL aggregate)
- **`stali telemetry status`** — hiển thị trạng thái endpoint

### Changed
- Release CI: verify + normalize Windows standalone artifact trước upload
- `probeRunningProcessFromList` export cho unit test

## [3.21.0] — 2026-08-28

### Added
- **`stali gateway auto`** — quét app đang dùng và cài gateway một lệnh (`stali gw auto`)
- Discovery **process markers** (full `ps args`) + **macOS .app** (`Claude.app`, …)
- Wizard gateway: mục **Quét & cài tự động**
- Benchmark + e2e cho `gateway auto --dry-run --json`

### Changed
- `stali info` — plugin scan nhanh (đếm registry); dùng `doctor --plugins-only` cho chi tiết
- `info --online` — validate auth song song, bỏ spawn bun khi offline
- SetupDone gợi ý `stali telemetry on` (opt-in)
- Shell completion: `gateway auto`

## [3.20.0] — 2026-08-28

### Added
- **Wizard gateway submenu** — plan preview trước khi install (`GatewayMenu`)
- **`stali info --json`** — field `offline: true` khi chạy chế độ nhanh
- Benchmark case `gateway plan --json`

### Changed
- Postinstall hints: `stali gw plan` / `gw scan` / `gw install`
- README cập nhật v3.18–3.20

## [3.19.0] — 2026-08-28

### Added
- **`stali gateway plan [--json]`** — xem kế hoạch cài gateway (targets/skipped) không cần API key
- Shell completion cho `gateway`/`gw`, `bench`, `telemetry`, `info --offline/--online`

### Changed
- **`runPluginsDoctor`** — quét plugin song song (`Promise.all`)
- Telemetry hook bỏ qua subcommand `telemetry status|on|off` và `bench`

## [3.18.0] — 2026-08-28

### Added
- **`stali telemetry on|off|status`** — telemetry ẩn danh opt-in (command + version + platform)
- **`stali gateway install --json`** — JSON cho install và dry-run
- **`stali info --offline` / `--online`** — kiểm soát gọi mạng

### Changed
- **`stali info --json`** mặc định offline (~150ms): không validate API key / npm registry
- `authStatus({ localOnly: true })` — đọc key local không gọi API
- Post-action telemetry hook (chỉ khi opt-in)

## [3.17.0] — 2026-08-28

### Added
- **`stali bench`** — benchmark cold-start (`--json`, `--strict`, `--runs`)
- Module `bench-cli` dùng chung cho `bun run bench` và lệnh CLI

### Changed
- **Gateway/info nhanh hơn ~3–4×** — cache IDE extensions + một lần `ps`; quét 13 tool song song
- **`stali info`** — bỏ `runDoctorScan` trùng; doctor stats lấy từ gateway discovery
- **`runDoctorScan`** — song song 13 tool
- **Windows standalone CI** — normalize `.exe` artifact; fail build nếu compile lỗi

## [3.16.0] — 2026-08-28

### Added
- **`stali update` qua npm** — tự nhận `npm-global` và chạy `npm i -g stali-cli@latest|@beta`
- **`stali install --channel beta`** — cài npm dist-tag `beta`
- **IDE discovery sâu** — quét Windsurf/Cursor/VSCodium globalStorage + JetBrains markers; signal `jetbrains`
- **Fast `--version`** — `bin/stali.js` và `index.ts` thoát sớm, không load full bundle
- **Benchmark gate** — `STALI_BENCH_STRICT=1` + `STALI_BENCH_MAX_VERSION_MS`

### Changed
- `update --check` dùng npm registry khi cài qua npm hoặc `--channel beta`
- `init --upgrade-cli` so sánh phiên bản qua npm registry
- Release CI: bỏ qua npm publish nếu version đã tồn tại trên registry
- Alias `gw` được route đúng trong `cli-route`

## [3.15.1] — 2026-08-28

### Added
- **Process discovery** — `gateway scan` phát hiện app AI đang chạy (signal `process`) kể cả khi không có binary trong PATH
- **`stali info`** — tóm tắt gateway (app phát hiện / đã cấu hình / chờ cài) + phiên bản npm registry
- **Alias `stali gw`** — viết tắt cho `stali gateway`

### Changed
- **Release CI** — npm publish chạy ngay sau verify, không chờ matrix standalone (macOS queue)

## [3.15.0] — 2026-08-28

### Added
- **`stali gateway scan|install`** — tự quét app AI đang dùng (binary/config/VS Code) và cài Stali gateway
- **`--installed-only`** — `doctor --fix`, `configure-all`, `init` chỉ target app phát hiện
- **macOS LaunchAgent** — `stali update --install-launchd` / `--install-cron` dùng launchd 04:00 trên macOS
- **`stali init --skip-cli-check` / `--upgrade-cli`** — kiểm tra hoặc nâng cấp CLI trong onboarding
- **npm dist-tag `beta`** — release workflow tự gắn tag `beta` cho phiên bản `-beta`/`-rc`/`-alpha`

### Changed
- **npm install nhanh** — `dependencies: {}` (dist prebuilt); `npm i stali-cli` không kéo ~72 packages React/Ink
- Postinstall gợi ý `stali gateway scan` sau cài npm
- `--cron-status` hiển thị LaunchAgent trên macOS
- `installAutoUpdateCron` trên macOS dùng launchd thay crontab

## [3.14.0] — 2026-08-28

### Added
- **Windows Task Scheduler** — `stali update --install-cron` / `--install-task` tạo task 04:00 trên Windows
- **`update --install-task` / `--uninstall-task`** — quản lý Task Scheduler riêng
- **Wizard menu: Cài đặt / nâng cấp CLI** — kiểm tra version, npm upgrade, auto-update, hướng dẫn
- **`--cron-status`** hiển thị Task Scheduler trên Windows

### Changed
- `installAutoUpdateCron` trên Windows thực sự cài schtasks (không chỉ ghi JSON)
- Publish npm registry với provenance (khi có `NPM_TOKEN`)

## [3.13.0] — 2026-08-28

### Added
- **`stali install`** — hướng dẫn cài đặt; `--npm`, `--standalone`, `--git`, `--json`, `--dry-run`
- **`stali update --check --json`** / **`update --dry-run --json`** — kế hoạch update có cấu trúc
- **`scripts/verify-npm-pack.ts`** + CI/release gate — tarball chỉ bin/dist, không src/
- **`docs/NPM_PUBLISH.md`** — hướng dẫn `NPM_TOKEN` + provenance
- **`.npmrc`** — `fund=false`, `audit=false` (cài npm nhanh hơn)

### Changed
- `install.sh` mặc định `STALI_CLI_INSTALL_METHOD=auto` (npm trước, git fallback)
- `install.sh` wrapper global ưu tiên **Node** trước Bun
- Release workflow: `npm publish --provenance` + verify `npm view` sau publish
- **api.stali.vn** `install/stali-cli.ps1` — npm-first với Node, standalone Windows

## [3.12.0] — 2026-08-28

### Added
- **npm cài nhanh** — `bin/stali.js` chạy Node >=18 (không cần Bun); `npm install -g stali-cli` prebuilt dist
- **`scripts/npm-install-global.sh`** — một lệnh cài global (`--no-fund --no-audit`)
- **`scripts/install.ps1`** — Windows standalone + PATH
- **`stali update --dry-run`** — xem kế hoạch update theo install mode
- **`doctor --metrics-bind`** — bind `0.0.0.0` cho `--metrics-port` (opt-in)
- **`update --install-systemd`** — systemd user timer 04:00 (Linux)
- **Wizard menu** — hiển thị install mode (`standalone` / `git` / …)

### Changed
- `package.json` engines → Node >=18; postinstall ghi `npm-global` marker
- `install.sh` npm path dùng `npm install -g` (không Bun)
- `bin/stali` ưu tiên Node trước Bun

## [3.11.0] — 2026-08-28

### Added
- **Wizard menu: Cài completion** — cài bash/fish/zsh từ menu chính
- **`stali info --json`** — thêm `installMode`, `installDetail`, `installVersion`
- **`doctor --watch --metrics-port`** — HTTP `/metrics` + `/healthz` trên 127.0.0.1
- **`stali update --install-cron`** — cron 04:00 tự update (Linux/macOS) + `auto-update.json`
- **`stali update --cron-status` / `--uninstall-cron`**
- **Windows standalone** — `stali-standalone-win-x64` + CI matrix `windows-latest`

### Changed
- `info` human output hiển thị install mode
- PE/MZ header detection cho standalone binary trên Windows

## [3.10.0] — 2026-08-28

### Added
- **Install mode detection** — `standalone` | `git` | `source` | `npm-global` (`~/.stali/install-mode.json`)
- **`stali update` auto-route** — standalone tải binary từ GitHub Release; git/source giữ flow cũ
- **Multi-platform standalone** — `stali-standalone-{linux,darwin}-{x64,arm64}` + CI matrix build
- **`doctor --prometheus`** — metrics text exposition (`stali_doctor_configured`, …)
- **`stali init` completion** — tự `completion install --all` (bỏ qua với `--skip-completion`)

### Fixed
- **`stali completion install <shell>`** — positional `install`/`uninstall` hoạt động đúng

### Changed
- `update --check` hiển thị install mode
- Release workflow: matrix build 4 standalone + gh release assets
- `install.sh` standalone: asset theo platform + ghi `install-mode.json`
- E2E: completion matrix bash/fish/zsh + doctor prometheus

## [3.9.0] — 2026-08-28

### Added
- **GitHub Release assets** — tag push upload `stali-cli-*.tgz`, `stali-standalone`, `checksums.json`
- **`doctor --watch --max-cycles` / `--duration`** — chế độ CI (quét N lần hoặc tối đa N giây)
- **`STALI_CLI_STANDALONE=1`** — `install.sh` tải binary từ GitHub Release (không cần Bun build)
- **`fetchReleaseAssets()`** — resolve asset URL theo release tag

### Fixed
- **`stali completion install [shell]`** — `install`/`uninstall` positional hoạt động đúng (không cần `--install`)
- **`install.sh`** — ưu tiên copy `bin/stali` wrapper thay vì chỉ `stali.js`

### Changed
- Health Gate + e2e: wizard-only dir, doctor watch smoke, `completion install --all`
- `analyze-bundle` báo cáo thêm `wizard-only` partition

## [3.8.0] — 2026-08-28

### Added
- **Wizard-only chunks** — `dist/runtime/wizard-only/` tách chunk chỉ wizard cần (subcommand footprint nhỏ hơn)
- **`stali completion install --all`** — cài bash + fish + zsh một lệnh
- **`doctor --watch` exit code** — exit `1` khi configured count giảm so với peak (CI monitoring)
- **GitHub Release tag resolve** — `update --channel stable|beta` lấy tag từ Releases API
- **Standalone binary** — `STALI_BUILD_STANDALONE=1 bun run build` → `dist/stali-standalone`

### Changed
- `self-update` checkout release tag khi channel resolve ra tag (`vX.Y.Z`)
- `checksums.json` layout `runtime-shared+wizard-only`, manifest đệ quy `dist/runtime/**`

## [3.7.0] — 2026-08-28

### Added
- **Shared runtime build** — `dist/runtime/` dedupe chunks subcommand + wizard (~giảm tarball)
- **`stali completion --doctor`** — kiểm tra bash/fish/zsh đã cài / stale
- **`doctor --watch --json`** — NDJSON stream (`doctor.snapshot` events)
- **`stali update --channel beta|stable`** — kênh cập nhật + verify `checksums.json` sau build
- **`bin/stali`** — shell wrapper tìm Bun + `dist/index.js` (không cần global bun link)

### Changed
- `package.json` bin → `./bin/stali`
- Checksum manifest paths: `dist/runtime/*`, `dist/index.js`

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
