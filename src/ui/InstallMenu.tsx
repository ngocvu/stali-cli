import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";
import { VERSION } from "../version";
import { colors } from "./theme";

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
  return (
    <Card title="Cài đặt / nâng cấp" subtitle={`v${VERSION}${installMode ? ` · ${installMode}` : ""}`} tone="success">
      <Box flexDirection="column" gap={1}>
        <Text color={colors.muted}>Khuyến nghị: npm install -g stali-cli@latest</Text>
        <Menu
          groups={[
            {
              items: [
                { label: "Kiểm tra phiên bản mới", value: "check-update", icon: "▣" },
                { label: "Nâng cấp qua npm global", value: "npm-upgrade", icon: "📦", description: "Nhanh nhất" },
                {
                  label: "Bật auto-update 04:00",
                  value: "auto-update",
                  icon: "⏰",
                  description: "cron / launchd / Task Scheduler",
                },
                { label: "Hướng dẫn onboarding", value: "guide", icon: "ℹ" },
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
