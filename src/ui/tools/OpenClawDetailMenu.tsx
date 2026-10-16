import React, { useEffect, useState } from "react";
import { SimpleToolMenu, type SimpleToolAction } from "../components/SimpleToolMenu";
import { getToolSyncStatus } from "../../services/syncers";
import { getProtocolModelShortcuts } from "../../utils/tool-utils";
import type { ToolSyncStatus } from "../../services/syncers/status";

export type OpenClawMenuAction = SimpleToolAction;

interface OpenClawDetailMenuProps {
  model: string;
  apiKey: string;
  onSelectAction: (action: OpenClawMenuAction) => void;
}

export const OpenClawDetailMenu: React.FC<OpenClawDetailMenuProps> = ({
  model,
  apiKey,
  onSelectAction,
}) => {
  const [status, setStatus] = useState<ToolSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const s = await getToolSyncStatus("openclaw");
      if (!active) return;
      setStatus(s ?? { configured: false });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SimpleToolMenu
      title="🐾 OpenClaw"
      borderColor="yellow"
      apiKey={apiKey}
      model={model}
      status={status}
      loading={loading}
      file="~/.openclaw/openclaw.json"
      protocol="anthropic"
      extraLines={["models.providers.stali (baseUrl/apiKey/api) + agents.defaults.model.primary."]}
      shortcuts={getProtocolModelShortcuts("openclaw")}
      quickSetupLabel="Quick setup (claude-fable-5)"
      onSelectAction={onSelectAction}
    />
  );
};
