/** Binary names to probe on PATH (first match wins). */
export const TOOL_BINARY_NAMES: Record<string, string[]> = {
  claude: ["claude", "claude-code"],
  codex: ["codex"],
  openclaw: ["openclaw"],
  "deepseek-tui": ["deepseek", "deepseek-tui"],
  qwen: ["qwen", "qwen-code"],
  opencode: ["opencode"],
  kilo: ["kilo", "kilocode"],
  droid: ["droid", "factory-droid"],
  cline: ["cline"],
  roo: ["roo"],
  "grok-build": ["grok", "grok-build"],
  cowork: ["cowork"],
  jcode: ["jcode"],
};

/** VS Code / Cursor / Windsurf extension folder markers (substring match). */
export const TOOL_VSCODE_EXTENSIONS: Record<string, string[]> = {
  claude: ["anthropic.claude-code", "claude-dev", "anthropic.claude"],
  codex: ["openai.chatgpt", "openai.codex", "chatgpt"],
  cline: ["saoudrizwan.claude-dev", "cline"],
  roo: ["rooveterinaryinc.roo-cline", "roo-cline", "roocode"],
  kilo: ["kilocode.kilo-code", "kilo-code", "kilocode"],
  opencode: ["opencode", "sst.opencode"],
  qwen: ["qwen", "alibaba.qwen"],
  "deepseek-tui": ["deepseek"],
  droid: ["factory.factory", "factory-droid", "droid"],
};

/** Thư mục extensions IDE (dưới ~) — quét tất cả roots. */
export const IDE_EXTENSION_ROOTS = [
  ".vscode/extensions",
  ".cursor/extensions",
  ".windsurf/extensions",
  ".vscode-oss/extensions",
  ".config/Code/User/globalStorage",
  ".config/Cursor/User/globalStorage",
  ".config/Windsurf/User/globalStorage",
];

/** JetBrains config markers (dir/file under ~) */
export const TOOL_JETBRAINS_MARKERS: Record<string, string[]> = {
  claude: [".jetbrains", "JetBrains/Claude"],
  codex: [".jetbrains"],
};

/** Extra home markers (dir name under ~) besides config file parent. */
export const TOOL_HOME_MARKERS: Record<string, string[]> = {
  claude: [".claude"],
  codex: [".codex"],
  openclaw: [".openclaw"],
  "deepseek-tui": [".deepseek"],
  qwen: [".qwen"],
  opencode: [".opencode"],
  kilo: [".kilo"],
  droid: [".droid"],
  cline: [".vscode"],
  roo: [".vscode"],
  "grok-build": [".grok"],
  cowork: [".cowork"],
  jcode: [".jcode"],
};
