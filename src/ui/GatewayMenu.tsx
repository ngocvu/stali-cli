import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";
import { StatusBadge } from "./components/StatusBadge";
import { colors } from "./theme";

export type GatewayMenuAction = "plan" | "auto" | "install" | "back";

interface GatewayMenuProps {
  summary?: {
    installed: number;
    configured: number;
    pending: number;
    targets: number;
  };
  firstRun?: boolean;
  onSelect: (action: GatewayMenuAction) => void;
}

export const GatewayMenu: React.FC<GatewayMenuProps> = ({ summary, firstRun, onSelect }) => {
  return (
    <Card title="Gateway Stali" subtitle="Quét app AI đã cài và trỏ Stali API">
      <Box flexDirection="column" gap={1}>
        {firstRun ? (
          <Box gap={1}>
            <StatusBadge status="warn" />
            <Text color={colors.warning}>
              Tự động cài gateway thất bại — chọn Quét & cài hoặc xem kế hoạch.
            </Text>
          </Box>
        ) : null}

        {summary ? (
          <Box gap={2}>
            <StatusBadge status="info" label="APP" count={summary.installed} />
            <StatusBadge status="pass" count={summary.configured} />
            <StatusBadge status="warn" label="SẼ CÀI" count={summary.targets} />
          </Box>
        ) : (
          <Text color={colors.muted}>Quét Claude, Cursor, VS Code, … rồi trỏ Stali API</Text>
        )}

        <Menu
          groups={[
            {
              items: [
                { label: "Quét & cài gateway tự động", value: "auto", icon: "⚡" },
                { label: "Xem kế hoạch cài", value: "plan", icon: "▣", description: "gateway plan" },
                { label: "Cài gateway vào app đã phát hiện", value: "install", icon: "🌐" },
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
