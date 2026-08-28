import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
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
    <Card title="💡 GỢI Ý patchStyle" borderColor="magenta">
      <Box flexDirection="column" gap={1}>
        <Text color="gray">
          Phân tích file config thực tế → cập nhật ~/.stali/plugins.json rồi sync.
        </Text>
        {suggestions.length === 0 ? (
          <Text color="yellow">Không có plugin — stali plugins --init</Text>
        ) : (
          suggestions.map((s) => (
            <Box key={s.pluginId} flexDirection="column" marginBottom={1}>
              <Text bold color="white">
                {s.pluginName} ({s.pluginId})
                {s.changed ? (
                  <Text color="yellow"> — đề xuất đổi</Text>
                ) : s.currentPatchStyle ? (
                  <Text color="green"> — OK</Text>
                ) : (
                  <Text color="gray"> — mới</Text>
                )}
              </Text>
              <Text color="gray">  file: {s.configFile}{s.configExists ? "" : " (chưa có)"}</Text>
              <Text color="cyan">
                {"  → "}
                {s.suggestedPatchStyle}
                <Text color="gray"> — {s.reason}</Text>
              </Text>
              {s.currentPatchStyle && s.currentPatchStyle !== s.suggestedPatchStyle ? (
                <Text color="yellow">
                  {"  hiện tại: "}
                  {s.currentPatchStyle}
                </Text>
              ) : null}
            </Box>
          ))
        )}
        <SelectInput
          items={[{ label: "⬅️  Quay lại Menu Plugin", value: "back" }]}
          onSelect={() => onBack()}
        />
      </Box>
    </Card>
  );
};
