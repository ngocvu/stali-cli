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
stali doctor --fix --dry-run -k sk-stali-...
stali restore -t claude  # Khôi phục backup gần nhất
stali --reset            # Xóa token ~/.stali
```

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
