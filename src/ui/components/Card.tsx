import React from "react";
import { Box, Text } from "ink";
import { colors, getBorderStyle, type Tone, toneColor } from "../theme";

interface CardProps {
  title?: string;
  subtitle?: string;
  borderColor?: string;
  tone?: Tone;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  borderColor,
  tone,
  children,
}) => {
  const color = borderColor ?? (tone ? toneColor[tone] : colors.accent);
  return (
    <Box
      flexDirection="column"
      borderStyle={getBorderStyle()}
      borderColor={color}
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      {(title || subtitle) && (
        <Box marginBottom={title && !subtitle ? 0 : 0} flexDirection="column">
          {title ? (
            <Text bold color={color}>
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text color={colors.muted}>{subtitle}</Text> : null}
        </Box>
      )}
      {children}
    </Box>
  );
};

interface BadgeProps {
  label: string;
  color?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, color = "green" }) => {
  return (
    <Text backgroundColor={color} color="black" bold>
      {` ${label} `}
    </Text>
  );
};
