import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu, type MenuItem } from "./components/Menu";
import { StatusBadge } from "./components/StatusBadge";
import { colors, glyphs } from "./theme";
import type { GatewayPlan } from "../services/gateway-install";

interface GatewayPlanViewProps {
  plan: GatewayPlan;
  onInstall: () => void;
  onBack: () => void;
}

export const GatewayPlanView: React.FC<GatewayPlanViewProps> = ({ plan, onInstall, onBack }) => {
  const items: MenuItem<string>[] = [
    ...(plan.targets.length > 0
      ? [{ label: `Cài ${plan.targets.length} app`, value: "install", icon: "⚡" }]
      : []),
    { label: "Quay lại Gateway", value: "back", icon: "←" },
  ];

  return (
    <Card title="Gateway plan" subtitle="Xem trước trước khi ghi config">
      <Box flexDirection="column" gap={1}>
        <Box gap={2}>
          <StatusBadge status="info" label="APP" count={plan.summary.installed} />
          <StatusBadge status="pass" count={plan.summary.configured} />
          <StatusBadge status="warn" label="SẼ CÀI" count={plan.targets.length} />
        </Box>

        {plan.targets.length > 0 ? (
          <>
            <Text bold color={colors.warning}>
              Sẽ cài gateway
            </Text>
            {plan.targets.map((id) => {
              const entry = plan.tools.find((t) => t.toolId === id);
              return (
                <Text key={id} color={colors.text}>
                  {glyphs.bullet} {entry?.toolName || id}
                  {entry ? `  ${entry.configPath}` : ""}
                </Text>
              );
            })}
          </>
        ) : (
          <Text color={colors.success}>{glyphs.check} Không có app cần cài gateway.</Text>
        )}

        {plan.skipped.length > 0 ? (
          <>
            <Text bold color={colors.muted}>
              Bỏ qua ({plan.skipped.length})
            </Text>
            {plan.skipped.slice(0, 6).map((s) => (
              <Text key={s.toolId} color={colors.muted}>
                {glyphs.bullet} {s.toolName} — {s.reason}
              </Text>
            ))}
            {plan.skipped.length > 6 ? (
              <Text color={colors.muted}>
                {glyphs.ellipsis} và {plan.skipped.length - 6} app khác
              </Text>
            ) : null}
          </>
        ) : null}

        <Menu
          groups={[{ items }]}
          onSelect={(value) => {
            if (value === "install") onInstall();
            else onBack();
          }}
          onBack={onBack}
        />
      </Box>
    </Card>
  );
};
