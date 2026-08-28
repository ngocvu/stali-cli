export type UpdateChannel = "stable" | "beta";

export interface UpdateChannelConfig {
  channel: UpdateChannel;
  branch: string;
  versionUrl: string;
  label: string;
}

const REPO_RAW = "https://raw.githubusercontent.com/ngocvu/stali-cli";

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
