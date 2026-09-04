import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";
import { SUPPORTED_TOOLS } from "../constants/tools";
import { colors } from "./theme";

export type ConfigureAllAction = "batch-11" | "batch-13" | "dry-run-11" | "back";

interface ConfigureAllMenuProps {
  pluginCount: number;
  onSelect: (action: ConfigureAllAction) => void;
}

export const ConfigureAllMenu: React.FC<ConfigureAllMenuProps> = ({
  pluginCount,
  onSelect,
}) => {
  const pluginHint = pluginCount > 0 ? ` + ${pluginCount} plugin` : "";

  return (
    <Card
      title="Cấu hình hàng loạt"
      subtitle={`Patch ${SUPPORTED_TOOLS.length} công cụ — mỗi file có backup timestamp`}
      tone="warning"
    >
      <Box flexDirection="column" gap={1}>
        <Text color={colors.warning}>
          Claude/Codex cần wizard nâng cao — mặc định bỏ qua trong batch 11 tool.
        </Text>
        {pluginCount > 0 ? (
          <Text color={colors.info}>plugins.json có {pluginCount} entry — batch tự sync plugin.</Text>
        ) : null}

        <Menu
          groups={[
            {
              items: [
                {
                  label: `Cấu hình 11 tool${pluginHint}`,
                  value: "batch-11",
                  icon: "⚡",
                  description: "Bỏ Claude/Codex — khuyến nghị",
                },
                {
                  label: `Cấu hình cả 13 tool${pluginHint}`,
                  value: "batch-13",
                  icon: "⚙",
                  description: "Gồm Claude + Codex",
                },
                {
                  label: `Dry-run xem trước${pluginHint}`,
                  value: "dry-run-11",
                  icon: "▣",
                  description: "Không ghi file",
                },
                { label: "Quay lại menu chính", value: "back", icon: "←" },
              ],
            },
          ]}
          onSelect={onSelect}
          onBack={() => onSelect("back")}
        />
      </Box>
    </Card>
  );
};
