/**
 * Obsidian host adapter for reading the active File Explorer drag payload.
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
 * Extract the one file candidate represented by an Obsidian File Explorer drag.
 * Multi-file drags and other internal drag kinds are intentionally ignored because issue #30 is
 * a single-note navigation gesture rather than a generic Obsidian drop protocol.
 *
 * @param draggable Host drag-manager payload whose runtime shape is validated before use.
 * @returns The candidate object for a single File Explorer file, or `null` when unsupported.
 */
export function singleFileExplorerDragCandidate(draggable: unknown): FileDragCandidate | null {
  if (!draggable || typeof draggable !== "object") return null;
  const value = draggable as Record<string, unknown>;
  if (value.type === "file") {
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
 * Resolve the active Obsidian File Explorer drag to the Vault's current `TFile` of any type.
 * Resolving by path avoids trusting stale/private drag objects and also rejects folders,
 * editor-link drags and external operating-system drags.
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
