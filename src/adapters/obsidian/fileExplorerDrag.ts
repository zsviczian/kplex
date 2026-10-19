/**
 * Obsidian host adapter for reading active single-file and resolved internal-link drags.
 * The host's drag manager is not part of the public typed API, so this module owns the narrow,
 * guarded compatibility bridge and returns current Vault files of any type to host-bound UI.
 */
import type { App, TFile } from "obsidian";

type DragManagerBridge = {
  draggable?: unknown;
};

type AppDragBridge = {
  dragManager?: DragManagerBridge;
};

type FileDragCandidate = {
  path?: unknown;
};

/** Narrow an untrusted drag value to an object that exposes a path for Vault resolution. */
function hasFilePath(value: unknown): value is FileDragCandidate {
  return Boolean(value && typeof value === "object" && "path" in value);
}

/**
 * Extract one file from File Explorer or the resolved link payload used by Bases and note links.
 * Require the native link context as well as a resolved file; unresolved/external links and
 * multi-file selections cannot choose an arbitrary graph endpoint. No plain-text drop is parsed.
 *
 * @param draggable Host drag-manager payload whose runtime shape is validated before use.
 * @returns The candidate for one native file or resolved link, or `null` when unsupported.
 */
export function singleFileExplorerDragCandidate(draggable: unknown): FileDragCandidate | null {
  if (!draggable || typeof draggable !== "object") return null;
  const value = draggable as Record<string, unknown>;
  if (value.type === "file") {
    return hasFilePath(value.file) ? value.file : null;
  }
  if (value.type === "link" && typeof value.linktext === "string" && value.linktext.trim()
    && typeof value.sourcePath === "string") {
    return hasFilePath(value.file) ? value.file : null;
  }
  if (value.type === "files") {
    if (!Array.isArray(value.files) || value.files.length !== 1) return null;
    const candidate: unknown = value.files[0];
    return hasFilePath(candidate) ? candidate : null;
  }
  return null;
}

/**
 * Resolve a supported native file/link drag to the Vault's current `TFile` of any type.
 * Resolving by path avoids trusting stale/private file objects and rejects folders and
 * external operating-system drags. Native link resolution remains owned by Obsidian.
 *
 * @param app Obsidian application instance owning the Vault and internal drag manager.
 * @returns The current file for a supported single-file drag, otherwise `null`.
 */
export function getDraggedFile(app: App): TFile | null {
  // Obsidian does not expose dragManager in its public type declarations. Keep the compatibility
  // bridge isolated here; Excalidraw uses the same host object for File Explorer drag handling.
  const draggable = (app as unknown as AppDragBridge).dragManager?.draggable;
  const candidate = singleFileExplorerDragCandidate(draggable);
  if (!candidate || typeof candidate.path !== "string") return null;
  const file = app.vault.getFileByPath(candidate.path);
  return file;
}

/** Retain the Markdown-only facade for callers whose operation specifically requires a note. */
export function getDraggedMarkdownFile(app: App): TFile | null {
  const file = getDraggedFile(app);
  return file?.extension.toLowerCase() === "md" ? file : null;
}
