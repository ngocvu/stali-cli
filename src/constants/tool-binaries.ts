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

/** VS Code / Cursor extension folder markers (substring match). */
export const TOOL_VSCODE_EXTENSIONS: Record<string, string[]> = {
  cline: ["saoudrizwan.claude-dev", "cline"],
  roo: ["rooveterinaryinc.roo-cline", "roo-cline"],
  kilo: ["kilocode.kilo-code", "kilo-code", "kilocode"],
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
