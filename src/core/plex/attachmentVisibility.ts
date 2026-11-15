/** Extension-only attachment presentation policy. This owns no file reads, MIME probing,
 * relationship semantics or image decoding support; unknown formats stay in Other attachments. */
export const ATTACHMENT_VISIBILITY_KEYS = ["showDocumentAttachments", "showImageAttachments", "showMediaAttachments", "showOtherAttachments"] as const;
export type AttachmentVisibilityKey = typeof ATTACHMENT_VISIBILITY_KEYS[number];
export type AttachmentVisibilitySettings = Readonly<Partial<Record<AttachmentVisibilityKey | "showAttachments", boolean>>>;
export type AttachmentCategory = "document" | "image" | "media" | "other";
const documents = new Set(["pdf", "epub", "mobi", "azw", "azw3", "djvu", "doc", "docx", "odt", "rtf", "txt", "text", "log", "tex", "csv", "tsv", "xls", "xlsx", "ods", "ppt", "pptx", "odp", "pages", "numbers", "key", "html", "htm", "mhtml", "xml", "json", "yaml", "yml", "toml", "ini", "cfg", "conf", "canvas", "base"]);
const images = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "tif", "tiff", "heic", "heif", "ico", "apng", "excalidraw"]);
const media = new Set(["mp3", "mp4", "avi", "wav", "flac", "ogg", "oga", "ogv", "opus", "aac", "m4a", "m4v", "mov", "mkv", "webm", "wma", "wmv", "mpeg", "mpg", "mid", "midi", "aif", "aiff", "3gp", "mts", "m2ts"]);
const categoryKeys: Readonly<Record<AttachmentCategory, AttachmentVisibilityKey>> = {document: "showDocumentAttachments", image: "showImageAttachments", media: "showMediaAttachments", other: "showOtherAttachments"};

/** Classify a native file extension case-insensitively; Markdown remains a separate caller-owned kind. */
export function attachmentCategory(extension: string): AttachmentCategory {
  const value = extension.replace(/^\./, "").toLowerCase();
  return documents.has(value) ? "document" : images.has(value) ? "image" : media.has(value) ? "media" : "other";
}

/** Keep the historical aggregate as a compatibility gate; missing category flags inherit it. */
export function captureAttachmentVisibility(settings: AttachmentVisibilitySettings): Record<AttachmentVisibilityKey, boolean> {
  const legacy = settings.showAttachments !== false;
  return {showDocumentAttachments: legacy && settings.showDocumentAttachments !== false,
    showImageAttachments: legacy && settings.showImageAttachments !== false,
    showMediaAttachments: legacy && settings.showMediaAttachments !== false,
    showOtherAttachments: legacy && settings.showOtherAttachments !== false};
}

/** Canvas visibility and authenticated cached gate counts consume exactly the same category policy. */
export function isAttachmentVisible(extension: string, settings: AttachmentVisibilitySettings): boolean {
  return settings.showAttachments !== false && settings[categoryKeys[attachmentCategory(extension)]] !== false;
}

/** A normalized signature distinguishes an inherited legacy value from an explicitly disabled category. */
export function attachmentVisibilitySignature(settings: AttachmentVisibilitySettings): string {
  const values = captureAttachmentVisibility(settings);return ATTACHMENT_VISIBILITY_KEYS.map(/** One stable bit per displayed category. */ key => values[key] ? "1" : "0").join("");
}

/** Explicit legacy all-attachment changes still update every category. A category edit lifts a
 * previously disabled legacy gate, so the new controls never become checked-but-ineffective. */
export function reconcileAttachmentVisibility(current: AttachmentVisibilitySettings, previous: AttachmentVisibilitySettings): Partial<Record<AttachmentVisibilityKey | "showAttachments", boolean>> {
  if (typeof current.showAttachments === "boolean" && typeof previous.showAttachments === "boolean" && current.showAttachments !== previous.showAttachments)
    return Object.fromEntries(ATTACHMENT_VISIBILITY_KEYS.map(/** Legacy callers retain their all-on/all-off operation. */ key => [key, current.showAttachments]));
  if (ATTACHMENT_VISIBILITY_KEYS.some(/** Only an explicit category edit can lift the compatibility gate. */ key => typeof current[key] === "boolean" && current[key] !== previous[key])) return {showAttachments: true};
  return {};
}
