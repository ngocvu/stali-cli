import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import { ToolHealthStatus } from "../services/syncers";

interface DoctorViewProps {
  statuses: ToolHealthStatus[];
  onBack: () => void;
  onFixAll?: () => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  statuses,
  onBack,
  onFixAll,
}) => {
  const configured = statuses.filter((s) => s.configuredForStali);
  const missing = statuses.filter((s) => !s.configuredForStali);

  const items: { label: string; value: string }[] = [];
  if (missing.length > 0 && onFixAll) {
    items.push({
      label: `🔧 Sửa ${missing.length} tool chưa trỏ Stali (doctor fix)`,
      value: "fix-all",
    });
  }
  items.push({ label: "⬅️  Quay lại Menu chính", value: "back" });

  return (
    <Card title="🩺 STALI DOCTOR — KIỂM TRA CẤU HÌNH" borderColor="yellow">
      <Box flexDirection="column" gap={1}>
        <Text bold color="green">
          ✅ Đã trỏ Stali API ({configured.length}/{statuses.length})
        </Text>
        {configured.map((s) => (
          <Box key={s.toolId} flexDirection="column" marginBottom={0}>
            <Text color="green">
              • {s.toolName}
              {s.model ? ` — ${s.model}` : ""}
            </Text>
            {s.endpoint ? (
              <Text color="gray">  ↳ {s.endpoint}</Text>
            ) : null}
            <Text color="gray">  ↳ {s.configPath}</Text>
          </Box>
        ))}

        <Text bold color="yellow">
          ⚠️ Chưa cấu hình ({missing.length})
        </Text>
        {missing.map((s) => (
          <Text key={s.toolId} color="gray">
            • {s.toolName} —{" "}
            {s.exists ? "file có, chưa trỏ Stali" : "chưa có file"} — {s.configPath}
          </Text>
        ))}

        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "fix-all" && onFixAll) onFixAll();
            else onBack();
          }}
        />
      </Box>
    </Card>
  );
};
