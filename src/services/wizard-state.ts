import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { getStaliHome } from "../constants/paths";

export interface WizardState {
  /** Đã hiển thị gateway onboarding sau login lần đầu. */
  gatewayOnboardingSeen?: boolean;
}

function statePath(): string {
  return path.join(getStaliHome(), "wizard-state.json");
}

export async function loadWizardState(): Promise<WizardState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw) as WizardState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveWizardState(patch: Partial<WizardState>): Promise<void> {
  const current = await loadWizardState();
  const next = { ...current, ...patch };
  const file = statePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}
