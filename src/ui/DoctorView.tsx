import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import { ToolHealthStatus } from "../services/syncers";

interface DoctorViewProps {
  statuses: ToolHealthStatus[];
  onBack: () => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ statuses, onBack }) => {
  const configured = statuses.filter((s) => s.configuredForStali);
  const missing = statuses.filter((s) => !s.configuredForStali);

  const items = [{ label: "⬅️  Quay lại Menu chính", value: "back" }];

  return (
    <Card title="🩺 STALI DOCTOR — KIỂM TRA CẤU HÌNH" borderColor="yellow">
      <Box flexDirection="column" gap={1}>
        <Text bold color="green">
          ✅ Đã trỏ Stali API ({configured.length}/{statuses.length})
        </Text>
        {configured.map((s) => (
          <Text key={s.toolId} color="green">
            • {s.toolName} — {s.model || "OK"} ({s.configPath})
          </Text>
        ))}

        <Text bold color="yellow">
          ⚠️ Chưa cấu hình / chưa phát hiện Stali ({missing.length})
        </Text>
        {missing.map((s) => (
          <Text key={s.toolId} color="gray">
            • {s.toolName} — {s.exists ? "file có, chưa trỏ Stali" : "chưa có file"} ({s.configPath})
          </Text>
        ))}

        <SelectInput items={items} onSelect={() => onBack()} />
      </Box>
    </Card>
  );
};
