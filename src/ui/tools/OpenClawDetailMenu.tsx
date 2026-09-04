import React, { useEffect, useState } from "react";
import { SimpleToolMenu, type SimpleToolAction } from "../components/SimpleToolMenu";
import { getOpenClawStatus } from "../../services/syncers/openclaw";
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
      const s = await getOpenClawStatus();
      if (!active) return;
      setStatus({
        configured: s.configured,
        endpoint: s.endpoint,
        model: s.model,
        apiKeyPresent: s.apiKeyPresent,
      });
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
      file="~/.openclaw/config.json"
      protocol="anthropic"
      extraLines={["ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL (giống Claude Code)."]}
      shortcuts={getProtocolModelShortcuts("openclaw")}
      quickSetupLabel="Quick setup (claude-fable-5)"
      onSelectAction={onSelectAction}
    />
  );
};
