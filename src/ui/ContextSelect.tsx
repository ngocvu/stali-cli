import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";

export interface ContextSelectProps {
  currentContext?: string;
  onSelect: (contextValue: string) => void;
}

export const CONTEXT_OPTIONS = [
  { label: "⚡ Default (Tự động theo dung lượng của Model)", value: "" },
  { label: "🟢 200K Tokens (198.000 tokens)", value: "198000" },
  { label: "🟡 300K Tokens (298.000 tokens)", value: "298000" },
  { label: "🟠 500K Tokens (498.000 tokens)", value: "498000" },
  { label: "🟣 1M Tokens (998.000 tokens - Tối đa)", value: "998000" },
  { label: "✍️  Nhập số Tokens thủ công (Custom Tokens)", value: "__MANUAL_CONTEXT__" },
  { label: "⬅️  Quay lại", value: "back" },
];

export function formatContextDisplay(value?: string): string {
  if (!value) return "Default (Tự động)";
  if (value === "198000") return "200K (198K)";
  if (value === "298000") return "300K (298K)";
  if (value === "498000") return "500K (498K)";
  if (value === "998000") return "1M (998K)";
  return `${value} tokens`;
}

export const ContextSelect: React.FC<ContextSelectProps> = ({
  currentContext,
  onSelect,
}) => {
  return (
    <Card
      title="📏 CẤU HÌNH CONTEXT WINDOW (CLAUDE CODE)"
      subtitle={`Hiện tại: [ ${formatContextDisplay(currentContext)} ]`}
      borderColor="yellow"
    >
      <Box flexDirection="column" gap={1}>
        <Text color="gray">
          Chọn giới hạn Context Window (CLAUDE_CODE_MAX_CONTEXT_TOKENS) cho Claude Code:
        </Text>

        <SelectInput
          items={CONTEXT_OPTIONS}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Card>
  );
};
