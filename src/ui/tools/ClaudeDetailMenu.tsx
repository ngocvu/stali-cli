import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { SpinnerLine } from "../components/LoadingCard";
import { getClaudeStatus, ClaudeStatus } from "../../services/syncers/claude";
import { formatContextDisplay } from "../ContextSelect";
import { colors, getBorderStyle, glyphs, maskPretty } from "../theme";
import { useTerminalLayout } from "../hooks/useTerminalLayout";

export type ClaudeMenuAction =
  | "apply"
  | "quick-setup"
  | "set-fable"
  | "set-opus"
  | "set-sonnet"
  | "set-haiku"
  | "set-context"
  | "reset"
  | "back";

export interface ClaudeDraftConfig {
  fable: string;
  opus: string;
  sonnet: string;
  haiku: string;
  context: string;
}

interface ClaudeDetailMenuProps {
  draftConfig: ClaudeDraftConfig;
  onDraftChange?: (newDraft: ClaudeDraftConfig) => void;
  onSelectAction: (action: ClaudeMenuAction) => void;
}

interface ModelFieldDef {
  id: "fable" | "opus" | "sonnet" | "haiku";
  label: string;
  action: ClaudeMenuAction;
}

const MODEL_FIELDS: ModelFieldDef[] = [
  { id: "fable", label: "Claude Fable", action: "set-fable" },
  { id: "opus", label: "Claude Opus", action: "set-opus" },
  { id: "sonnet", label: "Claude Sonnet", action: "set-sonnet" },
  { id: "haiku", label: "Claude Haiku", action: "set-haiku" },
];

const CONTEXT_PRESETS = ["", "198000", "298000", "498000", "998000"];

const ACTION_BUTTONS: { id: ClaudeMenuAction; label: string; color: string }[] = [
  { id: "quick-setup", label: "Quick Setup", color: "yellow" },
  { id: "apply", label: "Áp dụng", color: "green" },
  { id: "reset", label: "Reset", color: "red" },
  { id: "back", label: "Quay lại", color: "cyan" },
];

