/** npm dist-tag cho publish: prerelease → beta, còn lại → latest */
export function resolveNpmDistTag(version: string): "latest" | "beta" {
  if (/-(beta|alpha|rc)(\.|$|-)/i.test(version.trim())) {
    return "beta";
  }
  return "latest";
}
