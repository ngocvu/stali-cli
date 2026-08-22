import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "../components/Card";
import { maskToken } from "../../utils/token";
import { getOpenClawStatus } from "../../services/syncers/openclaw";
import { getProtocolModelShortcuts } from "../../utils/tool-utils";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type OpenClawMenuAction =
  | "quick-setup"
  | "set-model"
  | "apply"
  | "reset"
  | "back"
  | `use-model:${string}`;

interface OpenClawDetailMenuProps {
  model: string;
  apiKey: string;
  onSelectAction: (action: OpenClawMenuAction) => void;
}

export const OpenClawDetailMenu: React.FC<OpenClawDetailMenuProps> = ({
  model,
  apiKey,
  onSelectAction,
}) => {
  const [status, setStatus] = useState<ToolSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const s = await getOpenClawStatus();
      if (!active) return;
      setStatus({
        configured: s.configured,
        endpoint: s.endpoint,
        model: s.model,
        apiKeyPresent: s.apiKeyPresent,
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const shortcuts = getProtocolModelShortcuts("openclaw");

  const items: { label: string; value: OpenClawMenuAction }[] = [
    { label: "⚡ Quick setup (claude-fable-5)", value: "quick-setup" },
    ...shortcuts.map((m) => ({
      label: `🎯 Dùng model: ${m}`,
      value: `use-model:${m}` as OpenClawMenuAction,
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
    <Card title="🐾 CẤU HÌNH OPENCLAW" borderColor="yellow">
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
            Endpoint: <Text color="white">{status.endpoint}</Text>
          </Text>
        ) : null}
        <Text color="gray">
          Giao thức: <Text color="cyan">anthropic</Text>
          {" · "}
          File: <Text color="white">~/.openclaw/config.json</Text>
        </Text>
        <Text color="gray">
          OpenClaw dùng ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL (giống Claude Code).
        </Text>

        <SelectInput items={items} onSelect={(item) => onSelectAction(item.value)} />

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">💡 [ ↑ ][ ↓ ] Di chuyển | [ Enter ] Chọn</Text>
        </Box>
      </Box>
    </Card>
  );
};
