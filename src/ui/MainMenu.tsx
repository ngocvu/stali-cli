import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import { maskToken } from "../utils/token";

interface MainMenuProps {
  apiKey?: string;
  onSelect: (action: "configure" | "models" | "change-key" | "doctor" | "exit") => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ apiKey, onSelect }) => {
  const items = [
    {
      label: "⚡ Cấu hình ứng dụng AI",
      value: "configure" as const,
    },
    {
      label: "📊 Xem bảng giá & danh sách Model Stali API",
      value: "models" as const,
    },
    {
      label: "🩺 Kiểm tra trạng thái cấu hình (doctor)",
      value: "doctor" as const,
    },
    {
      label: "🔑 Cài đặt API Token",
      value: "change-key" as const,
    },
    {
      label: "🚪 Thoát",
      value: "exit" as const,
    },
  ];

  return (
    <Card title="📋 MENU CHÍNH - STALI API" borderColor="cyan">
      <Box flexDirection="column" gap={1}>
        {apiKey && (
          <Text color="gray">
            Token hiện tại: <Text color="yellow">{maskToken(apiKey)}</Text>
          </Text>
        )}
        <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">
            💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn
          </Text>
        </Box>
      </Box>
    </Card>
  );
};
