import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { StaliModel } from "../types";
import { Card } from "./components/Card";
import { formatPricingSummary, formatTokens } from "../utils/format";
import { isAnthropicTool } from "../utils/tool-utils";
import { colors, getBorderStyle, glyphs, truncate } from "./theme";
import { useTerminalLayout } from "./hooks/useTerminalLayout";

interface ModelSelectProps {
  toolId: string;
  tier?: "fable" | "opus" | "sonnet" | "haiku" | "all";
  models: StaliModel[];
  onSelect: (modelId: string) => void;
}

const PAGE_SIZE = 5;

export const ModelSelect: React.FC<ModelSelectProps> = ({
  toolId,
  tier = "all",
  models,
  onSelect,
}) => {
  const { compact, columns } = useTerminalLayout();
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const protocolFiltered = models.filter((m) => {
    if (isAnthropicTool(toolId)) {
      return m.supported_endpoint_types.includes("anthropic");
    }
    return m.supported_endpoint_types.includes("openai");
  });

  const baseModels = protocolFiltered.length > 0 ? protocolFiltered : models;

  const filteredModels = baseModels.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.id.toLowerCase().includes(q) ||
      m.display_name.toLowerCase().includes(q) ||
      m.supported_endpoint_types.some((ep) => ep.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * PAGE_SIZE;
  const displayList = filteredModels.slice(startIndex, startIndex + PAGE_SIZE);

  useInput((input, key) => {
    if (key.escape) {
      onSelect("back");
      return;
    }

    if (key.return) {
      if (displayList.length > 0 && displayList[selectedIndex]) {
        onSelect(displayList[selectedIndex].id);
      }
      return;
    }

    if (input === "m" || input === "M") {
      onSelect("__MANUAL_INPUT__");
      return;
    }

    if (key.upArrow) {
      if (selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      } else if (currentPage > 0) {
        setPage((prev) => prev - 1);
        setSelectedIndex(PAGE_SIZE - 1);
      }
    } else if (key.downArrow) {
      if (selectedIndex < displayList.length - 1) {
        setSelectedIndex((prev) => prev + 1);
      } else if (currentPage + 1 < totalPages) {
        setPage((prev) => prev + 1);
        setSelectedIndex(0);
      }
    } else if (key.leftArrow || key.pageUp) {
      setPage((prev) => Math.max(0, prev - 1));
      setSelectedIndex(0);
    } else if (key.rightArrow || key.pageDown) {
      setPage((prev) => Math.min(totalPages - 1, prev + 1));
      setSelectedIndex(0);
    }
  });

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setPage(0);
    setSelectedIndex(0);
  };

  const getTitle = () => {
    const n = filteredModels.length;
    if (toolId === "claude") {
      switch (tier) {
        case "fable":
          return `Chọn model Claude Fable (${n})`;
        case "opus":
          return `Chọn model Claude Opus (${n})`;
        case "sonnet":
          return `Chọn model Claude Sonnet (${n})`;
        case "haiku":
          return `Chọn model Claude Haiku (${n})`;
        default:
          return `Quick setup — 1 model cho mọi tier (${n})`;
      }
    }
    return `Chọn model (${n})`;
  };

  const nameW = compact ? "70%" : "48%";
  const priceW = compact ? "30%" : "24%";
  const ctxW = "12%";
  const protoW = "16%";
  const nameMax = Math.max(16, Math.floor(columns * 0.42));

  return (
    <Card title={getTitle()} borderColor={toolId === "claude" ? "yellow" : "cyan"}>
      <Box flexDirection="column" gap={1}>
        <Box borderStyle={getBorderStyle()} borderColor={colors.warning} paddingX={1}>
          <Text color={colors.warning} bold>
            {glyphs.pointer}{" "}
          </Text>
          <TextInput
            value={query}
            onChange={handleQueryChange}
            placeholder="Tìm tên hoặc mã model…"
          />
        </Box>

        {!compact ? (
          <Box justifyContent="space-between" paddingX={1}>
            <Box width={nameW}>
              <Text bold color={colors.accent}>
                Tên / ID
              </Text>
            </Box>
            <Box width={priceW}>
              <Text bold color={colors.warning}>
                Giá
              </Text>
            </Box>
            <Box width={ctxW}>
              <Text bold color="magenta">
                Context
              </Text>
            </Box>
            <Box width={protoW}>
              <Text bold color={colors.success}>
                Protocol
              </Text>
            </Box>
          </Box>
        ) : null}

        {displayList.length > 0 ? (
          displayList.map((model, idx) => {
            const isSelected = idx === selectedIndex;
            const rowColor = isSelected ? colors.accent : colors.text;
            return (
              <Box key={model.id} justifyContent="space-between" paddingX={1}>
                <Box width={nameW}>
                  <Text color={isSelected ? colors.accent : colors.muted} bold={isSelected}>
                    {isSelected ? `${glyphs.pointer} ` : "  "}
                  </Text>
                  <Text bold={isSelected} color={rowColor}>
                    {truncate(model.display_name, compact ? nameMax : 28)}{" "}
                  </Text>
                  <Text color={isSelected ? colors.accent : colors.muted}>
                    ({truncate(model.id, compact ? 18 : 22)})
                  </Text>
                </Box>
                <Box width={priceW}>
                  <Text bold={isSelected} color={colors.warning}>
                    {formatPricingSummary(model.billing_unit, model.pricing)}
                  </Text>
                </Box>
                {!compact ? (
                  <>
                    <Box width={ctxW}>
                      <Text bold={isSelected} color="magenta">
                        {formatTokens(model.context_window)}
                      </Text>
                    </Box>
                    <Box width={protoW}>
                      <Text bold={isSelected} color={colors.success}>
                        {model.supported_endpoint_types.join(", ")}
                      </Text>
                    </Box>
                  </>
                ) : null}
              </Box>
            );
          })
        ) : (
          <Box justifyContent="center" paddingY={1}>
            <Text color={colors.error}>Không tìm thấy model khớp “{query}”</Text>
          </Box>
        )}

        <Text color={colors.muted}>
          Trang {totalPages === 0 ? 0 : currentPage + 1}/{totalPages}
          {"  "}
          {filteredModels.length === 0 ? 0 : startIndex + 1}–
          {Math.min(startIndex + PAGE_SIZE, filteredModels.length)}/{filteredModels.length}
        </Text>
      </Box>
    </Card>
  );
};
