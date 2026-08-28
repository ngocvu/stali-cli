import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
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
  const itemsMenu = [
    { label: "✅ Xác nhận & ghi config plugin", value: "confirm" },
    { label: "⬅️  Quay lại Menu Plugin", value: "back" },
  ];

  return (
    <Card title="🔍 PREVIEW PLUGINS SYNC" borderColor="cyan">
      <Box flexDirection="column" gap={1}>
        <Text color="gray">
          Xem trước config sẽ ghi (API key đã mask). Không thay đổi file cho đến khi xác nhận.
        </Text>
        {items.map((item) => (
          <Box key={item.pluginId} flexDirection="column" marginBottom={1}>
            <Text bold color="white">
              {item.pluginName || item.pluginId}
              {item.patchStyle ? ` (${item.patchStyle})` : ""}
            </Text>
            {item.configPath ? <Text color="gray">  ↳ {item.configPath}</Text> : null}
            {item.preview ? (
              <Box borderStyle="single" borderColor="gray" paddingX={1} marginTop={0}>
                <Text>{JSON.stringify(item.preview, null, 2)}</Text>
              </Box>
            ) : (
              <Text color="yellow">  (không có preview)</Text>
            )}
          </Box>
        ))}
        <SelectInput
          items={itemsMenu}
          onSelect={(item) => {
            if (item.value === "confirm") onConfirm();
            else onBack();
          }}
        />
      </Box>
    </Card>
  );
};
