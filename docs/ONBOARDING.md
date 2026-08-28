# Onboarding stali-cli (một trang)

Cài và cấu hình **Stali API** cho app AI trên máy bạn — khoảng **2 phút**.

## 1. Cài CLI

```bash
npm install -g stali-cli@latest
stali --version
```

Standalone (không cần Node): xem [GitHub Releases](https://github.com/ngocvu/stali-cli/releases).

## 2. API key

Lấy key tại [api.stali.vn/dashboard/keys](https://api.stali.vn/dashboard/keys) (prefix `sk-stali-`).

## 3. Setup một lệnh

```bash
stali -k sk-stali-xxxxxxxx
# hoặc
stali setup -k sk-stali-xxxxxxxx --json
```

Setup sẽ: lưu key → `stali gw auto` (cài gateway app đã phát hiện) → kiểm tra nhanh.

## 4. Kiểm tra

| Lệnh | Mục đích |
|------|----------|
| `stali status --json` | Auth + gateway + `pendingGateway` |
| `stali setup --json` | Setup một lệnh (`schemaVersion: 2`, `pendingGateway`) |
| `stali ready --json` | Giống status (`command: "ready"`) |
| `stali scan --json` | Quét app AI (`schemaVersion: 2`, `pendingGateway`) |
| `stali guide onboarding` | In toàn bộ hướng dẫn này trong terminal |
| `stali plugins suggest --json` | Gợi ý patchStyle plugin (`schemaVersion: 2`) |
| `stali telemetry status --json` | Trạng thái telemetry opt-in (`schemaVersion: 2`) |
| `stali doctor --json` | Chi tiết 13 tool + plugin |
| `stali doctor --strict` | CI: exit 1 nếu còn gateway chờ |

```bash
stali status --json | jq '.pendingGatewayCount, .setup.nextCommand'
```

## 5. Plugin tùy chỉnh (tuỳ chọn)

```bash
stali plugins --init
stali plugins suggest --json
stali plugins sync --preview --json
stali plugins sync
```

## 6. Gateway thủ công

```bash
stali scan
stali gw plan --json
stali gw auto -k sk-stali-...
```

## 7. CI / Git hook (tuỳ chọn)

```bash
# Sau khi đổi config AI — fail nếu chưa trỏ Stali
stali doctor --strict --tools-only --json

# Mẫu git hook: scripts/examples/git-hooks/pre-commit-stali-doctor.sh
# Mẫu CI shell:   scripts/examples/shell/doctor-strict-ci.sh
```

## Luồng gợi ý hàng ngày

```
stali status → stali doctor → stali gw (nếu pending) → mở app AI
```

Trợ giúp: `stali user` · `stali guide onboarding` · `stali help advanced` · `stali info --json`
