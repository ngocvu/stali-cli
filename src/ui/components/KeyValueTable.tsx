import React from "react";
import { Box, Text } from "ink";
import { colors, maskPretty, truncate, type ConfigRow } from "../theme";
import { useTerminalLayout } from "../hooks/useTerminalLayout";

interface KeyValueTableProps {
  rows: ConfigRow[];
  labelWidth?: number;
}

export const KeyValueTable: React.FC<KeyValueTableProps> = ({
  rows,
  labelWidth = 18,
}) => {
  const { columns, compact } = useTerminalLayout();
  const lw = compact ? Math.min(12, labelWidth) : labelWidth;
  const valueWidth = Math.max(12, columns - lw - 8);

  return (
    <Box flexDirection="column">
      {rows.map((row, i) => (
        <Box key={`${row.key}-${i}`}>
          <Box width={lw}>
            <Text color={colors.muted}>{truncate(row.key, lw)}</Text>
          </Box>
          <Text color={colors.text}>
            {truncate(row.secret ? maskPretty(row.value) : row.value, valueWidth)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
