import {
  STALI_ANTHROPIC_BASE_URL,
  STALI_DOCS_URL,
  STALI_OPENAI_BASE_URL,
} from "./api";

export interface AppGuide {
  id: string;
  name: string;
  protocol: string;
  steps: string[];
  note?: string;
  staliConfigure?: string;
}

export const APP_GUIDES: Record<string, AppGuide> = {
  cursor: {
    id: "cursor",
    name: "Cursor IDE",
    protocol: "openai",
    steps: [
      "Mở Cursor → Settings → Models / OpenAI API.",
      "Base URL: https://api.stali.vn/v1",
      "API Key: sk-stali-... (tạo tại Dashboard → Keys).",
      "Chọn model Stali (vd. gpt-5.6-sol hoặc claude-fable-5 nếu hỗ trợ).",
      "Tab/Composer đám mây Cursor có thể vẫn đi server Cursor — chỉ custom model/API trỏ Stali.",
    ],
    note: "Cursor không có file config CLI patch được — cấu hình qua UI.",
    staliConfigure: "stali export-env claude -f dotenv   # copy gợi ý env",
  },
  chatbox: {
    id: "chatbox",
    name: "Chatbox",
    protocol: "openai",
    steps: [
      "Mở Chatbox → Settings → Provider → OpenAI API Compatible.",
      "API Host: https://api.stali.vn/v1",
      "API Key: sk-stali-...",
      "Chọn model từ danh sách hoặc nhập ID model Stali.",
    ],
    note: "Chatbox hỗ trợ OpenAI-compatible — không cần patch file local.",
  },
  n8n: {
    id: "n8n",
    name: "n8n",
    protocol: "openai",
    steps: [
      "Thêm OpenAI node hoặc HTTP Request node.",
      "URL: https://api.stali.vn/v1/chat/completions",
      "Header Authorization: Bearer sk-stali-...",
    ],
  },
};

export function renderAppGuide(appId: string): string | null {
  const guide = APP_GUIDES[appId.toLowerCase()];
  if (!guide) return null;

  const lines = [
    `# ${guide.name} — hướng dẫn gắn Stali API`,
    `Giao thức: ${guide.protocol}`,
    `Anthropic base: ${STALI_ANTHROPIC_BASE_URL}`,
    `OpenAI base: ${STALI_OPENAI_BASE_URL}`,
    "",
    ...guide.steps.map((s, i) => `${i + 1}. ${s}`),
  ];
  if (guide.note) lines.push("", `Lưu ý: ${guide.note}`);
  if (guide.staliConfigure) lines.push("", guide.staliConfigure);
  lines.push("", `Docs: ${STALI_DOCS_URL}#apps`);
  return lines.join("\n") + "\n";
}

export function listGuideIds(): string[] {
  return Object.keys(APP_GUIDES);
}
