import React from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";

interface ConfigReviewProps {
  toolName: string;
  filePath: string;
  configJson: Record<string, any>;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfigReview: React.FC<ConfigReviewProps> = ({
  toolName,
  filePath,
  configJson,
  onConfirm,
  onCancel,
}) => {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const formattedJson = JSON.stringify(configJson, null, 2);

  const items = [
    { label: "✅ Xác nhận & Ghi cài đặt vào hệ thống", value: "confirm" },
    { label: "⬅️  Quay lại chỉnh sửa thêm", value: "back" },
  ];

  const handleSelect = (item: { value: string }) => {
    if (item.value === "confirm") {
      onConfirm();
    } else {
      onCancel();
    }
  };

  return (
    <Card
      title={`🔍 XÁC NHẬN CẤU HÌNH - ${toolName.toUpperCase()}`}
      subtitle="Xem trước toàn bộ thiết lập sẽ được ghi vào file cấu hình"
      borderColor="green"
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold color="cyan">
            📁 File cấu hình đích: <Text color="white">{filePath}</Text>
          </Text>
          <Text color="gray">
            Cấu hình dưới đây sẽ được áp dụng (tự động tạo bản sao lưu timestamp dự phòng):
          </Text>
        </Box>

        {/* JSON Preview Box */}
        <Box
          borderStyle="single"
          borderColor="green"
          paddingX={1}
          paddingY={0}
          flexDirection="column"
        >
          {formattedJson.split("\n").map((line, idx) => (
            <Text key={idx} color={line.includes(":") ? "white" : "gray"}>
              {line}
            </Text>
          ))}
        </Box>

        <Box flexDirection="column" marginTop={1} gap={0}>
          <Text color="gray">
            Dùng phím mũi tên [ ↑ ] [ ↓ ] và nhấn [ Enter ] để xác nhận:
          </Text>
          <SelectInput items={items} onSelect={handleSelect} />
        </Box>
      </Box>
    </Card>
  );
};
