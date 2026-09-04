import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";
import { StatusBadge } from "./components/StatusBadge";
import { maskPretty, colors, glyphs } from "./theme";
import { VERSION } from "../version";
import { buildMainMenuGroups, type MainMenuAction } from "./menu-groups";

export type { MainMenuAction };

interface MainMenuProps {
  apiKey?: string;
  installMode?: string;
  gatewayPending?: number;
  pendingGatewayCount?: number;
  gatewayReady?: boolean;
  advanced?: boolean;
  onSelect: (action: MainMenuAction) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  apiKey,
  installMode,
  gatewayPending,
  pendingGatewayCount,
  gatewayReady,
  advanced = false,
  onSelect,
}) => {
  const pending = pendingGatewayCount ?? 0;
  const groups = buildMainMenuGroups({
    advanced,
    gatewayPending,
    pendingGatewayCount,
  });

  return (
    <Card
      title={advanced ? `${glyphs.spark} Tùy chọn khác` : `${glyphs.spark} stali`}
      subtitle={advanced ? "Esc để quay lại menu đơn giản" : "Chọn app AI, còn lại để mặc định"}
      borderColor="cyan"
    >
      <Box flexDirection="column" gap={1}>
        {apiKey ? (
          <Text color={colors.muted}>
            Key  <Text color={colors.warning}>{maskPretty(apiKey)}</Text>
            <Text color={colors.muted}>
              {"  "}v{VERSION}
              {installMode && advanced ? ` · ${installMode}` : ""}
            </Text>
          </Text>
        ) : (
          <Text color={colors.warning}>Chưa có API key — chọn cấu hình để nhập.</Text>
        )}

        {!advanced && pending > 0 ? (
          <Box gap={1}>
            <StatusBadge status="warn" />
            <Text color={colors.warning}>{pending} app chưa trỏ Stali — chọn Cài gateway</Text>
          </Box>
        ) : null}

        {!advanced && gatewayReady && pending === 0 ? (
          <Box gap={1}>
            <StatusBadge status="pass" />
            <Text color={colors.success}>Sẵn sàng</Text>
          </Box>
        ) : null}

        <Menu
          groups={groups}
          onSelect={onSelect}
          onBack={advanced ? () => onSelect("back") : undefined}
        />
      </Box>
    </Card>
  );
};
