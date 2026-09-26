import { useInput } from "ink";

/**
 * Esc always goes back. Letter `b` only when `letter` is true
 * (disabled while a TextInput is capturing keystrokes).
 */
export function useBackNav(onBack?: () => void, letter = true): void {
  useInput((input, key) => {
    if (!onBack) return;
    if (key.escape) {
      onBack();
      return;
    }
    if (letter && (input === "b" || input === "B") && !key.ctrl && !key.meta) {
      onBack();
    }
  });
}
