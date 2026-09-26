import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu, type MenuItem } from "./components/Menu";
import { SUPPORTED_TOOLS } from "../constants/tools";
import { glyphs } from "./theme";

interface AppSelectProps {
  onSelect: (toolId: string) => void;
}

export const AppSelect: React.FC<AppSelectProps> = ({ onSelect }) => {
  const items: MenuItem<string>[] = [
    ...SUPPORTED_TOOLS.map((tool) => ({
      label: tool.name,
      value: tool.id,
      icon: tool.icon,
      description: tool.description,
      hint: tool.defaultModel,
    })),
    { label: "Quay lại menu chính", value: "back", icon: "←" },
  ];

  return (
    <Card
      title={`${glyphs.pointer} Chọn ứng dụng`}
      subtitle={`${SUPPORTED_TOOLS.length} công cụ — model mặc định hiện bên phải`}
    >
      <Box flexDirection="column" gap={1}>
        <Text color="gray">Chọn một app để cấu hình Stali API. Wizard điền sẵn model phù hợp.</Text>
        <Menu
          groups={[{ items }]}
          onSelect={onSelect}
          onBack={() => onSelect("back")}
        />
      </Box>
    </Card>
  );
};
