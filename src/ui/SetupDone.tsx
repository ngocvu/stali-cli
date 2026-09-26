import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu } from "./components/Menu";
import { StatusBadge } from "./components/StatusBadge";
import { SyncerResult } from "../types";
import { ONBOARDING_DOC_URL } from "../services/user-cli";
import { colors, getBorderStyle, glyphs } from "./theme";

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
  const isReset = model === "Default";
  const ok = results.filter((r) => r.success);
  const fail = results.filter((r) => !r.success);

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

  const commands = [...new Set(ok.map((t) => commandMap[t.toolId] || t.toolId))];

  return (
    <Card
      title={isReset ? `${glyphs.check} Reset thành công` : `${glyphs.check} Hoàn tất`}
      tone={fail.length > 0 ? "warning" : "success"}
    >
      <Box flexDirection="column" gap={1}>
        <Box gap={2}>
          <StatusBadge status="pass" count={ok.length} filled />
          {fail.length > 0 ? <StatusBadge status="fail" count={fail.length} filled /> : null}
        </Box>

        {!isReset ? (
          <Box flexDirection="column">
            <Text color={colors.muted}>
              Model / cấu hình  <Text color={colors.text}>{model}</Text>
            </Text>
            <Text color={colors.muted}>File Stali  ~/.stali/config.json</Text>
          </Box>
        ) : null}

        <Box flexDirection="column">
          {results.map((res, i) => (
            <Box key={`${res.toolId}-${i}`} flexDirection="column">
              <Text color={res.success ? colors.success : colors.error}>
                {res.success ? glyphs.check : glyphs.cross} {res.toolName}
                {res.configPath ? `  ${res.configPath}` : ""}
              </Text>
              {res.backupPath ? (
                <Text color={colors.muted}>
                  {"  "}backup {res.backupPath}
                </Text>
              ) : null}
              {res.error ? <Text color={colors.error}>{"  "}{res.error}</Text> : null}
            </Box>
          ))}
        </Box>

        {commands.length > 0 ? (
          <Box
            borderStyle={getBorderStyle()}
            borderColor={colors.success}
            paddingX={1}
            flexDirection="column"
          >
            <Text color={colors.warning} bold>
              Khởi chạy
            </Text>
            <Text>
              Mở terminal mới:{" "}
              <Text color={colors.accent} bold>
                {commands.join("  |  ")}
              </Text>
            </Text>
          </Box>
        ) : null}

        <Text color={colors.muted}>Hướng dẫn: {ONBOARDING_DOC_URL}</Text>

        <Menu
          groups={[
            {
              items: [
                { label: "Về menu chính", value: "menu", icon: "←" },
                { label: "Thoát", value: "exit", icon: "×" },
              ],
            },
          ]}
          onSelect={(value) => {
            if (value === "menu") onMenu();
            else onExit();
          }}
          onBack={onMenu}
        />
      </Box>
    </Card>
  );
};
