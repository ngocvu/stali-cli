import { loadStaliConfig } from "../services/config";
import { resolveStaliUrls } from "../utils/stali-urls";

export async function resolveApiKey(explicit?: string): Promise<string | undefined> {
  if (explicit?.trim()) return explicit.trim();
  const cfg = await loadStaliConfig();
  return cfg?.apiKey?.trim() || undefined;
}

export async function resolveBaseUrl(): Promise<string | undefined> {
  const cfg = await loadStaliConfig();
  return cfg?.baseUrl;
}

export async function resolveStaliUrlsFromConfig() {
  const cfg = await loadStaliConfig();
  return resolveStaliUrls(cfg?.baseUrl);
}
