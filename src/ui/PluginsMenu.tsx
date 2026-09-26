import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu, type MenuItem } from "./components/Menu";
import { colors } from "./theme";

export type PluginsMenuAction = "sync" | "preview" | "suggest" | "doctor" | "back";

interface PluginsMenuProps {
  pluginCount: number;
  onSelect: (action: PluginsMenuAction) => void;
}

export const PluginsMenu: React.FC<PluginsMenuProps> = ({ pluginCount, onSelect }) => {
  const empty = pluginCount === 0;
  const items: MenuItem<PluginsMenuAction>[] = empty
    ? [{ label: "Quay lại menu chính", value: "back", icon: "←" }]
    : [
        { label: `Preview sync (${pluginCount})`, value: "preview", icon: "▣" },
        { label: `Sync tất cả plugin (${pluginCount})`, value: "sync", icon: "⚡" },
        { label: "Gợi ý patchStyle", value: "suggest", icon: "💡" },
        { label: "Doctor plugins", value: "doctor", icon: "🩺" },
        { label: "Quay lại menu chính", value: "back", icon: "←" },
      ];

  return (
    <Card title="Plugin tùy chỉnh" subtitle={`~/.stali/plugins.json · ${pluginCount} plugin`} borderColor="magenta">
      <Box flexDirection="column" gap={1}>
        {empty ? (
          <Text color={colors.warning}>Chưa có plugin — chạy: stali plugins list --init</Text>
        ) : null}
        <Menu
          groups={[{ items }]}
          onSelect={onSelect}
          onBack={() => onSelect("back")}
        />
      </Box>
    </Card>
  );
};
