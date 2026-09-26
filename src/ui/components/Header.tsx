import React from "react";
import { Box, Text } from "ink";
import { VERSION } from "../../version";
import { BRAND, colors, getBorderStyle, glyphs } from "../theme";
import { useTerminalLayout } from "../hooks/useTerminalLayout";

interface HeaderProps {
  version?: string;
  compact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ version = VERSION, compact }) => {
  const layout = useTerminalLayout();
  const isCompact = compact ?? layout.compact;
  const borderStyle = getBorderStyle();

  if (isCompact) {
    return (
      <Box marginBottom={1} gap={1}>
        <Text color={BRAND} bold>
          {glyphs.spark} stali
        </Text>
        <Text color={colors.muted}>v{version}</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={BRAND}
      paddingX={1}
      marginBottom={1}
    >
      <Box justifyContent="space-between">
        <Box gap={1}>
          <Text color={BRAND} bold>
            {glyphs.spark} stali
          </Text>
          <Text color={colors.muted}>v{version}</Text>
        </Box>
        <Text color={colors.muted}>api.stali.vn</Text>
      </Box>
      {!layout.narrow ? (
        <Text color={BRAND} italic>
          Small Deeds Lead To A Better Life
        </Text>
      ) : null}
    </Box>
  );
};
