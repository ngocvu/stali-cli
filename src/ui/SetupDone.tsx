import React from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { Card } from "./components/Card";
import { SyncerResult } from "../types";

interface SetupDoneProps {
  results: SyncerResult[];
  model: string;
  onMenu: () => void;
  onExit: () => void;
}

export const SetupDone: React.FC<SetupDoneProps> = ({
  results,
  model,
  onMenu,
  onExit,
}) => {
  useInput((input, key) => {
    if (input === "q" || input === "Q" || key.escape) {
      onExit();
    }
  });

  const isReset = model === "Default";

  const commandMap: Record<string, string> = {
    claude: "claude",
    codex: "codex",
    openclaw: "openclaw",
    "deepseek-tui": "deepseek",
    qwen: "qwen",
    opencode: "opencode",
    kilo: "kilo",
    droid: "droid",
    cline: "code",
    roo: "code",
    "grok-build": "grok",
    cowork: "cowork",
    jcode: "jcode",
  };

  const successfulTools = results.filter((r) => r.success);
  const commands = successfulTools.map((t) => commandMap[t.toolId] || t.toolId);
  const uniqueCommands = Array.from(new Set(commands));

  const actionItems = [
    { label: "⬅️  Quay lại Menu chính", value: "menu" },
    { label: "❌  Thoát CLI", value: "exit" },
  ];

  const handleActionSelect = (item: { value: string }) => {
    if (item.value === "menu") {
      onMenu();
    } else {
      onExit();
    }
  };

  return (
    <Card
      title={isReset ? "🔄 RESET THÀNH CÔNG!" : "🎉 CÀI ĐẶT THÀNH CÔNG!"}
      borderColor="green"
    >
      <Box flexDirection="column" gap={1}>
        <Text bold color="green">
          {isReset
            ? "✅ Đã khôi phục cài đặt gốc thành công!"
            : "✅ Đã hoàn tất cài đặt Stali API cho công cụ của bạn!"}
        </Text>

        {!isReset && (
          <Box flexDirection="column" marginY={0}>
            <Text bold color="yellow">
              🤖 Model / Cấu hình: <Text color="white">{model}</Text>
            </Text>
            <Text bold color="cyan">
              📁 File cấu hình Stali: <Text color="white">~/.stali/config.json</Text>
            </Text>
          </Box>
        )}

        <Box flexDirection="column">
          <Text bold color="magenta">Chi tiết các file đã patch an toàn:</Text>
          {results.map((res, i) => (
            <Box key={i} flexDirection="column" marginLeft={1} marginY={0}>
              <Text color="green">
                • {res.toolName}: <Text color="white">{res.configPath}</Text>
              </Text>
              {res.backupPath && (
                <Box marginLeft={2}>
                  <Text color="gray">↳ Bản sao lưu timestamp: {res.backupPath}</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        <Box borderStyle="single" borderColor="green" paddingX={1} marginTop={1} flexDirection="column">
          <Text bold color="yellow">
            🚀 Hướng dẫn khởi chạy:
          </Text>
          <Text color="white">
            Mở terminal mới và gõ lệnh:{" "}
            {uniqueCommands.length > 0 ? (
              uniqueCommands.map((cmd, idx) => (
                <React.Fragment key={cmd}>
                  {idx > 0 && <Text color="white"> hoặc </Text>}
                  <Text bold color="cyan">{cmd}</Text>
                </React.Fragment>
              ))
            ) : (
              <Text bold color="cyan">claude</Text>
            )}{" "}
            để bắt đầu sử dụng ngay!
          </Text>
        </Box>

        <Box flexDirection="column" marginTop={1} gap={1}>
          <Text color="gray">
            Dùng phím mũi tên [ ↑ ] [ ↓ ] và nhấn [ Enter ] để chọn hoặc nhấn [ Q ] / [ Esc ] để Thoát:
          </Text>
          <SelectInput items={actionItems} onSelect={handleActionSelect} />
        </Box>
      </Box>
    </Card>
  );
};
