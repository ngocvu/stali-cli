import { useWindowSize } from "ink";
import {
  COMPACT_COLUMNS,
  NARROW_COLUMNS,
  getBorderStyle,
  spinnerType,
  supportsUnicode,
} from "../theme";

export function useTerminalLayout() {
  const { columns, rows } = useWindowSize();
  const cols = columns || 80;
  const rws = rows || 24;
  return {
    columns: cols,
    rows: rws,
    unicode: supportsUnicode(),
    compact: cols < COMPACT_COLUMNS,
    narrow: cols < NARROW_COLUMNS,
    borderStyle: getBorderStyle(),
    spinnerType,
  };
}
