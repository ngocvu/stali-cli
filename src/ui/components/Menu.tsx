import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { colors, glyphs } from "../theme";
import { useTerminalLayout } from "../hooks/useTerminalLayout";

export type MenuItem<T extends string = string> = {
  label: string;
  value: T;
  description?: string;
  hint?: string;
  icon?: string;
  disabled?: boolean;
};

export type MenuGroup<T extends string = string> = {
  title?: string;
  items: MenuItem<T>[];
};

interface MenuProps<T extends string> {
  groups: MenuGroup<T>[];
  onSelect: (value: T) => void;
  onBack?: () => void;
  letterBack?: boolean;
}

export function Menu<T extends string>({
  groups,
  onSelect,
  onBack,
  letterBack = true,
}: MenuProps<T>) {
  const { compact, columns } = useTerminalLayout();
  const items = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const enabled = useMemo(
    () => items.map((it, i) => (!it.disabled ? i : -1)).filter((i) => i >= 0),
    [items]
  );

  const [index, setIndex] = useState(() => enabled[0] ?? 0);

  useEffect(() => {
    if (!enabled.includes(index)) {
      setIndex(enabled[0] ?? 0);
    }
  }, [enabled, index]);

  const move = (dir: 1 | -1) => {
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(index);
    const start = pos < 0 ? 0 : pos;
    const next = enabled[(start + dir + enabled.length) % enabled.length];
    setIndex(next);
  };

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      move(-1);
      return;
    }
    if (key.downArrow || input === "j") {
      move(1);
      return;
    }
    if (key.return) {
      const it = items[index];
      if (it && !it.disabled) onSelect(it.value);
      return;
    }
    if (key.escape) {
      onBack?.();
      return;
    }
    if (letterBack && (input === "b" || input === "B") && !key.ctrl && !key.meta) {
      onBack?.();
    }
  });

  let flat = -1;
  const hintWidth = compact ? 0 : Math.min(28, Math.max(10, columns - 48));

  return (
    <Box flexDirection="column">
      {groups.map((group, gi) => (
        <Box key={group.title ?? `g${gi}`} flexDirection="column" marginTop={gi === 0 ? 0 : 1}>
          {group.title ? (
            <Text color={colors.muted} bold>
              {group.title}
            </Text>
          ) : null}
          {group.items.map((item) => {
            flat += 1;
            const i = flat;
            const selected = i === index;
            const color = item.disabled
              ? colors.muted
              : selected
              ? colors.accent
              : colors.text;
            const pointer = selected ? glyphs.pointer : " ";
            const label = item.icon ? `${item.icon} ${item.label}` : item.label;
            return (
              <Box key={`${item.value}-${i}`} justifyContent="space-between">
                <Box>
                  <Text color={selected ? colors.accent : colors.muted} bold={selected}>
                    {pointer}{" "}
                  </Text>
                  <Text color={color} bold={selected} dimColor={item.disabled}>
                    {label}
                  </Text>
                  {!compact && item.description ? (
                    <Text color={colors.muted}>  {item.description}</Text>
                  ) : null}
                </Box>
                {!compact && item.hint ? (
                  <Text color={selected ? colors.accent : colors.muted}>
                    {item.hint.length > hintWidth
                      ? item.hint.slice(0, Math.max(0, hintWidth - 1)) + glyphs.ellipsis
                      : item.hint}
                  </Text>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

/** Convenience wrapper when there is a single flat list. */
export function itemsToGroups<T extends string>(items: MenuItem<T>[]): MenuGroup<T>[] {
  return [{ items }];
}
