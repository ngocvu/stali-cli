import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "../components/Card";
import { getToolById } from "../../utils/tool-utils";
import { maskToken } from "../../utils/token";

export type GenericMenuAction =
  | "quick-setup"
  | "set-model"
  | "apply"
  | "reset"
  | "back";

interface GenericToolDetailMenuProps {
  toolId: string;
  model: string;
  apiKey: string;
  onSelectAction: (action: GenericMenuAction) => void;
}

export const GenericToolDetailMenu: React.FC<GenericToolDetailMenuProps> = ({
  toolId,
  model,
  apiKey,
  onSelectAction,
}) => {
  const tool = getToolById(toolId);
  const toolName = tool?.name || toolId;
  const configFile = tool?.configFile || "~/.stali/config.json";

  const items = [
    { label: "⚡ Quick setup (model mặc định)", value: "quick-setup" as const },
    { label: "🤖 Chọn model Stali API", value: "set-model" as const },
    { label: "✅ Xem trước & Áp dụng cấu hình", value: "apply" as const },
    { label: "🔄 Khôi phục từ backup gần nhất", value: "reset" as const },
    { label: "⬅️  Quay lại danh sách ứng dụng", value: "back" as const },
  ];

  return (
    <Card title={`${tool?.icon || "🔧"} CẤU HÌNH ${toolName.toUpperCase()}`} borderColor="cyan">
      <Box flexDirection="column" gap={1}>
        <Text>
          Token: <Text color="yellow">{maskToken(apiKey)}</Text>
        </Text>
        <Text>
          Model hiện tại: <Text color="green" bold>{model}</Text>
        </Text>
        <Text color="gray">
          File đích: <Text color="white">{configFile}</Text>
        </Text>

        <SelectInput items={items} onSelect={(item) => onSelectAction(item.value)} />

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn</Text>
        </Box>
      </Box>
    </Card>
  );
};
