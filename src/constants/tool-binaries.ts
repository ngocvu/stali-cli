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

/** Substring markers trong full process command line (ps args / tasklist). */
export const TOOL_PROCESS_MARKERS: Record<string, string[]> = {
  claude: ["claude-code", "@anthropic-ai/claude", "anthropic.claude"],
  codex: ["@openai/codex", "openai.codex", "codex-cli"],
  openclaw: ["openclaw", "@openclaw"],
  "deepseek-tui": ["deepseek-tui", "@deepseek"],
  qwen: ["qwen-code", "@qwen"],
  opencode: ["opencode", "@opencode"],
  kilo: ["kilocode", "kilo-code"],
  droid: ["factory-droid", "droid-cli"],
  cline: ["cline", "claude-dev"],
  roo: ["roo-cline", "roocode"],
  "grok-build": ["grok-build", "@xai/grok"],
  cowork: ["cowork"],
  jcode: ["jcode"],
};

/** macOS .app bundles under /Applications or ~/Applications */
export const TOOL_MACOS_APPS: Record<string, string[]> = {
  claude: ["Claude.app"],
  codex: ["Codex.app"],
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
