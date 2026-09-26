import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { StaliModel } from "../types";
import { Card } from "./components/Card";
import { formatPricingSummary, formatTokens } from "../utils/format";
import { colors, getBorderStyle, glyphs, truncate } from "./theme";
import { useTerminalLayout } from "./hooks/useTerminalLayout";

interface PriceTableProps {
  models: StaliModel[];
  onContinue: () => void;
}

const PAGE_SIZE = 5;

export const PriceTable: React.FC<PriceTableProps> = ({ models, onContinue }) => {
  const { compact, columns } = useTerminalLayout();
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

  useInput((_input, key) => {
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
  const nameMax = Math.max(16, Math.floor(columns * 0.42));

  return (
    <Card title={`Bảng giá & model (${models.length})`} tone="success">
      <Box flexDirection="column" gap={1}>
        <Box borderStyle={getBorderStyle()} borderColor={colors.warning} paddingX={1}>
          <Text color={colors.warning} bold>
            {glyphs.pointer}{" "}
          </Text>
          <TextInput
            value={query}
            onChange={handleQueryChange}
            onSubmit={onContinue}
            placeholder="Tìm tên hoặc mã model…"
          />
        </Box>

        {!compact ? (
          <Box justifyContent="space-between" paddingX={1}>
            <Box width="48%">
              <Text bold color={colors.accent}>
                Tên / ID
              </Text>
            </Box>
            <Box width="24%">
              <Text bold color={colors.warning}>
                Giá
              </Text>
            </Box>
            <Box width="12%">
              <Text bold color="magenta">
                Context
              </Text>
            </Box>
            <Box width="16%">
              <Text bold color={colors.success}>
                Protocol
              </Text>
            </Box>
          </Box>
        ) : null}

        {displayList.length > 0 ? (
          displayList.map((model) => (
            <Box key={model.id} justifyContent="space-between" paddingX={1}>
              <Box width={compact ? "70%" : "48%"}>
                <Text bold color={colors.text}>
                  {truncate(model.display_name, compact ? nameMax : 28)}{" "}
                </Text>
                <Text color={colors.muted}>({truncate(model.id, 22)})</Text>
              </Box>
              <Box width={compact ? "30%" : "24%"}>
                <Text color={colors.warning}>
                  {formatPricingSummary(model.billing_unit, model.pricing)}
                </Text>
              </Box>
              {!compact ? (
                <>
                  <Box width="12%">
                    <Text color="magenta">{formatTokens(model.context_window)}</Text>
                  </Box>
                  <Box width="16%">
                    <Text color={colors.success}>
                      {model.supported_endpoint_types.join(", ")}
                    </Text>
                  </Box>
                </>
              ) : null}
            </Box>
          ))
        ) : (
          <Box justifyContent="center" paddingY={1}>
            <Text color={colors.error}>Không tìm thấy model khớp “{query}”</Text>
          </Box>
        )}

        <Text color={colors.muted}>
          Trang {totalPages === 0 ? 0 : page + 1}/{totalPages}
          {"  "}
          {filteredModels.length === 0 ? 0 : startIndex + 1}–
          {Math.min(startIndex + PAGE_SIZE, filteredModels.length)}/{filteredModels.length}
        </Text>
      </Box>
    </Card>
  );
};
