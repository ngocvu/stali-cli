import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";

export interface ContextSelectProps {
  currentContext?: string;
  onSelect: (contextValue: string) => void;
}

export const CONTEXT_OPTIONS = [
  { label: "Default (tự động theo model)", value: "", icon: "⚡" },
  { label: "200K tokens (198.000)", value: "198000", icon: "·" },
  { label: "300K tokens (298.000)", value: "298000", icon: "·" },
  { label: "500K tokens (498.000)", value: "498000", icon: "·" },
  { label: "1M tokens (998.000 — tối đa)", value: "998000", icon: "·" },
  { label: "Nhập số tokens thủ công", value: "__MANUAL_CONTEXT__", icon: "✎" },
  { label: "Quay lại", value: "back", icon: "←" },
];

export function formatContextDisplay(value?: string): string {
  if (!value) return "Default (tự động)";
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
      title="Context window"
      subtitle={`Hiện tại: ${formatContextDisplay(currentContext)}`}
      tone="warning"
    >
      <Box flexDirection="column" gap={1}>
        <Text color="gray">CLAUDE_CODE_MAX_CONTEXT_TOKENS cho Claude Code</Text>
        <Menu
          groups={[{ items: CONTEXT_OPTIONS }]}
          onSelect={onSelect}
          onBack={() => onSelect("back")}
        />
      </Box>
    </Card>
  );
};
