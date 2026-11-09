/** Bounded public build labels for diagnostics; accepts only release, Git/archive and local UTC forms. */

/** Validate a literal build label without coercing objects, accepting arbitrary suffixes or retaining private strings. */
export function diagnosticBuildIdentity(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 100) return null;
  if (value === "source-archive") return value;
  const match = /^(\d{1,5}\.\d{1,5}\.\d{1,5}(?:-(?:alpha|beta|rc)\.\d{1,5})?)(?:\+(?:[a-f0-9]{12}(?:\.dirty)?|source-archive)(?:\.local\.(\d{8}T\d{9}Z))?)?$/.exec(value);
  if (!match) return null;
  const stamp = match[2];
  if (stamp) {
    const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}.${stamp.slice(15, 18)}Z`;
    const time = Date.parse(iso);
    if (!Number.isFinite(time) || new Date(time).toISOString() !== iso) return null;
  }
  return value;
}
/** Manifest identity has a bounded public release grammar, independently of embedded build data. */
export function diagnosticManifestVersion(value: unknown): string | null {
  return typeof value === "string" && /^\d{1,5}\.\d{1,5}\.\d{1,5}(?:-(?:alpha|beta|rc)\.\d{1,5})?$/.test(value) ? value : null;
}
