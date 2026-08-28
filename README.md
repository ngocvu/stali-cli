# stali-cli 🚀

Công cụ dòng lệnh (CLI) tương tác và trình quản lý cấu hình cho **Stali API** (`https://api.stali.vn`), xây dựng bằng **TypeScript**, **Bun** và **React trong Terminal (Ink)** với validation an toàn bằng **Zod**.

---

## ✨ Tính năng

- 🎨 **Giao diện Terminal (Ink)**: wizard 5 bước, menu mũi tên, spinner
- 🔑 **Quản lý token**: `~/.stali/config.json` (chmod 0600), validate prefix `sk-stali-`
- 📊 **Bảng giá realtime**: `GET /v1/models` với Zod
- 🔌 **13 công cụ AI** — wizard + `stali configure <tool>`:
  - Claude Code, Codex CLI, OpenClaw, DeepSeek TUI, Qwen Code
  - OpenCode, Kilo Code, Droid CLI, Cline, Roo Code
  - Grok Build, Cowork, jcode
- 🛡️ **Backup timestamp**: `<file>.YYYYMMDD_HHmmss.bak` + `stali restore`
- 🩺 **Doctor**: `stali doctor` — quét 13 tool với parser schema (không chỉ heuristic)
- 📋 **Tools**: `stali tools` — liệt kê 13 công cụ + đường dẫn config
- ⚙️ **Batch**: `stali configure-all` — cấu hình hàng loạt (dry-run, filter tool)
- 🐾 **OpenClaw menu**: wizard riêng với status live
- ⌨️ **Completion**: `stali completion bash|zsh|fish`
- 📤 **Export**: `stali export-env <tool>` — copy env thủ công
- 🩺 **Doctor fix**: `stali doctor --fix` — sửa tool chưa trỏ Stali
- 🧩 **VS Code menu**: Cline / Roo / Kilo wizard riêng
- 📄 **TOML menu**: DeepSeek / Grok / jcode wizard riêng
- 🟢 **OpenCode menu**: wizard provider JSON riêng
- 🗑️ **Uninstall**: `stali uninstall` gỡ wrapper an toàn
- 🔧 **Wizard fix-all**: sửa hàng loạt từ menu chính / doctor
- 🔑 **Auth**: `stali auth login|status|logout`
- 📋 **Info**: `stali info --json`
- 🔗 **Open**: `stali open keys` · **Guide**: `stali guide cursor`
- ⚙️ **Wizard configure-all**: batch 11/13 tool từ menu chính
- 🟣 **13/13 menu riêng**: Qwen, Droid, Cowork — không còn generic fallback
- 🚀 **Init**: `stali init` — onboarding một lệnh (auth + configure-all + check)
- 🔌 **Plugins**: `stali plugins list|sync` — registry `~/.stali/plugins.json` + syncer tự động
- 🌐 **Custom API**: `stali config set base-url <url>` — staging/self-hosted
- 🌐 **i18n**: `--lang vi|en` hoặc `STALI_LANG`
- 🔔 **Doctor notify**: `stali doctor --watch --notify` — cảnh báo khi cấu hình đổi
- 📦 **v3.5**: `doctor --fix` scoped, `completion install`, wizard bundle tách subcommand
- 📦 **v3.4**: zsh completion đầy đủ, CI docs, e2e check scope/conflict
- 📦 **v3.3**: `check --tools-only/--plugins-only`, `stali wizard`, multi-entry build
- 📦 **v3.2**: `doctor --tools-only`, dual-entry CLI/wizard, gỡ forward `plugins doctor --json`
- 📦 **v3.1**: `doctor --plugins-only`, lazy-load subcommands
- 📦 **v3.0**: wizard doctor thống nhất, gỡ devtools bundle (~-750KB)
- 📦 **v2.7**: auto-include plugins, `--no-plugins`, plugins doctor deprecated, CI npm publish
- 📦 **v2.6**: lazy-load wizard, `init --include-plugins`, doctor JSON thống nhất (tools+plugins), cold-start ~80ms
- 📦 **v2.4**: `doctor --json` meta endpoints, commands/ modular, 91 tests

