import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";

export type PluginsMenuAction = "sync" | "doctor" | "back";

interface PluginsMenuProps {
  pluginCount: number;
  onSelect: (action: PluginsMenuAction) => void;
}

export const PluginsMenu: React.FC<PluginsMenuProps> = ({ pluginCount, onSelect }) => {
  const items = [
    {
      label: `⚡ Sync tất cả plugin (${pluginCount})`,
      value: "sync" as const,
      disabled: pluginCount === 0,
    },
    {
      label: "🩺 Kiểm tra plugin (plugins doctor)",
      value: "doctor" as const,
      disabled: pluginCount === 0,
    },
    { label: "⬅️  Quay lại Menu chính", value: "back" as const },
  ].filter((i) => !i.disabled);

  return (
    <Card title="🔌 PLUGINS TÙY CHỈNH" borderColor="magenta">
      <Box flexDirection="column" gap={1}>
        <Text color="gray">~/.stali/plugins.json · {pluginCount} plugin</Text>
        {pluginCount === 0 ? (
          <Text color="yellow">
            Chưa có plugin — chạy: stali plugins list --init
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
