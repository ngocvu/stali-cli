import React from "react";
import { Box, Text } from "ink";
import { VERSION } from "../../version";

interface HeaderProps {
  version?: string;
}

const STALI_LOGO_LINES = [
  "  ███████╗████████╗ █████╗ ██╗     ██╗",
  "  ██╔════╝╚══██╔══╝██╔══██╗██║     ██║",
  "  ███████╗   ██║   ███████║██║     ██║",
  "  ╚════██║   ██║   ██╔══██║██║     ██║",
  "  ███████║   ██║   ██║  ██║███████╗██║",
  "  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝",
];

export const Header: React.FC<HeaderProps> = ({ version = VERSION }) => {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box flexDirection="column">
        {STALI_LOGO_LINES.map((line, idx) => (
          <Text key={idx} color="#EE202E" bold>
            {line}
          </Text>
        ))}
      </Box>

      <Box paddingLeft={2} marginTop={0}>
        <Text color="#EE202E" italic>
          Small Deeds Lead To A Better Life
        </Text>
      </Box>

      <Box justifyContent="space-between" marginTop={1} paddingX={1}>
        <Text color="gray">Stali API Config Manager & CLI Integrator (https://api.stali.vn)</Text>
        <Text color="cyan">v{version}</Text>
      </Box>
    </Box>
  );
};