---

## 🚀 Cài đặt

```bash
# Một lệnh (khuyến nghị trên api.stali.vn)
curl -fsSL https://api.stali.vn/install/stali-cli.sh | bash

# Hoặc Bun/npm (cần build dist/)
bun install -g stali-cli
```

## 📁 Cấu trúc thư mục (~/.stali)

| Path | Mục đích |
|------|----------|
| `~/.stali/cli` | Source + build stali-cli |
| `~/.stali/bin` | Lệnh `stali` (wrapper, không nằm trong `.bun`) |
| `~/.stali/config.json` | API key đã lưu (wizard) |
| `~/.bun` | Chỉ Bun runtime |

```bash
stali paths   # In đường dẫn trên máy bạn
```

---

```bash
stali                    # Wizard tương tác
stali --models           # Bảng giá model
stali ls -k sk-stali-... # Bảng giá với token
stali doctor             # Kiểm tra cấu hình (13 tool, schema-aware)
stali paths              # ~/.stali/cli, bin, config
stali tools              # Liệt kê 13 công cụ + file config
stali update             # Cập nhật từ GitHub
stali configure claude --dry-run -k sk-stali-...  # Xem preview, không ghi file
stali configure-all --skip-advanced -k sk-stali-... # 11 tool (bỏ claude/codex)
stali configure-all --tools openclaw,cline -k sk-stali-...
stali export-env claude -k sk-stali-...           # export ANTHROPIC_* (shell)
stali export-env codex -f json -k sk-stali-...
stali doctor --fix -k sk-stali-...                # sửa tool chưa OK
stali doctor --json                              # JSON thống nhất: meta + tools + plugins
stali doctor --plugins-only [--json]             # Chỉ plugin (~/.stali/plugins.json)
stali doctor --tools-only [--json]               # Chỉ 13 tool (bỏ plugin)
stali config set base-url https://staging/v1   # custom endpoint
stali plugins sync -k sk-stali-...             # sync plugin tùy chỉnh
stali uninstall                  # Gỡ wrapper (~/.stali/bin)
stali auth login -k sk-stali-...     # Lưu API key
stali auth status
stali info --json
stali open keys                      # Mở Dashboard tạo key
stali init -k sk-stali-...              # Onboarding (auto sync plugin nếu plugins.json có entry)
stali init --no-plugins -k sk-stali-... # Chỉ tools, bỏ plugin
stali init --skip-configure -k sk-stali-...  # Chỉ lưu key
stali plugins --init                  # Tạo ~/.stali/plugins.json mẫu
stali --lang en check                 # Thông báo tiếng Anh
stali config show
stali backups -t claude
stali check --strict              # Auth + tất cả tool (và plugin nếu có)
stali check --tools-only --json   # Chỉ tools
stali check --plugins-only        # Chỉ plugin
stali wizard                      # Wizard Ink (hoặc: stali)
stali completion install          # Cài completion (auto từ $SHELL)
stali completion install fish     # Cài fish completion
stali doctor --tools-only --fix   # Sửa chỉ 13 tool
stali doctor --plugins-only --fix # Sửa chỉ plugin
stali doctor --watch --notify -i 10 # Theo dõi + cảnh báo desktop
stali update --check              # Có bản mới?
stali uninstall --purge-path    # Windows: gỡ khỏi User PATH
stali restore -t claude  # Khôi phục backup gần nhất
stali --reset            # Xóa token ~/.stali
```

### CI / automation

```bash
# Gate deploy: auth + toàn bộ 13 tool (bỏ plugin nếu chưa dùng)
stali check --strict --tools-only --json

# Gate plugin sync (plugins.json phải có entry và đã trỏ Stali)
stali check --strict --plugins-only --json

# Diagnostic đầy đủ (tools + plugins + meta)
stali doctor --json
```

Exit code: `0` = pass, `1` = fail health, `2` = lỗi CLI (vd. cờ xung đột).

---

## 🛠️ Phát triển

```bash
bun install
bun run typecheck
bun test
bun run build
bun run src/index.ts
```

---

## 📄 License

MIT © Stali API
