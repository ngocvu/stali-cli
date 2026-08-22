import React from "react";
import { Box, Text } from "ink";

interface CardProps {
  title?: string;
  subtitle?: string;
  borderColor?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  borderColor = "cyan",
  children,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      paddingY={0}
      marginY={1}
    >
      {(title || subtitle) && (
        <Box marginBottom={1} flexDirection="column">
          {title && (
            <Text bold color={borderColor}>
              {title}
            </Text>
          )}
          {subtitle && <Text color="gray">{subtitle}</Text>}
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
