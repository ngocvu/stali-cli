import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "../components/Card";
import { maskToken } from "../../utils/token";
import { getToolById, getProtocolModelShortcuts } from "../../utils/tool-utils";
import { getToolSyncStatus } from "../../services/syncers";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type OpenAiTomlMenuAction =
  | "quick-setup"
  | "set-model"
  | "apply"
  | "reset"
  | "back"
  | `use-model:${string}`;

/** Menu wizard cho DeepSeek TUI, Grok Build, jcode (OpenAI TOML). */
export const OpenAiTomlDetailMenu: React.FC<{
  toolId: string;
  model: string;
  apiKey: string;
  onSelectAction: (action: OpenAiTomlMenuAction) => void;
}> = ({ toolId, model, apiKey, onSelectAction }) => {
  const tool = getToolById(toolId);
  const toolName = tool?.name || toolId;
  const configFile = tool?.configFile || "~/.config.toml";
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

  const items: { label: string; value: OpenAiTomlMenuAction }[] = [
    { label: "⚡ Quick setup (model mặc định)", value: "quick-setup" },
    ...shortcuts.map((m) => ({
      label: `🎯 Dùng model: ${m}`,
      value: `use-model:${m}` as OpenAiTomlMenuAction,
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
      title={`${tool?.icon || "📄"} CẤU HÌNH ${toolName.toUpperCase()}`}
      borderColor="blue"
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
          Giao thức: <Text color="cyan">openai (TOML)</Text>
          {" · "}
          File: <Text color="white">{configFile}</Text>
        </Text>
        <Text color="gray">Patch: provider, base_url, api_key, model</Text>

        <SelectInput items={items} onSelect={(item) => onSelectAction(item.value)} />

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn</Text>
        </Box>
      </Box>
    </Card>
  );
};
