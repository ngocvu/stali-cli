import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";
import { StatusBadge } from "./components/StatusBadge";
import { colors } from "./theme";
import type { PluginPatchSuggestion } from "../services/plugin-suggest";

interface PluginSuggestViewProps {
  suggestions: PluginPatchSuggestion[];
  onBack: () => void;
}

export const PluginSuggestView: React.FC<PluginSuggestViewProps> = ({
  suggestions,
  onBack,
}) => {
  return (
    <Card title="Gợi ý patchStyle" subtitle="Phân tích file config → cập nhật ~/.stali/plugins.json rồi sync" borderColor="magenta">
      <Box flexDirection="column" gap={1}>
        {suggestions.length === 0 ? (
          <Text color={colors.warning}>Không có plugin — stali plugins --init</Text>
        ) : (
          suggestions.map((s) => (
            <Box key={s.pluginId} flexDirection="column" marginBottom={1}>
              <Box gap={1}>
                <StatusBadge
                  status={s.changed ? "warn" : s.currentPatchStyle ? "pass" : "info"}
                />
                <Text bold color={colors.text}>
                  {s.pluginName} ({s.pluginId})
                </Text>
              </Box>
              <Text color={colors.muted}>
                {"  "}file: {s.configFile}
                {s.configExists ? "" : " (chưa có)"}
              </Text>
              <Text color={colors.accent}>
                {"  → "}
                {s.suggestedPatchStyle}
                <Text color={colors.muted}> — {s.reason}</Text>
              </Text>
              {s.currentPatchStyle && s.currentPatchStyle !== s.suggestedPatchStyle ? (
                <Text color={colors.warning}>
                  {"  hiện tại: "}
                  {s.currentPatchStyle}
                </Text>
              ) : null}
            </Box>
          ))
        )}
        <Menu
          groups={[{ items: [{ label: "Quay lại menu plugin", value: "back", icon: "←" }] }]}
          onSelect={() => onBack()}
          onBack={onBack}
        />
      </Box>
    </Card>
  );
};
