import React from "react";
import { Box, Text } from "ink";
import { Card } from "./components/Card";
import { Menu, type MenuItem } from "./components/Menu";
import { StatusBadge, statusFromHealth } from "./components/StatusBadge";
import { colors, glyphs, truncate } from "./theme";
import { useTerminalLayout } from "./hooks/useTerminalLayout";
import type { ToolHealthStatus } from "../services/syncers";
import type { PluginHealthStatus } from "../services/plugin-doctor";
import type { DoctorInstalledToolSummary } from "../commands/doctor";

export interface DoctorViewProps {
  toolStatuses: ToolHealthStatus[];
  pluginStatuses?: PluginHealthStatus[];
  pendingGateway?: DoctorInstalledToolSummary[];
  pendingGatewayIds?: string[];
  onBack: () => void;
  onFixAllTools?: () => void;
  onSyncAllPlugins?: () => void;
  onGatewayAuto?: () => void;
  backLabel?: string;
}

function Row({
  ok,
  exists,
  name,
  detail,
  path,
  compact,
}: {
  ok: boolean;
  exists?: boolean;
  name: string;
  detail?: string;
  path?: string;
  compact: boolean;
}) {
  const status = statusFromHealth(ok, exists);
  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <StatusBadge status={status} />
        <Text color={ok ? colors.success : colors.warning} bold={!ok}>
          {name}
        </Text>
        {detail ? <Text color={colors.muted}>{detail}</Text> : null}
      </Box>
      {!compact && path ? (
        <Text color={colors.muted}>
          {"    "}
          {glyphs.arrow} {truncate(path, 64)}
        </Text>
      ) : null}
    </Box>
  );
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  toolStatuses,
  pluginStatuses = [],
  pendingGateway = [],
  pendingGatewayIds = [],
  onBack,
  onFixAllTools,
  onSyncAllPlugins,
  onGatewayAuto,
  backLabel = "Quay lại",
}) => {
  const { compact } = useTerminalLayout();
  const toolsPass = toolStatuses.filter((s) => s.configuredForStali);
  const toolsWarn = toolStatuses.filter((s) => !s.configuredForStali);
  const pluginsPass = pluginStatuses.filter((s) => s.configuredForStali);
  const pluginsWarn = pluginStatuses.filter((s) => !s.configuredForStali);
  const pendingById = new Map(pendingGateway.map((t) => [t.toolId, t]));
  const pendingLines = pendingGatewayIds.map((id) => pendingById.get(id));

  const pass = toolsPass.length + pluginsPass.length;
  const warn = toolsWarn.length + pluginsWarn.length + pendingGatewayIds.length;
  const fail = 0;

  const items: MenuItem<string>[] = [];
  if (pendingGatewayIds.length > 0 && onGatewayAuto) {
    items.push({
      label: `Gateway auto — ${pendingGatewayIds.length} app đã cài, chưa trỏ Stali`,
      value: "gateway-auto",
      icon: "🌐",
    });
  }
  if (toolsWarn.length > 0 && onFixAllTools) {
    items.push({
      label: `Fix automatically — sửa ${toolsWarn.length} tool`,
      value: "fix-tools",
      icon: "🔧",
    });
  }
  if (pluginsWarn.length > 0 && onSyncAllPlugins) {
    items.push({
      label: `Sync ${pluginsWarn.length} plugin chưa trỏ Stali`,
      value: "sync-plugins",
      icon: "🔌",
    });
  }
  items.push({ label: backLabel, value: "back", icon: "←" });

  return (
    <Card title={`${glyphs.info} Doctor`} subtitle="Dashboard sức khỏe tools · plugins · gateway" borderColor="yellow">
      <Box flexDirection="column" gap={1}>
        <Box gap={2}>
          <StatusBadge status="pass" count={pass} filled />
          <StatusBadge status="warn" count={warn} filled />
          <StatusBadge status="fail" count={fail} filled />
        </Box>

        <Text bold color={colors.muted}>
          TOOLS  {toolsPass.length}/{toolStatuses.length} PASS
        </Text>
        {toolStatuses.map((s) => (
          <Row
            key={s.toolId}
            ok={s.configuredForStali}
            exists={s.exists}
            name={s.toolName}
            detail={s.configuredForStali ? s.model : s.exists ? "file có, chưa trỏ Stali" : "chưa có file"}
            path={s.configPath}
            compact={compact}
          />
        ))}

        {pendingGatewayIds.length > 0 ? (
          <>
            <Text bold color={colors.warning}>
              GATEWAY  {pendingGatewayIds.length} chờ
            </Text>
            {pendingLines.map((entry, i) => (
              <Row
                key={entry?.toolId ?? pendingGatewayIds[i]}
                ok={false}
                name={entry?.toolName || pendingGatewayIds[i]}
                detail={entry?.signals.length ? entry.signals.join("+") : "đã cài, chưa gateway"}
                compact={compact}
              />
            ))}
          </>
        ) : null}

        {pluginStatuses.length > 0 ? (
          <>
            <Text bold color={colors.muted}>
              PLUGINS  {pluginsPass.length}/{pluginStatuses.length} PASS
            </Text>
            {pluginStatuses.map((s) => (
              <Row
                key={s.pluginId}
                ok={s.configuredForStali}
                exists={s.exists}
                name={`${s.pluginName} (${s.patchStyle})`}
                detail={s.configuredForStali ? s.model : s.exists ? "file có, chưa trỏ Stali" : "chưa có file"}
                path={s.configPath}
                compact={compact}
              />
            ))}
          </>
        ) : null}

        <Menu
          groups={[{ items }]}
          onSelect={(value) => {
            if (value === "gateway-auto" && onGatewayAuto) onGatewayAuto();
            else if (value === "fix-tools" && onFixAllTools) onFixAllTools();
            else if (value === "sync-plugins" && onSyncAllPlugins) onSyncAllPlugins();
            else onBack();
          }}
          onBack={onBack}
        />
      </Box>
    </Card>
  );
};
