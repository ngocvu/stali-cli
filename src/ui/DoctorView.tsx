import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import type { ToolHealthStatus } from "../services/syncers";
import type { PluginHealthStatus } from "../services/plugin-doctor";

export interface DoctorViewProps {
  toolStatuses: ToolHealthStatus[];
  pluginStatuses?: PluginHealthStatus[];
  onBack: () => void;
  onFixAllTools?: () => void;
  onSyncAllPlugins?: () => void;
  backLabel?: string;
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  toolStatuses,
  pluginStatuses = [],
  onBack,
  onFixAllTools,
  onSyncAllPlugins,
  backLabel = "⬅️  Quay lại Menu chính",
}) => {
  const toolsConfigured = toolStatuses.filter((s) => s.configuredForStali);
  const toolsMissing = toolStatuses.filter((s) => !s.configuredForStali);
  const pluginsConfigured = pluginStatuses.filter((s) => s.configuredForStali);
  const pluginsMissing = pluginStatuses.filter((s) => !s.configuredForStali);

  const items: { label: string; value: string }[] = [];
  if (toolsMissing.length > 0 && onFixAllTools) {
    items.push({
      label: `🔧 Sửa ${toolsMissing.length} tool chưa trỏ Stali (doctor fix)`,
      value: "fix-tools",
    });
  }
  if (pluginsMissing.length > 0 && onSyncAllPlugins) {
    items.push({
      label: `🔌 Sync ${pluginsMissing.length} plugin chưa trỏ Stali`,
      value: "sync-plugins",
    });
  }
  items.push({ label: backLabel, value: "back" });

  return (
    <Card title="🩺 STALI DOCTOR — TOOLS & PLUGINS" borderColor="yellow">
      <Box flexDirection="column" gap={1}>
        <Text bold color="green">
          ✅ Tools trỏ Stali ({toolsConfigured.length}/{toolStatuses.length})
        </Text>
        {toolsConfigured.map((s) => (
          <Box key={s.toolId} flexDirection="column" marginBottom={0}>
            <Text color="green">
              • {s.toolName}
              {s.model ? ` — ${s.model}` : ""}
            </Text>
            {s.endpoint ? <Text color="gray">  ↳ {s.endpoint}</Text> : null}
            <Text color="gray">  ↳ {s.configPath}</Text>
          </Box>
        ))}

        {toolsMissing.length > 0 ? (
          <>
            <Text bold color="yellow">
              ⚠️ Tool chưa OK ({toolsMissing.length})
            </Text>
            {toolsMissing.map((s) => (
              <Text key={s.toolId} color="gray">
                • {s.toolName} —{" "}
                {s.exists ? "file có, chưa trỏ Stali" : "chưa có file"} — {s.configPath}
              </Text>
            ))}
          </>
        ) : null}

        {pluginStatuses.length > 0 ? (
          <>
            <Text bold color="magenta">
              🔌 Plugins trỏ Stali ({pluginsConfigured.length}/{pluginStatuses.length})
            </Text>
            {pluginsConfigured.map((s) => (
              <Box key={s.pluginId} flexDirection="column" marginBottom={0}>
                <Text color="magenta">
                  • {s.pluginName} ({s.patchStyle})
                  {s.model ? ` — ${s.model}` : ""}
                </Text>
                {s.endpoint ? <Text color="gray">  ↳ {s.endpoint}</Text> : null}
                <Text color="gray">  ↳ {s.configPath}</Text>
              </Box>
            ))}
            {pluginsMissing.length > 0 ? (
              <>
                <Text bold color="yellow">
                  ⚠️ Plugin chưa OK ({pluginsMissing.length})
                </Text>
                {pluginsMissing.map((s) => (
                  <Text key={s.pluginId} color="gray">
                    • {s.pluginName} —{" "}
                    {s.exists ? "file có, chưa trỏ Stali" : "chưa có file"} — {s.configPath}
                  </Text>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "fix-tools" && onFixAllTools) onFixAllTools();
            else if (item.value === "sync-plugins" && onSyncAllPlugins) onSyncAllPlugins();
            else onBack();
          }}
        />
      </Box>
    </Card>
  );
};
