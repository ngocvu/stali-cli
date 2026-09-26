import React, { useEffect, useState } from "react";
import { SimpleToolMenu, type SimpleToolAction } from "../components/SimpleToolMenu";
import { getToolById, getProtocolModelShortcuts } from "../../utils/tool-utils";
import { getToolSyncStatus } from "../../services/syncers";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type OpenAiJsonMenuAction = SimpleToolAction;

const PATCH_HINT: Record<string, string> = {
  droid: "provider.type=openai, provider.baseUrl + apiKey, model",
  cowork: "openai.baseUrl + apiKey + model, defaultModel",
};

export const OpenAiJsonDetailMenu: React.FC<{
  toolId: string;
  model: string;
  apiKey: string;
  onSelectAction: (action: OpenAiJsonMenuAction) => void;
}> = ({ toolId, model, apiKey, onSelectAction }) => {
  const tool = getToolById(toolId);
  const [status, setStatus] = useState<ToolSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const sync = await getToolSyncStatus(toolId);
      if (!active) return;
      setStatus(sync);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [toolId]);

  return (
    <SimpleToolMenu
      title={`${tool?.icon || "🔧"} ${tool?.name || toolId}`}
      apiKey={apiKey}
      model={model}
      status={status}
      loading={loading}
      file={tool?.configFile || "~/.config.json"}
      protocol="openai (JSON)"
      patchHint={PATCH_HINT[toolId] || "openai provider + model"}
      shortcuts={getProtocolModelShortcuts(toolId)}
      endpointLabel="Base URL"
      onSelectAction={onSelectAction}
    />
  );
};
