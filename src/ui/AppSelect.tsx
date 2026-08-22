import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import { SUPPORTED_TOOLS } from "../constants/tools";

interface AppSelectProps {
  onSelect: (toolId: string) => void;
}

export const AppSelect: React.FC<AppSelectProps> = ({ onSelect }) => {
  const items = [
    ...SUPPORTED_TOOLS.map((tool) => ({
      label: `${tool.icon} ${tool.name}`,
      value: tool.id,
    })),
    {
      label: "⬅️  Quay lại Menu chính",
      value: "back",
    },
  ];

  return (
    <Card title="🎯 CHỌN ỨNG DỤNG CẦN CẤU HÌNH STALI API" borderColor="cyan">
      <Box flexDirection="column" gap={1}>
        <Text color="gray">
          Hỗ trợ {SUPPORTED_TOOLS.length} công cụ AI CLI / IDE — chọn một để bắt đầu cấu hình.
        </Text>
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
