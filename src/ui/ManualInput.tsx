import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { Card } from "./components/Card";

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
  placeholder = "Nhập giá trị...",
  defaultValue = "",
  onSubmit,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <Card title={title} subtitle={subtitle} borderColor="yellow">
      <Box flexDirection="column" gap={1}>
        <Box borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text color="yellow" bold>
            ✍️ Nhập:{" "}
          </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={placeholder}
          />
        </Box>

        <Box justifyContent="space-between" paddingX={1}>
          <Text color="gray">
            Nhấn <Text bold color="cyan">[ Enter ]</Text> để lưu vào nháp | Nhấn <Text bold color="red">[ Esc ]</Text> để hủy
          </Text>
        </Box>
      </Box>
    </Card>
  );
};
