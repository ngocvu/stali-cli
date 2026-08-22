import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "../components/Card";
import { maskToken } from "../../utils/token";
import { getToolById, getProtocolModelShortcuts } from "../../utils/tool-utils";
import { getToolSyncStatus } from "../../services/syncers";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type VsCodeAgentMenuAction =
  | "quick-setup"
  | "set-model"
  | "apply"
  | "reset"
  | "back"
  | `use-model:${string}`;

interface VsCodeAgentDetailMenuProps {
  toolId: string;
  model: string;
  apiKey: string;
  onSelectAction: (action: VsCodeAgentMenuAction) => void;
}

/** Menu wizard cho Cline / Roo / Kilo (VS Code agent JSON). */
export const VsCodeAgentDetailMenu: React.FC<VsCodeAgentDetailMenuProps> = ({
  toolId,
  model,
  apiKey,
  onSelectAction,
}) => {
  const tool = getToolById(toolId);
  const toolName = tool?.name || toolId;
  const configFile = tool?.configFile || "~/.vscode/settings.json";
  const [status, setStatus] = useState<ToolSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const sync = await getToolSyncStatus(toolId);
      if (!active) return;
      setStatus(sync);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [toolId]);

  const shortcuts = getProtocolModelShortcuts(toolId);

  const items: { label: string; value: VsCodeAgentMenuAction }[] = [
    { label: "⚡ Quick setup (model mặc định)", value: "quick-setup" },
    ...shortcuts.map((m) => ({
      label: `🎯 Dùng model: ${m}`,
      value: `use-model:${m}` as VsCodeAgentMenuAction,
    })),
    { label: "🤖 Chọn model khác (danh sách API)", value: "set-model" },
    { label: "✅ Xem trước & Áp dụng cấu hình", value: "apply" },
    { label: "🔄 Khôi phục từ backup gần nhất", value: "reset" },
    { label: "⬅️  Quay lại danh sách ứng dụng", value: "back" },
  ];

  const statusLine = loading
    ? "Đang kiểm tra..."
    : status?.configured
    ? `✅ Đã trỏ Stali${status.model ? ` · ${status.model}` : ""}`
    : "○ Chưa cấu hình Stali";

  return (
    <Card
      title={`${tool?.icon || "🧩"} CẤU HÌNH ${toolName.toUpperCase()}`}
      borderColor="green"
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          Token: <Text color="yellow">{maskToken(apiKey)}</Text>
        </Text>
        <Text>
          Model chọn: <Text color="green" bold>{model}</Text>
        </Text>
        <Text color={status?.configured ? "green" : "yellow"}>{statusLine}</Text>
        {status?.endpoint ? (
          <Text color="gray">
            Base URL: <Text color="white">{status.endpoint}</Text>
          </Text>
        ) : null}
        <Text color="gray">
          Provider: <Text color="cyan">anthropic</Text>
          {" · "}
          File: <Text color="white">{configFile}</Text>
        </Text>
        <Text color="gray">
          Patch: apiProvider, anthropicApiKey, anthropicBaseUrl, anthropicModelId
        </Text>

        <SelectInput items={items} onSelect={(item) => onSelectAction(item.value)} />

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn</Text>
        </Box>
      </Box>
    </Card>
  );
};
