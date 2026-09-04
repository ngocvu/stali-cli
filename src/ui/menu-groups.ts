import type { MenuGroup } from "./components/Menu";

export type MainMenuAction =
  | "configure"
  | "configure-all"
  | "models"
  | "change-key"
  | "doctor"
  | "fix-all"
  | "open-keys"
  | "update"
  | "install"
  | "gateway"
  | "completion"
  | "plugins"
  | "more"
  | "back"
  | "exit";

export function buildMainMenuGroups(opts: {
  advanced: boolean;
  gatewayPending?: number;
  pendingGatewayCount?: number;
}): MenuGroup<MainMenuAction>[] {
  const pending = opts.pendingGatewayCount ?? 0;
  const gwWait = opts.gatewayPending ?? 0;
  const gatewayHint =
    gwWait > 0 ? `${gwWait} app chờ` : pending > 0 ? `${pending} app chờ` : undefined;

  if (!opts.advanced) {
    const start: MenuGroup<MainMenuAction> = {
      items: [
        {
          label: "Cấu hình app AI",
          value: "configure",
          icon: "⚡",
          description: "Chọn app, xong là dùng",
        },
        {
          label: "Kiểm tra",
          value: "doctor",
          icon: "🩺",
          description: "App nào đã trỏ Stali",
        },
      ],
    };
    if (gwWait > 0 || pending > 0) {
      start.items.splice(1, 0, {
        label: "Cài gateway cho app đã có",
        value: "gateway",
        icon: "🌐",
        hint: gatewayHint,
      });
    }
    start.items.push(
      { label: "Đổi API key", value: "change-key", icon: "🔑" },
      { label: "Tùy chọn khác", value: "more", icon: "…" },
      { label: "Thoát", value: "exit", icon: "×" }
    );
    return [start];
  }

  return [
    {
      title: "CẤU HÌNH",
      items: [
        { label: "Cấu hình hàng loạt", value: "configure-all", icon: "⚙" },
        {
          label: "Gateway Stali",
          value: "gateway",
          icon: "🌐",
          hint: gatewayHint,
        },
        { label: "Bảng giá & model", value: "models", icon: "▣" },
        { label: "Sửa tất cả tool chưa OK", value: "fix-all", icon: "🔧" },
      ],
    },
    {
      title: "HỆ THỐNG",
      items: [
        { label: "Plugin tùy chỉnh", value: "plugins", icon: "🔌" },
        { label: "Cài đặt / nâng cấp CLI", value: "install", icon: "📦" },
        { label: "Cập nhật stali-cli", value: "update", icon: "↑" },
        { label: "Shell completion", value: "completion", icon: "⌨" },
        { label: "Mở Dashboard Keys", value: "open-keys", icon: "↗" },
      ],
    },
    {
      items: [{ label: "Quay lại", value: "back", icon: "←" }],
    },
  ];
}
