import React, { useEffect, useState } from "react";
import { SimpleToolMenu, type SimpleToolAction } from "../components/SimpleToolMenu";
import { getProtocolModelShortcuts } from "../../utils/tool-utils";
import { getToolSyncStatus } from "../../services/syncers";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type QwenMenuAction = SimpleToolAction;

export const QwenDetailMenu: React.FC<{
  model: string;
  apiKey: string;
  onSelectAction: (action: QwenMenuAction) => void;
}> = ({ model, apiKey, onSelectAction }) => {
  const [status, setStatus] = useState<ToolSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const sync = await getToolSyncStatus("qwen");
      if (!active) return;
      setStatus(sync);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SimpleToolMenu
      title="🟣 Qwen Code"
      borderColor="magenta"
      apiKey={apiKey}
      model={model}
      status={status}
      loading={loading}
      file="~/.qwen/settings.json"
      patchHint="security.auth (openai), model.name"
      shortcuts={getProtocolModelShortcuts("qwen")}
      quickSetupLabel="Quick setup (stali/qwen3-codex)"
      endpointLabel="Base URL"
      onSelectAction={onSelectAction}
    />
  );
};