export const ClaudeDetailMenu: React.FC<ClaudeDetailMenuProps> = ({
  draftConfig,
  onDraftChange,
  onSelectAction,
}) => {
  const { narrow } = useTerminalLayout();
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // rowIndex: 0..3 (models), 4 (context), 5 (action buttons)
  const [rowIndex, setRowIndex] = useState<number>(0);
  // colIndex: for rows 0..3: 0 = input, 1 = clear X, 2 = select model button
  // for row 4: 0
  // for row 5: 0..3
  const [colIndex, setColIndex] = useState<number>(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const s = await getClaudeStatus();
      setClaudeStatus(s);
      setLoading(false);
    }
    load();
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onSelectAction("back");
      return;
    }

    const inText = rowIndex < 4 && colIndex === 0;
    if (!inText && (input === "j" || input === "k")) {
      if (input === "k") {
        setRowIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 5;
          if (next === 5) setColIndex(0);
          else if (colIndex > 2) setColIndex(0);
          return next;
        });
      } else {
        setRowIndex((prev) => {
          const next = prev < 5 ? prev + 1 : 0;
          if (next === 5) setColIndex(0);
          else if (colIndex > 2) setColIndex(0);
          return next;
        });
      }
      return;
    }

    // Up / Down arrow moves between rows 0..5
    if (key.upArrow) {
      setRowIndex((prev) => {
        const next = prev > 0 ? prev - 1 : 5;
        if (next === 5) setColIndex(0);
        else if (colIndex > 2) setColIndex(0);
        return next;
      });
      return;
    }

    if (key.downArrow) {
      setRowIndex((prev) => {
        const next = prev < 5 ? prev + 1 : 0;
        if (next === 5) setColIndex(0);
        else if (colIndex > 2) setColIndex(0);
        return next;
      });
      return;
    }

    // Tab key cycles forward
    if (key.tab) {
      if (rowIndex < 4) {
        if (colIndex === 0) {
          setColIndex(2);
        } else {
          setColIndex(0);
          setRowIndex((r) => r + 1);
        }
      } else if (rowIndex === 4) {
        setRowIndex(5);
        setColIndex(0);
      } else {
        if (colIndex < ACTION_BUTTONS.length - 1) {
          setColIndex((c) => c + 1);
        } else {
          setRowIndex(0);
          setColIndex(0);
        }
      }
      return;
    }

    // Left / Right arrow navigation within current row
    if (rowIndex < 4) {
      if (key.rightArrow && colIndex < 2) {
        setColIndex((c) => c + 1);
        return;
      }
      if (key.leftArrow && colIndex > 0) {
        setColIndex((c) => c - 1);
        return;
      }
    } else if (rowIndex === 4) {
      const currIdx = CONTEXT_PRESETS.indexOf(draftConfig.context);
      if (key.rightArrow) {
        const nextIdx = currIdx < CONTEXT_PRESETS.length - 1 ? currIdx + 1 : 0;
        if (onDraftChange) {
          onDraftChange({ ...draftConfig, context: CONTEXT_PRESETS[nextIdx] });
        }
        return;
      }
      if (key.leftArrow) {
        const nextIdx = currIdx > 0 ? currIdx - 1 : CONTEXT_PRESETS.length - 1;
        if (onDraftChange) {
          onDraftChange({ ...draftConfig, context: CONTEXT_PRESETS[nextIdx] });
        }
        return;
      }
    } else if (rowIndex === 5) {
      if (key.rightArrow) {
        setColIndex((c) => (c < ACTION_BUTTONS.length - 1 ? c + 1 : 0));
        return;
      }
      if (key.leftArrow) {
        setColIndex((c) => (c > 0 ? c - 1 : ACTION_BUTTONS.length - 1));
        return;
      }
    }

    // Enter key handling
    if (key.return) {
      if (rowIndex < 4) {
        if (colIndex === 1) {
          const fId = MODEL_FIELDS[rowIndex].id;
          if (onDraftChange) {
            onDraftChange({ ...draftConfig, [fId]: "" });
          }
        } else {
          onSelectAction(MODEL_FIELDS[rowIndex].action);
        }
      } else if (rowIndex === 4) {
        onSelectAction("set-context");
      } else if (rowIndex === 5) {
        onSelectAction(ACTION_BUTTONS[colIndex].id);
      }
    }
  });

  const handleFieldChange = (fieldId: "fable" | "opus" | "sonnet" | "haiku", val: string) => {
    if (!onDraftChange) return;
    onDraftChange({
      ...draftConfig,
      [fieldId]: val,
    });
  };

  const isConfigured = claudeStatus?.configured;

  const statusPanel = (
    <Box
      borderStyle={getBorderStyle()}
      borderColor={isConfigured ? colors.success : colors.muted}
      paddingX={1}
      paddingY={0}
      flexDirection="column"
      width={narrow ? undefined : 30}
    >
      <Text bold color={colors.warning}>
        {glyphs.info} Trạng thái
      </Text>
      {loading ? (
        <SpinnerLine message="Đang đọc…" />
      ) : (
        <Box gap={1}>
          <StatusBadge status={isConfigured ? "pass" : "warn"} />
          <Text color={isConfigured ? colors.success : colors.error}>
            {isConfigured ? "Đã kết nối Stali" : "Chưa cấu hình"}
          </Text>
        </Box>
      )}
      <Text color={colors.muted}>~/.claude/settings.json</Text>
      <Text color={colors.muted}>https://api.stali.vn</Text>
      {claudeStatus?.apiKey ? (
        <Text color={colors.muted}>{maskPretty(claudeStatus.apiKey)}</Text>
      ) : null}
    </Box>
  );

  return (
    <Card
      title="🟧 Claude Code"
      subtitle="Anthropic Claude Code CLI — model mặc định đã điền sẵn"
      borderColor="yellow"
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection={narrow ? "column" : "row"} gap={2} alignItems="stretch" marginY={0}>
          {/* CỘT TRÁI: Cụm Form Model & Nút mở rộng theo chiều ngang */}
          <Box flexDirection="column" flexGrow={1} gap={0}>
            {/* 4 Hàng Model */}
            {MODEL_FIELDS.map((field, idx) => {
              const isRowActive = rowIndex === idx;
              const isInputActive = isRowActive && colIndex === 0;
              const isClearActive = isRowActive && colIndex === 1;
              const isBtnActive = isRowActive && colIndex === 2;
              const val = draftConfig[field.id];

              return (
                <Box key={field.id} alignItems="center" marginY={0}>
                  {/* Left Label */}
                  <Box width={22} justifyContent="flex-start">
                    <Text bold color={isRowActive ? "yellow" : "white"}>
                      {isRowActive ? `${glyphs.pointer} ` : "  "}
                      {field.label}
                    </Text>
                    <Text color="gray"> →</Text>
                  </Box>

                  {/* Center Input Box: Mở rộng tự nhiên */}
                  <Box
                    flexGrow={1}
                    borderStyle={getBorderStyle()}
                    borderColor={isInputActive ? "yellow" : isRowActive ? "cyan" : "gray"}
                    paddingX={1}
                    justifyContent="space-between"
                  >
                    <Box flexGrow={1}>
                      {isInputActive ? (
                        <TextInput
                          value={val}
                          onChange={(v) => handleFieldChange(field.id, v)}
                          placeholder="provider/model-id"
                        />
                      ) : (
                        <Text
                          color={val ? "white" : "gray"}
                          wrap="truncate"
                        >
                          {val || "provider/model-id"}
                        </Text>
                      )}
                    </Box>

                    {/* Clear Button ✕ */}
                    <Text
                      bold={isClearActive}
                      color={isClearActive ? "red" : val ? "gray" : "gray"}
                      backgroundColor={isClearActive ? "white" : undefined}
                    >
                      {" "}✕{" "}
                    </Text>
                  </Box>

                  {/* Right Action Button: Select Model */}
                  <Box
                    marginLeft={1}
                    borderStyle={getBorderStyle()}
                    borderColor={isBtnActive ? "cyan" : "gray"}
                    paddingX={1}
                  >
                    <Text
                      bold={isBtnActive}
                      color={isBtnActive ? "cyan" : "white"}
                    >
                      {isBtnActive ? `${glyphs.pointer} Model` : "Model"}
                    </Text>
                  </Box>
                </Box>
              );
            })}

            {/* Hàng Context Window */}
            {(() => {
              const isRowActive = rowIndex === 4;
              const contextText = formatContextDisplay(draftConfig.context);

              return (
                <Box alignItems="center" marginY={0}>
                  {/* Left Label */}
                  <Box width={22} justifyContent="flex-start">
                    <Text bold color={isRowActive ? "yellow" : "white"}>
                      {isRowActive ? `${glyphs.pointer} ` : "  "}
                      Context window
                    </Text>
                    <Text color="gray"> →</Text>
                  </Box>

                  {/* Center Select Dropdown Box */}
                  <Box
                    flexGrow={1}
                    borderStyle={getBorderStyle()}
                    borderColor={isRowActive ? "yellow" : "gray"}
                    paddingX={1}
                    justifyContent="space-between"
                  >
                    <Text color="magenta" bold={isRowActive}>
                      {contextText}
                    </Text>
                    <Text color={isRowActive ? "yellow" : "gray"}> ⌄</Text>
                  </Box>

                  {/* Right spacer matching Select Model button width to keep input box widths aligned */}
                  <Box width={16} marginLeft={1} />
                </Box>
              );
            })()}

            {/* CỤM 4 NÚT DÀN HÀNG NGANG */}
            <Box
              justifyContent="space-between"
              marginTop={1}
              marginBottom={0}
            >
              {ACTION_BUTTONS.map((btn, bIdx) => {
                const isBtnSelected = rowIndex === 5 && colIndex === bIdx;
                return (
                  <Box
                    key={btn.id}
                    borderStyle={getBorderStyle()}
                    borderColor={isBtnSelected ? (btn.id === "apply" ? "green" : "yellow") : "gray"}
                    paddingX={1}
                  >
                    <Text
                      bold={isBtnSelected}
                      color={isBtnSelected ? (btn.id === "apply" ? "green" : "yellow") : "white"}
                    >
                      {isBtnSelected ? `${glyphs.pointer} ${btn.label}` : btn.label}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {statusPanel}
        </Box>
      </Box>
    </Card>
  );
};
