import React from "react";
import { ClaudeDetailMenu, ClaudeMenuAction, ClaudeDraftConfig } from "./tools/ClaudeDetailMenu";
import { CodexDetailMenu, CodexMenuAction, CodexDraftConfig } from "./tools/CodexDetailMenu";
import {
  GenericToolDetailMenu,
  GenericMenuAction,
} from "./tools/GenericToolDetailMenu";
import {
  OpenClawDetailMenu,
  OpenClawMenuAction,
} from "./tools/OpenClawDetailMenu";
import {
  VsCodeAgentDetailMenu,
  VsCodeAgentMenuAction,
} from "./tools/VsCodeAgentDetailMenu";
import {
  OpenAiTomlDetailMenu,
  OpenAiTomlMenuAction,
} from "./tools/OpenAiTomlDetailMenu";
import {
  OpenCodeDetailMenu,
  OpenCodeMenuAction,
} from "./tools/OpenCodeDetailMenu";

const VSCODE_AGENT_TOOLS = new Set(["cline", "roo", "kilo"]);
const OPENAI_TOML_TOOLS = new Set(["deepseek-tui", "grok-build", "jcode"]);

export type ToolMenuAction =
  | ClaudeMenuAction
  | CodexMenuAction
  | OpenClawMenuAction
  | VsCodeAgentMenuAction
  | OpenAiTomlMenuAction
  | OpenCodeMenuAction
  | GenericMenuAction;

export interface ToolDetailMenuProps {
  toolId: string;
  apiKey: string;
  genericModel?: string;
  claudeDraft?: ClaudeDraftConfig;
  codexDraft?: CodexDraftConfig;
  onClaudeDraftChange?: (draft: ClaudeDraftConfig) => void;
  onCodexDraftChange?: (draft: CodexDraftConfig) => void;
  onSelectAction: (action: ToolMenuAction) => void;
}

export const ToolDetailMenu: React.FC<ToolDetailMenuProps> = ({
  toolId,
  apiKey,
  genericModel = "claude-fable-5",
  claudeDraft = {
    fable: "claude-fable-5",
    opus: "claude-fable-5",
    sonnet: "claude-sonnet-5",
    haiku: "claude-haiku-4-5",
    context: "",
  },
  codexDraft = {
    model: "req/gpt-5.6-sol",
    subagentModel: "",
  },
  onClaudeDraftChange,
  onCodexDraftChange,
  onSelectAction,
}) => {
  switch (toolId) {
    case "claude":
      return (
        <ClaudeDetailMenu
          draftConfig={claudeDraft}
          onDraftChange={onClaudeDraftChange}
          onSelectAction={onSelectAction}
        />
      );
    case "codex":
      return (
        <CodexDetailMenu
          draftConfig={codexDraft}
          onDraftChange={onCodexDraftChange}
          onSelectAction={onSelectAction}
        />
      );
    case "openclaw":
      return (
        <OpenClawDetailMenu
          model={genericModel}
          apiKey={apiKey}
          onSelectAction={onSelectAction}
        />
      );
    case "opencode":
      return (
        <OpenCodeDetailMenu
          model={genericModel}
          apiKey={apiKey}
          onSelectAction={onSelectAction}
        />
      );
    default:
      if (OPENAI_TOML_TOOLS.has(toolId)) {
        return (
          <OpenAiTomlDetailMenu
            toolId={toolId}
            model={genericModel}
            apiKey={apiKey}
            onSelectAction={onSelectAction}
          />
        );
      }
      if (VSCODE_AGENT_TOOLS.has(toolId)) {
        return (
          <VsCodeAgentDetailMenu
            toolId={toolId}
            model={genericModel}
            apiKey={apiKey}
            onSelectAction={onSelectAction}
          />
        );
      }
      return (
        <GenericToolDetailMenu
          toolId={toolId}
          model={genericModel}
          apiKey={apiKey}
          onSelectAction={onSelectAction}
        />
      );
  }
};
