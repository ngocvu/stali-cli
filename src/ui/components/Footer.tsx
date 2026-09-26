import React from "react";
import { Box, Text } from "ink";
import { colors, glyphs } from "../theme";
import { formatHints, type KeyHint } from "../nav";
import { useTerminalLayout } from "../hooks/useTerminalLayout";

interface FooterProps {
  hints: KeyHint[];
}

export const Footer: React.FC<FooterProps> = ({ hints }) => {
  const { compact, columns } = useTerminalLayout();
  const shown = compact ? hints.slice(0, 3) : hints;
  const width = Math.max(16, Math.min(columns - 2, compact ? 28 : 48));

  return (
    <Box marginTop={1} flexDirection="column">
      <Text color={colors.muted}>{glyphs.line.repeat(width)}</Text>
      <Text color={colors.muted}>{formatHints(shown, compact)}</Text>
    </Box>
  );
};
