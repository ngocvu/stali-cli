import fs from "fs/promises";
import { StaliConfigFile, StaliConfigFileSchema } from "../types";
import { readJsonFile, writeJsonFile } from "../utils/file";
import { STALI_OPENAI_BASE_URL } from "../constants/api";
import {
  getStaliConfigPath,
  getStaliHome,
} from "../constants/paths";

export { getStaliHome, getStaliConfigPath } from "../constants/paths";
export { getStaliCliInstallDir, getStaliBinDir } from "../constants/paths";

/** @deprecated use getStaliHome() */
export function getStaliConfigDir(): string {
  return getStaliHome();
}

/**
 * Read Stali config file (~/.stali/config.json)
 */
export async function loadStaliConfig(): Promise<StaliConfigFile | null> {
  const configPath = getStaliConfigPath();
  const data = await readJsonFile(configPath);
  if (!data) return null;

  const parsed = StaliConfigFileSchema.safeParse(data);
  if (parsed.success) {
    return parsed.data;
  }
  return null;
}

/**
 * Save or update Stali config file (~/.stali/config.json)
 */
export async function saveStaliConfig(
  updates: Partial<StaliConfigFile>
): Promise<StaliConfigFile> {
  const current = (await loadStaliConfig()) || {
    apiKey: "",
    baseUrl: STALI_OPENAI_BASE_URL,
    configuredApps: {},
  };

  const updated: StaliConfigFile = {
    ...current,
    ...updates,
    configuredApps: {
      ...(current.configuredApps || {}),
      ...(updates.configuredApps || {}),
    },
    lastUpdated: new Date().toISOString(),
  };

  await writeJsonFile(getStaliConfigPath(), updated, { secure: true });
  return updated;
}

/**
 * Load config with explicit corrupt-file signal
 */
export async function loadStaliConfigOrCorrupt(): Promise<{
  config: StaliConfigFile | null;
  corrupt: boolean;
}> {
  const configPath = getStaliConfigPath();
  const data = await readJsonFile(configPath);
  if (!data) {
    try {
      await fs.access(configPath);
      return { config: null, corrupt: true };
    } catch {
      return { config: null, corrupt: false };
    }
  }

  const parsed = StaliConfigFileSchema.safeParse(data);
  if (parsed.success) {
    return { config: parsed.data, corrupt: false };
  }
  return { config: null, corrupt: true };
}

/**
 * Reset / clear Stali config file
 */
export async function resetStaliConfig(): Promise<boolean> {
  try {
    await fs.unlink(getStaliConfigPath());
    return true;
  } catch {
    return false;
  }
}
