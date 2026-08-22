import path from "path";
import os from "os";
import fs from "fs/promises";
import { StaliConfigFile, StaliConfigFileSchema } from "../types";
import { readJsonFile, writeJsonFile } from "../utils/file";
import { STALI_OPENAI_BASE_URL } from "../constants/api";

const STALI_CONFIG_DIR = path.join(os.homedir(), ".stali");
const STALI_CONFIG_PATH = path.join(STALI_CONFIG_DIR, "config.json");

/**
 * Get config directory path (~/.stali)
 */
export function getStaliConfigDir(): string {
  return STALI_CONFIG_DIR;
}

/**
 * Get config file path (~/.stali/config.json)
 */
export function getStaliConfigPath(): string {
  return STALI_CONFIG_PATH;
}

/**
 * Read Stali config file (~/.stali/config.json)
 */
export async function loadStaliConfig(): Promise<StaliConfigFile | null> {
  const data = await readJsonFile(STALI_CONFIG_PATH);
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

  await writeJsonFile(STALI_CONFIG_PATH, updated, { secure: true });
  return updated;
}

/**
 * Load config with explicit corrupt-file signal
 */
export async function loadStaliConfigOrCorrupt(): Promise<{
  config: StaliConfigFile | null;
  corrupt: boolean;
}> {
  const data = await readJsonFile(STALI_CONFIG_PATH);
  if (!data) {
    try {
      await fs.access(STALI_CONFIG_PATH);
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
    await fs.unlink(STALI_CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}
