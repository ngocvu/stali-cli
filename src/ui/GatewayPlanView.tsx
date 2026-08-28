import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import type { GatewayPlan } from "../services/gateway-install";

interface GatewayPlanViewProps {
  plan: GatewayPlan;
  onInstall: () => void;
  onBack: () => void;
}

export const GatewayPlanView: React.FC<GatewayPlanViewProps> = ({ plan, onInstall, onBack }) => {
  const items = [
    ...(plan.targets.length > 0
      ? [{ label: `⚡ Cài ${plan.targets.length} app (gateway install)`, value: "install" }]
      : []),
    { label: "⬅️  Quay lại Gateway menu", value: "back" },
  ];

  return (
    <Card title="📋 GATEWAY PLAN" borderColor="cyan">
      <Box flexDirection="column" gap={1}>
        <Text color="gray">
          Phát hiện {plan.summary.installed} app · {plan.summary.configured} đã gateway ·{" "}
          {plan.targets.length} sẽ cài
        </Text>
        {plan.targets.length > 0 ? (
          <>
            <Text bold color="yellow">
              Sẽ cài gateway:
            </Text>
            {plan.targets.map((id) => {
              const entry = plan.tools.find((t) => t.toolId === id);
              return (
                <Text key={id} color="white">
                  • {entry?.toolName || id}
                  {entry ? ` — ${entry.configPath}` : ""}
                </Text>
              );
            })}
          </>
        ) : (
          <Text color="green">Không có app cần cài gateway.</Text>
        )}
        {plan.skipped.length > 0 ? (
          <>
            <Text bold color="gray">
              Bỏ qua ({plan.skipped.length}):
            </Text>
            {plan.skipped.slice(0, 6).map((s) => (
              <Text key={s.toolId} color="gray">
                • {s.toolName} — {s.reason}
              </Text>
            ))}
            {plan.skipped.length > 6 ? (
              <Text color="gray">… và {plan.skipped.length - 6} app khác</Text>
            ) : null}
          </>
        ) : null}
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "install") onInstall();
            else onBack();
          }}
        />
        <Text color="gray">CLI: stali gw plan --json</Text>
      </Box>
    </Card>
  );
};
