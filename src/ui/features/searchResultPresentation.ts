/**
 * Pure Find-result icon selection from explicit node/file facets. The native shell renders these
 * Lucide names through Obsidian; no graph mutation, metadata reads or extension-derived identity lives here.
 */
import type { GraphNodeView } from "../../core/graph/model";

const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "heic", "heif", "jpeg", "jpg", "png", "svg", "webp"]);
const VIDEO_EXTENSIONS = new Set(["3gp", "m4v", "mkv", "mov", "mp4", "ogv", "webm"]);
const AUDIO_EXTENSIONS = new Set(["aac", "aif", "aiff", "flac", "m4a", "mp3", "ogg", "opus", "wav"]);

/** Preserve the explicit semantic type; extension only refines an already classified attachment. */
export function searchResultIconName(node: Pick<GraphNodeView, "kind"> & { file?: { extension: string } | null }): string {
  switch (node.kind) {
    case "container": return "folder";
    case "tag": return "tags";
    case "url": return "globe";
    case "document": return "file-text";
    case "unresolved": return "file-question";
    case "attachment": {
      const extension = node.file?.extension.toLowerCase() ?? "";
      if (IMAGE_EXTENSIONS.has(extension)) return "image";
      if (VIDEO_EXTENSIONS.has(extension)) return "video";
      if (AUDIO_EXTENSIONS.has(extension)) return "audio-lines";
      if (extension === "pdf") return "file-text";
      if (extension === "canvas") return "layout-dashboard";
      return "paperclip";
    }
  }
}
