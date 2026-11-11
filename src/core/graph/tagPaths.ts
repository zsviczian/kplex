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

/** Validate a singular user-entered tag without inventing a slug or flattening a hierarchy.
 * Native authoring accepts Unicode letters, marks, numbers and symbols, but not a bare
 * ASCII number. Require nonempty hierarchy segments even where the native lexer is permissive.
 * One optional leading hashtag is cosmetic. */
export function noteTypeTag(value: string | null): string | null {
  const tag = value?.trim().replace(/^#/, "") ?? "";
  return tag && /^[\p{L}\p{M}\p{N}\p{S}_/-]+$/u.test(tag) && !/[+$^|<=>~`]/.test(tag) && !/^[0-9]+$/.test(tag)
    && !/^\/|\/$|\/\//.test(tag) ? tag : null;
}

/** Normalize a host tag spelling and enumerate each complete ancestor through its leaf in order. */
export function* canonicalTagPaths(rawTag: string): IterableIterator<string> {
  let path = "";
  for (const name of canonicalTagParts(rawTag)) {
    path = path ? `${path}/${name}` : name;
    yield `tag:${path}`;
  }
}
