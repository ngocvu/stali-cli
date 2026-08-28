const DEFAULT_REPO = "ngocvu/stali-cli";

export interface GithubReleaseInfo {
  tag: string;
  name: string;
  publishedAt: string;
}

/** Latest non-draft GitHub Release tag (e.g. v3.7.0). */
export async function fetchLatestGithubRelease(
  repo = process.env.STALI_CLI_GITHUB_REPO || DEFAULT_REPO
): Promise<GithubReleaseInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "stali-cli",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      tag_name?: string;
      name?: string;
      published_at?: string;
      draft?: boolean;
      prerelease?: boolean;
    };
    if (!data.tag_name || data.draft) return null;
    return {
      tag: data.tag_name,
      name: data.name || data.tag_name,
      publishedAt: data.published_at || "",
    };
  } catch {
    return null;
  }
}

export interface GithubReleaseAsset {
  name: string;
  url: string;
  size: number;
}

/** Assets attached to a GitHub Release tag (e.g. stali-standalone). */
export async function fetchReleaseAssets(
  tag: string,
  repo = process.env.STALI_CLI_GITHUB_REPO || DEFAULT_REPO
): Promise<GithubReleaseAsset[]> {
  const t = tag.startsWith("v") ? tag : `v${tag}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${t}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "stali-cli",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      assets?: Array<{ name?: string; browser_download_url?: string; size?: number }>;
    };
    return (data.assets || [])
      .filter((a) => a.name && a.browser_download_url)
      .map((a) => ({
        name: a.name!,
        url: a.browser_download_url!,
        size: a.size || 0,
      }));
  } catch {
    return [];
  }
}

export async function fetchLatestPrereleaseTag(
  repo = process.env.STALI_CLI_GITHUB_REPO || DEFAULT_REPO
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "stali-cli",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ tag_name?: string; prerelease?: boolean; draft?: boolean }>;
    const hit = data.find((r) => r.tag_name && r.prerelease && !r.draft);
    return hit?.tag_name || null;
  } catch {
    return null;
  }
}
