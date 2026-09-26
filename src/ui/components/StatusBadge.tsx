import React from "react";
import { Text } from "ink";
import { colors, glyphs, type Tone } from "../theme";

export type BadgeStatus = "pass" | "warn" | "fail" | "info" | "idle";

const STATUS: Record<
  BadgeStatus,
  { icon: string; label: string; color: string; tone: Tone }
> = {
  pass: { icon: glyphs.check, label: "PASS", color: colors.success, tone: "success" },
  warn: { icon: glyphs.warn, label: "WARN", color: colors.warning, tone: "warning" },
  fail: { icon: glyphs.cross, label: "FAIL", color: colors.error, tone: "error" },
  info: { icon: glyphs.info, label: "INFO", color: colors.info, tone: "info" },
  idle: { icon: glyphs.dotOff, label: "IDLE", color: colors.muted, tone: "muted" },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  count?: number;
  filled?: boolean;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  count,
  filled = false,
  label,
}) => {
  const meta = STATUS[status];
  const text = label ?? meta.label;
  const suffix = count !== undefined ? ` ${count}` : "";
  const body = ` ${meta.icon} ${text}${suffix} `;

  if (filled) {
    return (
      <Text backgroundColor={meta.color} color="black" bold>
        {body}
      </Text>
    );
  }

  return (
    <Text color={meta.color} bold>
      {body.trim()}
    </Text>
  );
};

export function statusFromHealth(ok: boolean, exists?: boolean): BadgeStatus {
  if (ok) return "pass";
  if (exists === false) return "warn";
  return "warn";
}
