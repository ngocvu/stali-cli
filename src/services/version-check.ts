import { VERSION } from "../version";

const DEFAULT_RAW_PKG =
  "https://raw.githubusercontent.com/ngocvu/stali-cli/main/package.json";

export interface VersionCheckResult {
  current: string;
  latest: string;
  updateAvailable: boolean;
  source: string;
}

function parseSemver(v: string): number[] {
  return v.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
}

/** So sánh semver: true nếu latest > current */
export function isNewerVersion(current: string, latest: string): boolean {
  const a = parseSemver(current);
  const b = parseSemver(latest);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (bv > av) return true;
    if (bv < av) return false;
  }
  return false;
}

export async function fetchLatestVersion(
  rawUrl = process.env.STALI_CLI_VERSION_URL || DEFAULT_RAW_PKG
): Promise<VersionCheckResult> {
  const current = VERSION;
  try {
    const res = await fetch(rawUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { current, latest: current, updateAvailable: false, source: "unavailable" };
    }
    const data = (await res.json()) as { version?: string };
    const latest = data.version?.trim() || current;
    return {
      current,
      latest,
      updateAvailable: isNewerVersion(current, latest),
      source: rawUrl,
    };
  } catch {
    return { current, latest: current, updateAvailable: false, source: "error" };
  }
}


/** Phiên bản mới nhất trên npm registry (ưu tiên cho `npm install -g`). */
export async function fetchNpmLatestVersion(): Promise<VersionCheckResult> {
  return fetchNpmVersionForChannel("stable");
}

/** Phiên bản theo npm dist-tag (latest | beta). */
export async function fetchNpmVersionForChannel(
  channel: "stable" | "beta" | string = "stable"
): Promise<VersionCheckResult> {
  const current = VERSION;
  const tag = channel.toLowerCase() === "beta" ? "beta" : "latest";
  const url = `https://registry.npmjs.org/stali-cli/${tag}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { current, latest: current, updateAvailable: false, source: `npm-${tag}-unavailable` };
    }
    const data = (await res.json()) as { version?: string };
    const latest = data.version?.trim() || current;
    return {
      current,
      latest,
      updateAvailable: isNewerVersion(current, latest),
      source: `npm:${tag}`,
    };
  } catch {
    return { current, latest: current, updateAvailable: false, source: `npm-${tag}-error` };
  }
}
