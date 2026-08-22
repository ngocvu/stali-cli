import {
  STALI_ANTHROPIC_BASE_URL,
  STALI_OPENAI_BASE_URL,
} from "../constants/api";
import { getToolById } from "../utils/tool-utils";

export type ExportEnvFormat = "shell" | "dotenv" | "json" | "powershell";

export interface EnvEntry {
  key: string;
  value: string;
  comment?: string;
}

export function buildToolEnvEntries(
  toolId: string,
  apiKey: string,
  model: string
): EnvEntry[] {
  const tool = getToolById(toolId);
  if (!tool) return [];

  switch (toolId) {
    case "claude":
    case "openclaw":
      return [
        { key: "ANTHROPIC_BASE_URL", value: STALI_ANTHROPIC_BASE_URL },
        { key: "ANTHROPIC_AUTH_TOKEN", value: apiKey.trim() },
        { key: "ANTHROPIC_MODEL", value: model },
        { key: "API_TIMEOUT_MS", value: "600000", comment: "10 phút timeout" },
      ];
    case "codex":
      return [
        {
          key: "OPENAI_API_KEY",
          value: apiKey.trim(),
          comment: "Ghi vào ~/.codex/auth.json",
        },
        {
          key: "STALI_CODEX_MODEL",
          value: model,
          comment: "Ghi vào ~/.codex/config.toml → model",
        },
        {
          key: "STALI_CODEX_BASE_URL",
          value: STALI_OPENAI_BASE_URL,
          comment: "model_providers.stali.base_url",
        },
      ];
    case "deepseek-tui":
    case "grok-build":
    case "jcode":
      return [
        { key: "OPENAI_BASE_URL", value: STALI_OPENAI_BASE_URL },
        { key: "OPENAI_API_KEY", value: apiKey.trim() },
        { key: "OPENAI_MODEL", value: model },
      ];
    case "cline":
    case "roo":
    case "kilo":
      return [
        {
          key: "STALI_VSCODE_API_PROVIDER",
          value: "anthropic",
          comment: `JSON field trong ${tool.configFile}`,
        },
        { key: "STALI_VSCODE_ANTHROPIC_BASE_URL", value: STALI_ANTHROPIC_BASE_URL },
        { key: "STALI_VSCODE_ANTHROPIC_API_KEY", value: apiKey.trim() },
        { key: "STALI_VSCODE_ANTHROPIC_MODEL_ID", value: model },
      ];
    case "qwen":
      return [
        { key: "QWEN_OPENAI_BASE_URL", value: STALI_OPENAI_BASE_URL },
        { key: "QWEN_OPENAI_API_KEY", value: apiKey.trim() },
        { key: "QWEN_MODEL", value: model },
      ];
    case "opencode":
    case "droid":
    case "cowork":
      return [
        { key: "STALI_OPENAI_BASE_URL", value: STALI_OPENAI_BASE_URL },
        { key: "STALI_OPENAI_API_KEY", value: apiKey.trim() },
        { key: "STALI_MODEL", value: model },
      ];
    default:
      return [
        { key: "STALI_API_KEY", value: apiKey.trim() },
        { key: "STALI_MODEL", value: model },
        { key: "STALI_BASE_URL", value: STALI_OPENAI_BASE_URL },
      ];
  }
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9_./:@-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function renderEnvExport(
  toolId: string,
  apiKey: string,
  model: string,
  format: ExportEnvFormat
): string {
  const tool = getToolById(toolId);
  const entries = buildToolEnvEntries(toolId, apiKey, model);
  const header = `# Stali export-env — ${tool?.name || toolId} (${model})\n`;

  switch (format) {
    case "json":
      return JSON.stringify(
        Object.fromEntries(entries.map((e) => [e.key, e.value])),
        null,
        2
      );
    case "dotenv":
      return (
        header +
        entries
          .map((e) => (e.comment ? `# ${e.comment}\n${e.key}=${e.value}` : `${e.key}=${e.value}`))
          .join("\n") +
        "\n"
      );
    case "powershell":
      return (
        header +
        entries
          .map((e) => {
            const line = `$env:${e.key}="${e.value.replace(/"/g, '`"')}"`;
            return e.comment ? `# ${e.comment}\n${line}` : line;
          })
          .join("\n") +
        "\n"
      );
    case "shell":
    default:
      return (
        header +
        entries
          .map((e) => {
            const line = `export ${e.key}=${shellQuote(e.value)}`;
            return e.comment ? `# ${e.comment}\n${line}` : line;
          })
          .join("\n") +
        "\n"
      );
  }
}
