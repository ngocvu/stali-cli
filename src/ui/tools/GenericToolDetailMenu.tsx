import React, { useEffect, useState } from "react";
import { SimpleToolMenu, type SimpleToolAction } from "../components/SimpleToolMenu";
import { getToolById, getProtocolModelShortcuts } from "../../utils/tool-utils";
import { getToolSyncStatus, getToolHealthStatus } from "../../services/syncers";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type GenericMenuAction = SimpleToolAction;

interface GenericToolDetailMenuProps {
  toolId: string;
  model: string;
  apiKey: string;
  onSelectAction: (action: GenericMenuAction) => void;
}

export const GenericToolDetailMenu: React.FC<GenericToolDetailMenuProps> = ({
  toolId,
  model,
  apiKey,
  onSelectAction,
}) => {
  const tool = getToolById(toolId);
  const toolName = tool?.name || toolId;
  const configFile = tool?.configFile || "~/.stali/config.json";
  const [status, setStatus] = useState<ToolSyncStatus | null>(null);
  const [configPath, setConfigPath] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const health = await getToolHealthStatus(toolId);
      const sync = await getToolSyncStatus(toolId);
      if (!active) return;
      setStatus(sync);
      setConfigPath(health?.configPath || configFile);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [toolId, configFile]);

  return (
    <SimpleToolMenu
      title={`${tool?.icon || "🔧"} ${toolName}`}
      apiKey={apiKey}
      model={model}
      status={status}
      loading={loading}
      file={configPath || configFile}
      protocol={tool?.protocol || "openai"}
      shortcuts={getProtocolModelShortcuts(toolId)}
      onSelectAction={onSelectAction}
    />
  );
};
