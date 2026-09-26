import React from "react";
import { Box, Text } from "ink";
import { colors, glyphs } from "../theme";
import { useTerminalLayout } from "../hooks/useTerminalLayout";

export type StepDef = { id: string; label: string };

interface StepIndicatorProps {
  steps: readonly StepDef[];
  current: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, current }) => {
  const { compact } = useTerminalLayout();
  const idx = Math.min(Math.max(current, 0), Math.max(steps.length - 1, 0));
  const dots = steps
    .map((_, i) => (i <= idx ? glyphs.dotOn : glyphs.dotOff))
    .join(" ");

  if (compact) {
    return (
      <Box marginBottom={1} gap={1}>
        <Text color={colors.accent}>
          [{dots}] {idx + 1}/{steps.length}
        </Text>
        <Text color={colors.text} bold>
          {steps[idx]?.label}
        </Text>
      </Box>
    );
  }

  return (
    <Box marginBottom={1} flexDirection="column">
      <Text color={colors.accent}>
        [{dots}] Bước {idx + 1}/{steps.length}
      </Text>
      <Box gap={1}>
        {steps.map((step, i) => {
          const done = i < idx;
          const active = i === idx;
          const color = active ? colors.accent : done ? colors.success : colors.muted;
          return (
            <React.Fragment key={step.id}>
              {i > 0 ? <Text color={colors.muted}> {glyphs.arrow} </Text> : null}
              <Text color={color} bold={active}>
                {active ? glyphs.pointer + " " : done ? glyphs.check + " " : ""}
                {step.label}
              </Text>
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
};
