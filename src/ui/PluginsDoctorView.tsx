import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import type { PluginHealthStatus } from "../services/plugin-doctor";

interface PluginsDoctorViewProps {
  statuses: PluginHealthStatus[];
  onBack: () => void;
  onSyncAll?: () => void;
}

export const PluginsDoctorView: React.FC<PluginsDoctorViewProps> = ({
  statuses,
  onBack,
  onSyncAll,
}) => {
  const configured = statuses.filter((s) => s.configuredForStali);
  const missing = statuses.filter((s) => !s.configuredForStali);

  const items: { label: string; value: string }[] = [];
  if (missing.length > 0 && onSyncAll) {
    items.push({
      label: `🔧 Sync ${missing.length} plugin chưa trỏ Stali`,
      value: "sync-all",
    });
  }
  items.push({ label: "⬅️  Quay lại Menu chính", value: "back" });

  return (
    <Card title="🔌 PLUGINS DOCTOR" borderColor="magenta">
      <Box flexDirection="column" gap={1}>
        <Text bold color="green">
          ✅ Đã trỏ Stali ({configured.length}/{statuses.length})
        </Text>
        {configured.map((s) => (
          <Box key={s.pluginId} flexDirection="column" marginBottom={0}>
            <Text color="green">
              • {s.pluginName} ({s.patchStyle})
              {s.model ? ` — ${s.model}` : ""}
            </Text>
            {s.endpoint ? <Text color="gray">  ↳ {s.endpoint}</Text> : null}
            <Text color="gray">  ↳ {s.configPath}</Text>
          </Box>
        ))}

        <Text bold color="yellow">
          ⚠️ Chưa cấu hình ({missing.length})
        </Text>
        {missing.map((s) => (
          <Text key={s.pluginId} color="gray">
            • {s.pluginName} —{" "}
            {s.exists ? "file có, chưa trỏ Stali" : "chưa có file"} — {s.configPath}
          </Text>
        ))}

        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "sync-all" && onSyncAll) onSyncAll();
            else onBack();
          }}
        />
      </Box>
    </Card>
  );
};
