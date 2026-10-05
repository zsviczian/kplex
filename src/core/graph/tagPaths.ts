/**
 * Canonical lexical tag paths shared by host identity construction, neutral dependency projection
 * and compiler hierarchy materialization. Paths describe raw tag spelling; opaque IDs, source
 * authority, semantic roles and persistence remain owned by their existing consumers.
 */

/** Preserve canonical segment trimming/empty filtering without retaining growing ancestor strings. */
export function canonicalTagParts(rawTag: string): string[] {
  return rawTag.replace(/^#/, "").split("/").map(
    /** Raw spellings retain provenance; only the explicit semantic coordinate trims segments. */
    part => part.trim()).filter(Boolean);
}

/** Normalize a host tag spelling and enumerate each complete ancestor through its leaf in order. */
export function* canonicalTagPaths(rawTag: string): IterableIterator<string> {
  let path = "";
  for (const name of canonicalTagParts(rawTag)) {
    path = path ? `${path}/${name}` : name;
    yield `tag:${path}`;
  }
}
