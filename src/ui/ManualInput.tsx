import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { Card } from "./components/Card";
import { colors, getBorderStyle, glyphs } from "./theme";

interface ManualInputProps {
  title: string;
  subtitle?: string;
  placeholder?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const ManualInput: React.FC<ManualInputProps> = ({
  title,
  subtitle,
  placeholder = "Nhập giá trị…",
  defaultValue = "",
  onSubmit,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <Card title={title} subtitle={subtitle} tone="warning">
      <Box flexDirection="column" gap={1}>
        {defaultValue ? (
          <Text color={colors.muted}>
            Mặc định: <Text color={colors.warning}>{defaultValue}</Text> — Enter để giữ, hoặc sửa rồi Enter
          </Text>
        ) : null}

        <Box borderStyle={getBorderStyle()} borderColor={colors.warning} paddingX={1}>
          <Text color={colors.warning} bold>
            {glyphs.pointer}{" "}
          </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={placeholder}
          />
        </Box>
      </Box>
    </Card>
  );
};
