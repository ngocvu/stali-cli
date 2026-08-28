import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import { maskToken } from "../utils/token";
import { VERSION } from "../version";

interface MainMenuProps {
  apiKey?: string;
  installMode?: string;
  onSelect: (
    action:
      | "configure"
      | "configure-all"
      | "models"
      | "change-key"
      | "doctor"
      | "fix-all"
      | "open-keys"
      | "update"
      | "completion"
      | "plugins"
      | "exit"
  ) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ apiKey, installMode, onSelect }) => {
  const items = [
    { label: "⚡ Cấu hình ứng dụng AI", value: "configure" as const },
    { label: "⚙️  Cấu hình hàng loạt (configure-all)", value: "configure-all" as const },
    { label: "📊 Xem bảng giá & danh sách Model Stali API", value: "models" as const },
    { label: "🩺 Kiểm tra trạng thái cấu hình (doctor)", value: "doctor" as const },
    { label: "🔧 Sửa tất cả tool chưa OK (doctor fix)", value: "fix-all" as const },
    { label: "🔌 Plugin tùy chỉnh (sync / doctor)", value: "plugins" as const },
    { label: "⬆️  Cập nhật stali-cli (update)", value: "update" as const },
    { label: "⌨️  Cài shell completion (bash/fish/zsh)", value: "completion" as const },
    { label: "🔑 Cài đặt API Token", value: "change-key" as const },
    { label: "🔗 Mở Dashboard Keys (trình duyệt)", value: "open-keys" as const },
    { label: "🚪 Thoát", value: "exit" as const },
  ];

  return (
    <Card title="📋 MENU CHÍNH - STALI API" borderColor="cyan">
      <Box flexDirection="column" gap={1}>
        {apiKey && (
          <Text color="gray">
            Token hiện tại: <Text color="yellow">{maskToken(apiKey)}</Text>
          </Text>
        )}
        <Text color="gray">
          stali-cli v{VERSION}
          {installMode ? ` · ${installMode}` : ""} · ~/.stali
        </Text>
        <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn</Text>
        </Box>
      </Box>
    </Card>
  );
};
