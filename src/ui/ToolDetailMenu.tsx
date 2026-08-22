import React from "react";
import { ClaudeDetailMenu, ClaudeMenuAction, ClaudeDraftConfig } from "./tools/ClaudeDetailMenu";
import { CodexDetailMenu, CodexMenuAction, CodexDraftConfig } from "./tools/CodexDetailMenu";
import {
  GenericToolDetailMenu,
  GenericMenuAction,
} from "./tools/GenericToolDetailMenu";

export type ToolMenuAction = ClaudeMenuAction | CodexMenuAction | GenericMenuAction;

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
    default:
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
