import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";
import { KeyValueTable } from "./components/KeyValueTable";
import { flattenConfigRows, colors, glyphs } from "./theme";

interface ConfigReviewProps {
  toolName: string;
  filePath: string;
  configJson: Record<string, unknown>;
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
  const rows = useMemo(() => {
    const head = [
      { key: "Ứng dụng", value: toolName },
      { key: "File đích", value: filePath },
    ];
    return [...head, ...flattenConfigRows(configJson)];
  }, [toolName, filePath, configJson]);

  return (
    <Card
      title={`${glyphs.check} Xác nhận cấu hình`}
      subtitle="Xem lại trước khi ghi — CLI tự tạo backup timestamp"
      tone="success"
    >
      <Box flexDirection="column" gap={1}>
        <KeyValueTable rows={rows} />

        <Text color={colors.muted}>
          Ghi đè file đích. Backup được lưu cạnh file gốc.
        </Text>

        <Menu
          groups={[
            {
              items: [
                { label: "Xác nhận & ghi cấu hình", value: "confirm", icon: glyphs.check },
                { label: "Quay lại chỉnh sửa", value: "back", icon: "←" },
              ],
            },
          ]}
          onSelect={(value) => {
            if (value === "confirm") onConfirm();
            else onCancel();
          }}
          onBack={onCancel}
        />
      </Box>
    </Card>
  );
};
