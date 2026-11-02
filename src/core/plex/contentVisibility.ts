/** Finite section-scoped visibility values shared by native Settings and Views and lenses.
 * This presentation policy stages booleans only; persistence and rendering remain host-owned. */
export const COMMON_CONTENT_VISIBILITY = ["showPageNodes", "showAttachments", "showFolderNodes", "showTagNodes", "showURLNodes", "showVirtualNodes", "showInferredNodes", "showCrossLinks"] as const;
export type ContentVisibilityKey = typeof COMMON_CONTENT_VISIBILITY[number] | "showNeighborCount" | "renderSiblings";
export type ContentVisibilityScope = "settings" | "lenses";
export type ContentVisibilityValues = Readonly<Partial<Record<ContentVisibilityKey, boolean>>>;

/** Return only boolean controls present in the invoking section, with their existing ownership. */
export function contentVisibilityKeys(scope: ContentVisibilityScope): readonly ContentVisibilityKey[] {
  return [...COMMON_CONTENT_VISIBILITY, scope === "settings" ? "showNeighborCount" : "renderSiblings"];
}

/** Stage explicit changed values together; an empty patch is a true no-op, including mixed-state repeats. */
export function contentVisibilityPatch(values: ContentVisibilityValues, scope: ContentVisibilityScope, enabled: boolean): Partial<Record<ContentVisibilityKey, boolean>> {
  const patch: Partial<Record<ContentVisibilityKey, boolean>> = {};
  for (const key of contentVisibilityKeys(scope)) if (values[key] !== enabled) patch[key] = enabled;
  return patch;
}
