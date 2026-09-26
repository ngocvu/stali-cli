import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { Card } from "./Card";
import { colors, spinnerType } from "../theme";

interface LoadingCardProps {
  message?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  message = "Đang xử lý…",
}) => {
  return (
    <Card title="Đang chạy" tone="info">
      <Box flexDirection="column" gap={1} paddingY={1}>
        <Box gap={1}>
          <Text color={colors.accent}>
            <Spinner type={spinnerType} />
          </Text>
          <Text color={colors.accent}>{message}</Text>
        </Box>
        <Text color={colors.muted}>Tác vụ chạy ngầm — Ctrl+C để thoát an toàn.</Text>
      </Box>
    </Card>
  );
};

interface SpinnerLineProps {
  message: string;
}

export const SpinnerLine: React.FC<SpinnerLineProps> = ({ message }) => (
  <Box gap={1}>
    <Text color={colors.accent}>
      <Spinner type={spinnerType} />
    </Text>
    <Text color={colors.accent}>{message}</Text>
  </Box>
);
