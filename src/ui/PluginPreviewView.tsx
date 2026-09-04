import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";
import { KeyValueTable } from "./components/KeyValueTable";
import { flattenConfigRows, colors, getBorderStyle, glyphs } from "./theme";
import type { PluginSyncItem } from "../services/plugin-sync";

interface PluginPreviewViewProps {
  items: PluginSyncItem[];
  onConfirm: () => void;
  onBack: () => void;
}

export const PluginPreviewView: React.FC<PluginPreviewViewProps> = ({
  items,
  onConfirm,
  onBack,
}) => {
  return (
    <Card title="Preview plugins sync" subtitle="API key đã mask — chưa ghi file cho đến khi xác nhận">
      <Box flexDirection="column" gap={1}>
        {items.map((item) => (
          <Box key={item.pluginId} flexDirection="column" marginBottom={1}>
            <Text bold color={colors.text}>
              {item.pluginName || item.pluginId}
              {item.patchStyle ? ` (${item.patchStyle})` : ""}
            </Text>
            {item.configPath ? <Text color={colors.muted}>{item.configPath}</Text> : null}
            {item.preview ? (
              <Box
                borderStyle={getBorderStyle()}
                borderColor={colors.muted}
                paddingX={1}
                flexDirection="column"
              >
                <KeyValueTable rows={flattenConfigRows(item.preview)} />
              </Box>
            ) : (
              <Text color={colors.warning}>  (không có preview)</Text>
            )}
          </Box>
        ))}

        <Menu
          groups={[
            {
              items: [
                { label: "Xác nhận & ghi config plugin", value: "confirm", icon: glyphs.check },
                { label: "Quay lại menu plugin", value: "back", icon: "←" },
              ],
            },
          ]}
          onSelect={(value) => {
            if (value === "confirm") onConfirm();
            else onBack();
          }}
          onBack={onBack}
        />
      </Box>
    </Card>
  );
};
