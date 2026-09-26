import React, { useEffect, useState } from "react";
import { SimpleToolMenu, type SimpleToolAction } from "../components/SimpleToolMenu";
import { getProtocolModelShortcuts } from "../../utils/tool-utils";
import { getToolSyncStatus } from "../../services/syncers";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type OpenCodeMenuAction = SimpleToolAction;

export const OpenCodeDetailMenu: React.FC<{
  model: string;
  apiKey: string;
  onSelectAction: (action: OpenCodeMenuAction) => void;
}> = ({ model, apiKey, onSelectAction }) => {
  const [status, setStatus] = useState<ToolSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const sync = await getToolSyncStatus("opencode");
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
      title="🟢 OpenCode"
      borderColor="green"
      apiKey={apiKey}
      model={model}
      status={status}
      loading={loading}
      file="~/.opencode/config.json"
      patchHint="defaultProvider=stali, provider.stali.options.baseURL + apiKey"
      shortcuts={getProtocolModelShortcuts("opencode")}
      quickSetupLabel="Quick setup (req/gpt-5.6-sol)"
      endpointLabel="Base URL"
      onSelectAction={onSelectAction}
    />
  );
};
