import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { SpinnerLine } from "../components/LoadingCard";
import { getCodexStatus, CodexStatus } from "../../services/syncers/codex";
import { colors, getBorderStyle, glyphs, maskPretty } from "../theme";
import { useTerminalLayout } from "../hooks/useTerminalLayout";

export type CodexMenuAction =
  | "apply"
  | "quick-setup"
  | "set-model"
  | "set-subagent"
  | "reset"
  | "back";

export interface CodexDraftConfig {
  model: string;
  subagentModel: string;
}

interface CodexDetailMenuProps {
  draftConfig: CodexDraftConfig;
  onDraftChange?: (newDraft: CodexDraftConfig) => void;
  onSelectAction: (action: CodexMenuAction) => void;
}

interface CodexFieldDef {
  id: "model" | "subagentModel";
  label: string;
  action: CodexMenuAction;
  placeholder: string;
}

const CODEX_FIELDS: CodexFieldDef[] = [
  {
    id: "model",
    label: "Model",
    action: "set-model",
    placeholder: "provider/model-id (vd: req/gpt-5.6-sol)",
  },
  {
    id: "subagentModel",
    label: "Subagent Model",
    action: "set-subagent",
    placeholder: "provider/model-id (mặc định lấy theo Model chính)",
  },
];

const ACTION_BUTTONS: { id: CodexMenuAction; label: string; color: string }[] = [
  { id: "quick-setup", label: "Quick Setup", color: "yellow" },
  { id: "apply", label: "Áp dụng", color: "green" },
  { id: "reset", label: "Reset", color: "red" },
  { id: "back", label: "Quay lại", color: "cyan" },
];

export const CodexDetailMenu: React.FC<CodexDetailMenuProps> = ({
  draftConfig,
  onDraftChange,
  onSelectAction,
}) => {
  const { narrow } = useTerminalLayout();
  const [codexStatus, setCodexStatus] = useState<CodexStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // rowIndex: 0 (Model), 1 (Subagent Model), 2 (Action buttons row)
  const [rowIndex, setRowIndex] = useState<number>(0);
  // colIndex: for rows 0..1: 0 = input, 1 = clear X, 2 = select model button
  // for row 2 (action buttons): 0..3
  const [colIndex, setColIndex] = useState<number>(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const s = await getCodexStatus();
      setCodexStatus(s);
      setLoading(false);
    }
    load();
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onSelectAction("back");
      return;
    }

    const inText = rowIndex < 2 && colIndex === 0;
    if (!inText && (input === "j" || input === "k")) {
      if (input === "k") {
        setRowIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 2;
          if (next === 2) setColIndex(0);
          else if (colIndex > 2) setColIndex(0);
          return next;
        });
      } else {
        setRowIndex((prev) => {
          const next = prev < 2 ? prev + 1 : 0;
          if (next === 2) setColIndex(0);
          else if (colIndex > 2) setColIndex(0);
          return next;
        });
      }
      return;
    }

    // Up / Down arrow moves between rows 0..2
    if (key.upArrow) {
      setRowIndex((prev) => {
        const next = prev > 0 ? prev - 1 : 2;
        if (next === 2) setColIndex(0);
        else if (colIndex > 2) setColIndex(0);
        return next;
      });
      return;
    }

    if (key.downArrow) {
      setRowIndex((prev) => {
        const next = prev < 2 ? prev + 1 : 0;
        if (next === 2) setColIndex(0);
        else if (colIndex > 2) setColIndex(0);
        return next;
      });
      return;
    }

    // Tab key cycles forward
    if (key.tab) {
      if (rowIndex < 2) {
        if (colIndex === 0) {
          setColIndex(2);
        } else {
          setColIndex(0);
          setRowIndex((r) => r + 1);
        }
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
    if (rowIndex < 2) {
      if (key.rightArrow && colIndex < 2) {
        setColIndex((c) => c + 1);
        return;
      }
      if (key.leftArrow && colIndex > 0) {
        setColIndex((c) => c - 1);
        return;
      }
    } else if (rowIndex === 2) {
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
      if (rowIndex < 2) {
        if (colIndex === 1) {
          const fId = CODEX_FIELDS[rowIndex].id;
          if (onDraftChange) {
            onDraftChange({ ...draftConfig, [fId]: "" });
          }
        } else {
          onSelectAction(CODEX_FIELDS[rowIndex].action);
        }
      } else if (rowIndex === 2) {
        onSelectAction(ACTION_BUTTONS[colIndex].id);
      }
    }
  });

  const handleFieldChange = (fieldId: "model" | "subagentModel", val: string) => {
    if (!onDraftChange) return;
    onDraftChange({
      ...draftConfig,
      [fieldId]: val,
    });
  };

  const isConfigured = codexStatus?.configured;

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
      <Text color={colors.muted}>~/.codex/config.toml</Text>
      <Text color={colors.muted}>~/.codex/auth.json</Text>
      <Text color={colors.muted}>https://api.stali.vn/v1</Text>
      {codexStatus?.apiKey ? (
        <Text color={colors.muted}>{maskPretty(codexStatus.apiKey)}</Text>
      ) : null}
    </Box>
  );

  return (
    <Card
      title="🟦 Codex CLI"
      subtitle="OpenAI Codex — model mặc định đã điền sẵn"
      borderColor="cyan"
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection={narrow ? "column" : "row"} gap={2} alignItems="stretch" marginY={0}>
          {/* CỘT TRÁI: Cụm Form Model & Nút mở rộng theo chiều ngang */}
          <Box flexDirection="column" flexGrow={1} gap={0}>
            {CODEX_FIELDS.map((field, idx) => {
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

                  {/* Center Input Box */}
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
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <Text
                          color={val ? "white" : "gray"}
                          wrap="truncate"
                        >
                          {val || field.placeholder}
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

            {/* CỤM 4 NÚT DÀN HÀNG NGANG */}
            <Box
              justifyContent="space-between"
              marginTop={1}
              marginBottom={0}
            >
              {ACTION_BUTTONS.map((btn, bIdx) => {
                const isBtnSelected = rowIndex === 2 && colIndex === bIdx;
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
