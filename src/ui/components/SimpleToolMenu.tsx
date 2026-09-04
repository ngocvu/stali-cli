import React from "react";
import { Box, Text } from "ink";
import { Card } from "./Card";
import { Menu, type MenuItem } from "./Menu";
import { StatusBadge } from "./StatusBadge";
import { SpinnerLine } from "./LoadingCard";
import { colors, maskPretty } from "../theme";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type SimpleToolAction =
  | "quick-setup"
  | "set-model"
  | "apply"
  | "reset"
  | "back"
  | `use-model:${string}`;

export interface SimpleToolMenuProps {
  title: string;
  subtitle?: string;
  borderColor?: string;
  apiKey: string;
  model: string;
  status: ToolSyncStatus | null;
  loading: boolean;
  file: string;
  protocol?: string;
  patchHint?: string;
  extraLines?: string[];
  shortcuts: string[];
  quickSetupLabel?: string;
  endpointLabel?: string;
  onSelectAction: (action: SimpleToolAction) => void;
}

export const SimpleToolMenu: React.FC<SimpleToolMenuProps> = ({
  title,
  subtitle,
  borderColor = "cyan",
  apiKey,
  model,
  status,
  loading,
  file,
  protocol,
  patchHint,
  extraLines,
  shortcuts,
  quickSetupLabel = "Quick setup (model mặc định)",
  endpointLabel = "Endpoint",
  onSelectAction,
}) => {
  const items: MenuItem<SimpleToolAction>[] = [
    { label: quickSetupLabel, value: "quick-setup", icon: "⚡" },
    ...shortcuts.map((m) => ({
      label: `Dùng model: ${m}`,
      value: `use-model:${m}` as SimpleToolAction,
      icon: "🎯",
    })),
    { label: "Chọn model khác (danh sách API)", value: "set-model", icon: "🤖" },
    { label: "Xem trước & áp dụng", value: "apply", icon: "✔" },
    { label: "Khôi phục backup gần nhất", value: "reset", icon: "↺" },
    { label: "Quay lại danh sách ứng dụng", value: "back", icon: "←" },
  ];

  return (
    <Card title={title} subtitle={subtitle} borderColor={borderColor}>
      <Box flexDirection="column" gap={1}>
        {loading ? (
          <SpinnerLine message="Đang kiểm tra trạng thái…" />
        ) : (
          <Box gap={1}>
            <StatusBadge status={status?.configured ? "pass" : "warn"} />
            <Text color={status?.configured ? colors.success : colors.warning}>
              {status?.configured
                ? `Đã trỏ Stali${status.model ? ` · ${status.model}` : ""}`
                : "Chưa cấu hình Stali"}
            </Text>
          </Box>
        )}

        <Box flexDirection="column">
          <Text color={colors.muted}>
            Token  {maskPretty(apiKey) || "—"}
          </Text>
          <Text>
            Model  <Text color={colors.success} bold>{model}</Text>
          </Text>
          {status?.endpoint ? (
            <Text color={colors.muted}>
              {endpointLabel}  <Text color={colors.text}>{status.endpoint}</Text>
            </Text>
          ) : null}
          <Text color={colors.muted}>
            {protocol ? `${protocol} · ` : ""}
            {file}
          </Text>
          {patchHint ? <Text color={colors.muted}>{patchHint}</Text> : null}
          {extraLines?.map((line) => (
            <Text key={line} color={colors.muted}>
              {line}
            </Text>
          ))}
        </Box>

        <Menu
          groups={[{ items }]}
          onSelect={onSelectAction}
          onBack={() => onSelectAction("back")}
        />
      </Box>
    </Card>
  );
};
