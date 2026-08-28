import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";

export type GatewayMenuAction = "plan" | "auto" | "install" | "back";

interface GatewayMenuProps {
  summary?: {
    installed: number;
    configured: number;
    pending: number;
    targets: number;
  };
  onSelect: (action: GatewayMenuAction) => void;
}

export const GatewayMenu: React.FC<GatewayMenuProps> = ({ summary, onSelect }) => {
  const items = [
    { label: "⚡ Quét & cài gateway tự động", value: "auto" as const },
    { label: "📋 Xem kế hoạch cài (gateway plan)", value: "plan" as const },
    { label: "🌐 Cài gateway vào app đã phát hiện", value: "install" as const },
    { label: "⬅️  Quay lại Menu chính", value: "back" as const },
  ];

  return (
    <Card title="🌐 STALI GATEWAY" borderColor="cyan">
      <Box flexDirection="column" gap={1}>
        {summary ? (
          <Text color="gray">
            Phát hiện {summary.installed} app · {summary.configured} đã gateway ·{" "}
            {summary.targets} sẽ cài
          </Text>
        ) : (
          <Text color="gray">Quét app AI (Claude, Cursor, VS Code, …) và trỏ Stali API</Text>
        )}
        <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 CLI: stali gw auto | stali gw plan --json</Text>
        </Box>
      </Box>
    </Card>
  );
};
