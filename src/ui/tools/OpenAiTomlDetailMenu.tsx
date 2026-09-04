import React, { useEffect, useState } from "react";
import { SimpleToolMenu, type SimpleToolAction } from "../components/SimpleToolMenu";
import { getToolById, getProtocolModelShortcuts } from "../../utils/tool-utils";
import { getToolSyncStatus } from "../../services/syncers";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type OpenAiTomlMenuAction = SimpleToolAction;

export const OpenAiTomlDetailMenu: React.FC<{
  toolId: string;
  model: string;
  apiKey: string;
  onSelectAction: (action: OpenAiTomlMenuAction) => void;
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
      title={`${tool?.icon || "📄"} ${tool?.name || toolId}`}
      borderColor="blue"
      apiKey={apiKey}
      model={model}
      status={status}
      loading={loading}
      file={tool?.configFile || "~/.config.toml"}
      protocol="openai (TOML)"
      patchHint="provider, base_url, api_key, model"
      shortcuts={getProtocolModelShortcuts(toolId)}
      endpointLabel="Base URL"
      onSelectAction={onSelectAction}
    />
  );
};
