import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import { VERSION } from "../version";

export type InstallMenuAction =
  | "check-update"
  | "npm-upgrade"
  | "auto-update"
  | "guide"
  | "back";

interface InstallMenuProps {
  installMode?: string;
  onSelect: (action: InstallMenuAction) => void;
}

export const InstallMenu: React.FC<InstallMenuProps> = ({ installMode, onSelect }) => {
  const items = [
    { label: "🔍 Kiểm tra phiên bản mới (update --check)", value: "check-update" as const },
    { label: "📦 Nâng cấp qua npm global (nhanh nhất)", value: "npm-upgrade" as const },
    { label: "⏰ Bật auto-update 04:00 (cron / Task Scheduler)", value: "auto-update" as const },
    { label: "📋 Xem hướng dẫn cài đặt đầy đủ", value: "guide" as const },
    { label: "⬅️  Quay lại Menu chính", value: "back" as const },
  ];

  return (
    <Card title="📦 CÀI ĐẶT / NÂNG CẤP STALI-CLI" borderColor="green">
      <Box flexDirection="column" gap={1}>
        <Text color="gray">
          Hiện tại: v{VERSION}
          {installMode ? ` · ${installMode}` : ""}
        </Text>
        <Text color="gray">
          Khuyến nghị: npm install -g stali-cli@latest --no-fund --no-audit
        </Text>
        <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn</Text>
        </Box>
      </Box>
    </Card>
  );
};
