# Changelog

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
