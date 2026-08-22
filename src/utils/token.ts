const STALI_TOKEN_PREFIX = "sk-stali-";

export function isValidStaliTokenFormat(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.startsWith(STALI_TOKEN_PREFIX) && trimmed.length > STALI_TOKEN_PREFIX.length + 8;
}

export function maskToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 12) return "sk-stali-***";
  return `${trimmed.slice(0, 10)}...${trimmed.slice(-4)}`;
}

export function validateTokenFormat(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) return "Vui lòng nhập API key";
  if (!trimmed.startsWith("sk-stali-")) {
    return "Token Stali phải bắt đầu bằng sk-stali-";
  }
  if (trimmed.length < 20) {
    return "Token quá ngắn — kiểm tra lại API key tại https://api.stali.vn/dashboard/keys";
  }
  return null;
}
