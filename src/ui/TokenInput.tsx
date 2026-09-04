import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { Card } from "./components/Card";
import { SpinnerLine } from "./components/LoadingCard";
import { colors, getBorderStyle, glyphs, maskChar, maskPretty } from "./theme";
import { validateTokenFormat } from "../utils/token";

interface TokenInputProps {
  existingToken?: string;
  loading: boolean;
  error?: string;
  onSubmit: (token: string) => void;
  onBack?: () => void;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  existingToken = "",
  loading,
  error,
  onSubmit,
  onBack,
}) => {
  const [token, setToken] = useState(existingToken);
  const [visible, setVisible] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();

  useInput((input, key) => {
    if (loading) return;
    if (key.escape && onBack) {
      onBack();
      return;
    }
    if (key.tab) {
      setVisible((v) => !v);
    }
  });

  const handleSubmit = () => {
    const trimmed = token.trim() || existingToken.trim();
    const formatErr = validateTokenFormat(trimmed);
    if (formatErr) {
      setLocalError(formatErr);
      return;
    }
    setLocalError(undefined);
    onSubmit(trimmed);
  };

  const shownError = localError || error;
  const savedHint = existingToken ? maskPretty(existingToken) : "";

  return (
    <Card
      title={`${glyphs.spark} Xác thực Stali API`}
      subtitle="Dán token sk-stali-… — Enter để dùng giá trị mặc định nếu đã lưu"
      borderColor={shownError ? colors.error : "magenta"}
    >
      <Box flexDirection="column" gap={1}>
        {savedHint ? (
          <Text color={colors.muted}>
            Token đã lưu: <Text color={colors.warning}>{savedHint}</Text>
            {" — Enter để dùng lại, hoặc dán token mới"}
          </Text>
        ) : (
          <Text>
            Nhập Stali API Token (<Text color={colors.warning}>sk-stali-…</Text>)
          </Text>
        )}

        <Box
          borderStyle={getBorderStyle()}
          borderColor={shownError ? colors.error : colors.muted}
          paddingX={1}
        >
          <Text color={colors.accent}>Token: </Text>
          <TextInput
            value={token}
            onChange={(v) => {
              setToken(v);
              if (localError) setLocalError(undefined);
            }}
            onSubmit={handleSubmit}
            mask={visible ? undefined : maskChar}
            placeholder="Dán token rồi Enter…"
            focus={!loading}
          />
        </Box>

        <Text color={colors.muted}>
          {visible ? `${glyphs.info} Token đang hiện` : `${glyphs.info} Token đang ẩn (Tab để hiện/ẩn)`}
        </Text>

        {loading ? <SpinnerLine message="Đang xác thực token với https://api.stali.vn/v1/models…" /> : null}

        {shownError ? (
          <Text color={colors.error}>
            {glyphs.cross} {shownError}
          </Text>
        ) : null}

        <Text color={colors.muted}>
          Lấy API key: https://api.stali.vn/dashboard/keys
        </Text>
      </Box>
    </Card>
  );
};
