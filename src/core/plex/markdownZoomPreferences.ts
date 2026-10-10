/**
 * Portable, per-note Markdown editor zoom preferences. Missing entries retain fixed on-screen font
 * size; only scale-with-Plex overrides are persisted. Vault listeners own renames/deletes and disk
 * writes. This owner never reads files, controls editor lifetimes or changes graph/index policy.
 */
export type MarkdownZoomMode = "fixed" | "scale";
export type MarkdownZoomModes = Record<string, "scale">;
/** Accept a relative Markdown vault path without normalizing case, Unicode or filename spaces. */
function isMarkdownPath(path: string): boolean {
  return path.length > 0 && /\.md$/i.test(path)
    && !path.startsWith("/") && !path.includes("\0") && !path.split("/").some(
      /** Dot and empty segments cannot denote an actual Vault file path. */ segment => !segment || segment === "." || segment === "..",
    );
}

/** Decode own data properties only; work scales with saved preferences and never scans the Vault. */
export function sanitizeMarkdownZoomModes(input: unknown): MarkdownZoomModes {
  const result: MarkdownZoomModes = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return result;
  for (const path of Object.keys(input)) {
    if (isMarkdownPath(path) && Object.getOwnPropertyDescriptor(input, path)?.value === "scale") {
      result[path] = "scale";
    }
  }
  return result;
}

/** Read an exact case-sensitive file preference; inherited properties and absent entries are fixed. */
export function markdownZoomMode(preferences: MarkdownZoomModes, path: string): MarkdownZoomMode {
  return Object.getOwnPropertyDescriptor(preferences, path)?.value === "scale" ? "scale" : "fixed";
}

/**
 * Return an immutable sparse update. Fixed removes the override; identical/invalid choices preserve
 * the original map. Choices are durable user data, so no capacity eviction is applied.
 */
export function withMarkdownZoomMode(preferences: MarkdownZoomModes, path: string, mode: MarkdownZoomMode): MarkdownZoomModes {
  if (!isMarkdownPath(path) || (mode !== "scale" && mode !== "fixed") || markdownZoomMode(preferences, path) === mode) return preferences;
  const result = { ...preferences };
  if (mode === "scale") result[path] = "scale";
  else delete result[path];
  return result;
}

/** Retire one exact file or a folder subtree; sibling path prefixes are never treated as descendants. */
export function removeMarkdownZoomModes(preferences: MarkdownZoomModes, path: string, folder = false): MarkdownZoomModes {
  let result = preferences;
  for (const storedPath of Object.keys(preferences)) {
    if (storedPath !== path && !(folder && storedPath.startsWith(`${path}/`))) continue;
    if (result === preferences) result = { ...preferences };
    delete result[storedPath];
  }
  return result;
}

/**
 * Move exact file/subtree preferences without reading the Vault. The moved file's explicit choice
 * wins a stale destination override. Changing the extension away from Markdown retires its choice.
 */
export function renameMarkdownZoomModes(preferences: MarkdownZoomModes, oldPath: string, newPath: string, folder = false): MarkdownZoomModes {
  if (oldPath === newPath) return preferences;
  const affected = Object.keys(preferences).filter(
    /** Slash-qualified membership prevents moving similarly named sibling folders. */ path => path === oldPath || (folder && path.startsWith(`${oldPath}/`)),
  );
  if (!affected.length) return preferences;
  const result = { ...preferences };
  for (const path of affected) delete result[path];
  for (const path of affected) {
    const movedPath = newPath + path.slice(oldPath.length);
    if (isMarkdownPath(movedPath)) result[movedPath] = "scale";
  }
  return result;
}
