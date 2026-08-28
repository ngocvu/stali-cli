import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import { SUPPORTED_TOOLS } from "../constants/tools";

export type ConfigureAllAction = "batch-11" | "batch-13" | "dry-run-11" | "back";

interface ConfigureAllMenuProps {
  pluginCount: number;
  onSelect: (action: ConfigureAllAction) => void;
}

export const ConfigureAllMenu: React.FC<ConfigureAllMenuProps> = ({
  pluginCount,
  onSelect,
}) => {
  const pluginHint =
    pluginCount > 0 ? ` + ${pluginCount} plugin (tự động)` : "";

  const items = [
    {
      label: `⚡ Cấu hình 11 tool${pluginHint} (bỏ Claude/Codex — khuyến nghị)`,
      value: "batch-11" as const,
    },
    {
      label: `🔧 Cấu hình cả 13 tool${pluginHint} (gồm Claude + Codex)`,
      value: "batch-13" as const,
    },
    {
      label: `🔍 Dry-run xem trước (11 tool${pluginHint}, không ghi file)`,
      value: "dry-run-11" as const,
    },
    { label: "⬅️  Quay lại Menu chính", value: "back" as const },
  ];

  return (
    <Card title="⚙️ CẤU HÌNH HÀNG LOẠT (CONFIGURE-ALL)" borderColor="yellow">
      <Box flexDirection="column" gap={1}>
        <Text color="gray">
          Patch đồng loạt {SUPPORTED_TOOLS.length} công cụ AI — mỗi file có backup timestamp.
        </Text>
        <Text color="yellow">
          Claude/Codex cần wizard nâng cao — mặc định bỏ qua trong batch 11 tool.
        </Text>
        {pluginCount > 0 ? (
          <Text color="magenta">
            plugins.json có {pluginCount} entry — batch tự sync plugin.
          </Text>
        ) : null}
        <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn</Text>
        </Box>
      </Box>
    </Card>
  );
};
