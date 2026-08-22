import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { Card } from "./components/Card";

interface TokenInputProps {
  existingToken?: string;
  loading: boolean;
  error?: string;
  onSubmit: (token: string) => void;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  existingToken = "",
  loading,
  error,
  onSubmit,
}) => {
  const [token, setToken] = useState(existingToken);

  return (
    <Card title="🔑 XÁC THỰC STALI API TOKEN" borderColor="magenta">
      <Box flexDirection="column" gap={1}>
        <Text>
          Nhập Stali API Token của bạn (bắt đầu bằng <Text color="yellow">sk-stali-...</Text>):
        </Text>

        <Box borderStyle="single" borderColor={error ? "red" : "gray"} paddingX={1}>
          <Text color="cyan">Token: </Text>
          <TextInput
            value={token}
            onChange={setToken}
            onSubmit={() => token.trim() && onSubmit(token.trim())}
            mask="*"
            placeholder="Dán token tại đây rồi nhấn Enter..."
          />
        </Box>

        {loading && (
          <Box gap={1}>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="yellow">Đang xác thực token với Stali API (https://api.stali.vn/v1/models)...</Text>
          </Box>
        )}

        {error && (
          <Box>
            <Text color="red">❌ {error}</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray">
            💡 Bạn có thể lấy API Key tại: <Text underline color="blue">https://api.stali.vn/dashboard/keys</Text>
          </Text>
        </Box>
      </Box>
    </Card>
  );
};
