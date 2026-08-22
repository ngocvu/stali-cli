import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { StaliModel } from "../types";
import { Card } from "./components/Card";
import { formatPricingSummary, formatTokens } from "../utils/format";

interface PriceTableProps {
  models: StaliModel[];
  onContinue: () => void;
}

const PAGE_SIZE = 5;

export const PriceTable: React.FC<PriceTableProps> = ({ models, onContinue }) => {
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(0);

  const filteredModels = models.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.id.toLowerCase().includes(q) ||
      m.display_name.toLowerCase().includes(q) ||
      m.supported_endpoint_types.some((ep) => ep.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE));

  useInput((input, key) => {
    if (key.escape) {
      onContinue();
    } else if (key.downArrow || key.pageDown || (key.tab && !key.shift)) {
      setPage((prev) => (prev + 1 < totalPages ? prev + 1 : 0));
    } else if (key.upArrow || key.pageUp || (key.tab && key.shift)) {
      setPage((prev) => (prev - 1 >= 0 ? prev - 1 : totalPages - 1));
    }
  });

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setPage(0);
  };

  const startIndex = page * PAGE_SIZE;
  const displayList = filteredModels.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <Card
      title={`📊 BẢNG GIÁ & DANH SÁCH MODEL STALI API (${models.length} models)`}
      borderColor="green"
    >
      <Box flexDirection="column" gap={1}>
        {/* Search input box */}
        <Box borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text color="yellow" bold>🔍 Tìm kiếm: </Text>
          <TextInput
            value={query}
            onChange={handleQueryChange}
            onSubmit={onContinue}
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
            <Text bold color="cyan">Tên Model / Mã ID</Text>
          </Box>
          <Box width="23%">
            <Text bold color="yellow">Giá Token / Lượt</Text>
          </Box>
          <Box width="11%">
            <Text bold color="magenta">Context</Text>
          </Box>
          <Box width="14%">
            <Text bold color="green">Giao thức</Text>
          </Box>
        </Box>

        {/* Table Body (5 items) */}
        {displayList.length > 0 ? (
          displayList.map((model) => (
            <Box key={model.id} justifyContent="space-between" paddingX={1}>
              <Box width="52%">
                <Text bold color="white">{model.display_name} </Text>
                <Text color="gray">({model.id})</Text>
              </Box>
              <Box width="23%">
                <Text color="yellow">
                  {formatPricingSummary(model.billing_unit, model.pricing)}
                </Text>
              </Box>
              <Box width="11%">
                <Text color="magenta">{formatTokens(model.context_window)}</Text>
              </Box>
              <Box width="14%">
                <Text color="green">
                  {model.supported_endpoint_types.join(", ")}
                </Text>
              </Box>
            </Box>
          ))
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
            Trang <Text bold color="yellow">{totalPages === 0 ? 0 : page + 1}/{totalPages}</Text> (Hiển thị {filteredModels.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, filteredModels.length)} / {filteredModels.length} kết quả)
          </Text>
          <Text color="cyan" bold>
            [ ↑ ] [ ↓ ] Lật trang | [ Enter ] / [ Esc ] Về Menu
          </Text>
        </Box>
      </Box>
    </Card>
  );
};
