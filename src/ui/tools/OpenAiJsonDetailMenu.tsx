import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "../components/Card";
import { maskToken } from "../../utils/token";
import { getToolById, getProtocolModelShortcuts } from "../../utils/tool-utils";
import { getToolSyncStatus } from "../../services/syncers";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type OpenAiJsonMenuAction =
  | "quick-setup"
  | "set-model"
  | "apply"
  | "reset"
  | "back"
  | `use-model:${string}`;

const PATCH_HINT: Record<string, string> = {
  droid: "provider.type=openai, provider.baseUrl + apiKey, model",
  cowork: "openai.baseUrl + apiKey + model, defaultModel",
};

/** Menu wizard cho Droid CLI, Cowork (OpenAI JSON provider). */
export const OpenAiJsonDetailMenu: React.FC<{
  toolId: string;
  model: string;
  apiKey: string;
  onSelectAction: (action: OpenAiJsonMenuAction) => void;
}> = ({ toolId, model, apiKey, onSelectAction }) => {
  const tool = getToolById(toolId);
  const toolName = tool?.name || toolId;
  const configFile = tool?.configFile || "~/.config.json";
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

  const items: { label: string; value: OpenAiJsonMenuAction }[] = [
    { label: "⚡ Quick setup (model mặc định)", value: "quick-setup" },
    ...shortcuts.map((m) => ({
      label: `🎯 Dùng model: ${m}`,
      value: `use-model:${m}` as OpenAiJsonMenuAction,
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
      title={`${tool?.icon || "🔧"} CẤU HÌNH ${toolName.toUpperCase()}`}
      borderColor="cyan"
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
          Giao thức: <Text color="cyan">openai (JSON)</Text>
          {" · "}
          File: <Text color="white">{configFile}</Text>
        </Text>
        <Text color="gray">Patch: {PATCH_HINT[toolId] || "openai provider + model"}</Text>

        <SelectInput items={items} onSelect={(item) => onSelectAction(item.value)} />

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn</Text>
        </Box>
      </Box>
    </Card>
  );
};
