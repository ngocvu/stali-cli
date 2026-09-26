import React from "react";
import { Box } from "ink";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { StepIndicator, type StepDef } from "./StepIndicator";
import { LoadingCard } from "./LoadingCard";
import { useTerminalLayout } from "../hooks/useTerminalLayout";
import type { KeyHint } from "../nav";

interface ScreenProps {
  children: React.ReactNode;
  hints: KeyHint[];
  steps?: readonly StepDef[];
  currentStep?: number;
  loading?: boolean;
  loadingMessage?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  hints,
  steps,
  currentStep = 0,
  loading = false,
  loadingMessage,
}) => {
  const { compact } = useTerminalLayout();

  return (
    <Box flexDirection="column" paddingX={compact ? 0 : 1} paddingY={0}>
      <Header compact={compact} />
      {steps && steps.length > 0 ? (
        <StepIndicator steps={steps} current={currentStep} />
      ) : null}
      <Box flexDirection="column">{loading ? <LoadingCard message={loadingMessage} /> : children}</Box>
      <Footer hints={hints} />
    </Box>
  );
};
