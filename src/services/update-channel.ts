export type UpdateChannel = "stable" | "beta";

export interface UpdateChannelConfig {
  channel: UpdateChannel;
  /** git ref: branch, tag, or release tag */
  branch: string;
  versionUrl: string;
  label: string;
  releaseTag?: string;
}

const REPO_RAW = "https://raw.githubusercontent.com/ngocvu/stali-cli";
const DEFAULT_REPO = "ngocvu/stali-cli";

export function resolveUpdateChannel(input?: string): UpdateChannelConfig {
  const raw = (input || "stable").toLowerCase();
  if (raw === "beta") {
    return {
      channel: "beta",
      branch: process.env.STALI_CLI_BETA_BRANCH || "beta",
      versionUrl: process.env.STALI_CLI_BETA_VERSION_URL || `${REPO_RAW}/beta/package.json`,
      label: "beta",
    };
  }
  return {
    channel: "stable",
    branch: process.env.STALI_CLI_BRANCH || "main",
    versionUrl: process.env.STALI_CLI_VERSION_URL || `${REPO_RAW}/main/package.json`,
    label: "stable",
  };
}

function rawPkgUrlForTag(tag: string): string {
  const t = tag.startsWith("v") ? tag : `v${tag}`;
  return `${REPO_RAW}/${t}/package.json`;
}

/** Resolve channel + optional GitHub Release tag for stable/beta. */
export async function resolveUpdateChannelResolved(
  input?: string
): Promise<UpdateChannelConfig> {
  const base = resolveUpdateChannel(input);
  const repo = process.env.STALI_CLI_GITHUB_REPO || DEFAULT_REPO;
  const { fetchLatestGithubRelease, fetchLatestPrereleaseTag } = await import("./github-release");

  if (base.channel === "stable") {
    const release = await fetchLatestGithubRelease(repo);
    if (release?.tag) {
      return {
        ...base,
        branch: release.tag,
        versionUrl: rawPkgUrlForTag(release.tag),
        releaseTag: release.tag,
        label: `stable (${release.tag})`,
      };
    }
    return base;
  }

  const pre = await fetchLatestPrereleaseTag(repo);
  if (pre) {
    return {
      ...base,
      branch: pre,
      versionUrl: rawPkgUrlForTag(pre),
      releaseTag: pre,
      label: `beta (${pre})`,
    };
  }
  return base;
}
