import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { StaliModel } from "../types";
import { Card } from "./components/Card";
import { formatPricingSummary, formatTokens } from "../utils/format";
import { isAnthropicTool } from "../utils/tool-utils";

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
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Filter compatible models based on tool protocol
  const protocolFiltered = models.filter((m) => {
    if (isAnthropicTool(toolId)) {
      return m.supported_endpoint_types.includes("anthropic");
    }
    return m.supported_endpoint_types.includes("openai");
  });

  const baseModels = protocolFiltered.length > 0 ? protocolFiltered : models;

  // Filter by search query
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

    // Up / Down arrow for moving row selection
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
    if (toolId === "claude") {
      switch (tier) {
        case "fable":
          return `🟧 CHỌN MODEL CHO CLAUDE FABLE (${filteredModels.length} models)`;
        case "opus":
          return `🟧 CHỌN MODEL CHO CLAUDE OPUS (${filteredModels.length} models)`;
        case "sonnet":
          return `🟧 CHỌN MODEL CHO CLAUDE SONNET (${filteredModels.length} models)`;
        case "haiku":
          return `🟧 CHỌN MODEL CHO CLAUDE HAIKU (${filteredModels.length} models)`;
        default:
          return `🟧 QUICK SETUP - CHỌN 1 MODEL CHO TẤT CẢ CLAUDE TIERS (${filteredModels.length} models)`;
      }
    }
    return `🤖 CHỌN MODEL CHO ỨNG DỤNG (${filteredModels.length} models)`;
  };

  const getBorderColor = () => {
    return toolId === "claude" ? "yellow" : "cyan";
  };

  return (
    <Card title={getTitle()} borderColor={getBorderColor()}>
      <Box flexDirection="column" gap={1}>
        {/* Search input box */}
        <Box borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text color="yellow" bold>
            🔍 Tìm kiếm:{" "}
          </Text>
          <TextInput
            value={query}
            onChange={handleQueryChange}
            placeholder="Nhập tên hoặc mã model (vd: claude, gpt, deepseek, ...)"
          />
        </Box>

        {/* Table Header */}
        <Box
          justifyContent="space-between"
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <Box width="52%">
            <Text bold color="cyan">
              Tên Model / Mã ID
            </Text>
          </Box>
          <Box width="23%">
            <Text bold color="yellow">
              Giá Token / Lượt
            </Text>
          </Box>
          <Box width="11%">
            <Text bold color="magenta">
              Context
            </Text>
          </Box>
          <Box width="14%">
            <Text bold color="green">
              Giao thức
            </Text>
          </Box>
        </Box>

        {/* Table Body (5 items) */}
        {displayList.length > 0 ? (
          displayList.map((model, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Box key={model.id} justifyContent="space-between" paddingX={1}>
                <Box width="52%">
                  <Text color={isSelected ? "cyan" : "gray"} bold={isSelected}>
                    {isSelected ? "👉 " : "   "}
                  </Text>
                  <Text bold={isSelected} color={isSelected ? "cyan" : "white"}>
                    {model.display_name}{" "}
                  </Text>
                  <Text color={isSelected ? "cyan" : "gray"}>({model.id})</Text>
                </Box>
                <Box width="23%">
                  <Text bold={isSelected} color="yellow">
                    {formatPricingSummary(model.billing_unit, model.pricing)}
                  </Text>
                </Box>
                <Box width="11%">
                  <Text bold={isSelected} color="magenta">
                    {formatTokens(model.context_window)}
                  </Text>
                </Box>
                <Box width="14%">
                  <Text bold={isSelected} color="green">
                    {model.supported_endpoint_types.join(", ")}
                  </Text>
                </Box>
              </Box>
            );
          })
        ) : (
          <Box justifyContent="center" paddingY={1}>
            <Text color="red">Không tìm thấy model nào khớp với "{query}"</Text>
          </Box>
        )}

        {/* Footer controls & pagination */}
        <Box
          marginTop={1}
          borderStyle="single"
          borderColor="cyan"
          paddingX={1}
          justifyContent="space-between"
        >
          <Text color="gray">
            Trang{" "}
            <Text bold color="yellow">
              {totalPages === 0 ? 0 : currentPage + 1}/{totalPages}
            </Text>{" "}
            (Hiển thị {filteredModels.length === 0 ? 0 : startIndex + 1} -{" "}
            {Math.min(startIndex + PAGE_SIZE, filteredModels.length)} /{" "}
            {filteredModels.length} kết quả)
          </Text>
          <Text color="cyan" bold>
            [ ↑ ][ ↓ ] Chọn | [ ← ][ → ] Trang | [ M ] Nhập thủ công | [ Enter ] Chọn | [ Esc ] Quay lại
          </Text>
        </Box>
      </Box>
    </Card>
  );
};
