import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface ChecksumManifest {
  version: string;
  files: Record<string, string>;
}

export async function loadChecksumManifest(
  installRoot: string
): Promise<ChecksumManifest | null> {
  const manifestPath = path.join(installRoot, "dist", "checksums.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(raw) as ChecksumManifest;
  } catch {
    return null;
  }
}

export async function verifyDistChecksums(
  installRoot: string
): Promise<{ ok: boolean; checked: number; errors: string[] }> {
  const manifest = await loadChecksumManifest(installRoot);
  if (!manifest?.files) {
    return { ok: true, checked: 0, errors: [] };
  }

  const errors: string[] = [];
  let checked = 0;
  for (const [rel, expected] of Object.entries(manifest.files)) {
    const filePath = path.join(installRoot, rel);
    try {
      const buf = await fs.readFile(filePath);
      const hash = crypto.createHash("sha256").update(buf).digest("hex");
      checked++;
      if (hash !== expected) {
        errors.push(`${rel}: checksum mismatch`);
      }
    } catch {
      errors.push(`${rel}: missing`);
    }
  }
  return { ok: errors.length === 0, checked, errors };
}
