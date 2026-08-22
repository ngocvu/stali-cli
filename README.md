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
- 🩺 **Doctor**: `stali doctor` — quét config đã trỏ Stali chưa

---

## 🚀 Cài đặt

```bash
# Một lệnh (khuyến nghị trên api.stali.vn)
curl -fsSL https://api.stali.vn/install/stali-cli.sh | bash

# Hoặc Bun/npm (cần build dist/)
bun install -g stali-cli
```

---

## 📖 Sử dụng

```bash
stali                    # Wizard tương tác
stali --models           # Bảng giá model
stali ls -k sk-stali-... # Bảng giá với token
stali doctor             # Kiểm tra cấu hình
stali configure claude -k sk-stali-...
stali configure codex -m req/gpt-5.6-sol -k sk-stali-...
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
