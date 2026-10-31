/** Owning-document PNG clipboard and native file handoff. Browser capabilities are feature-detected;
 * no Electron/Node writer, Vault mutation or source/index owner is involved. */
import {Platform} from "obsidian";
import {artifactFilename} from "../../core/plex/export/artifactFilename";

/** Start native image writes directly in the click handler, preserving the correct window's activation. */
export function pngClipboardWriter(document: Document): ((blob: Blob) => Promise<void>) | null {
  const owner = document.defaultView;
  if (!owner?.navigator.clipboard?.write || typeof owner.ClipboardItem !== "function") return null;
  return /** Payload is already encoded before the user presses Copy PNG. */ blob => owner.navigator.clipboard.write([new owner.ClipboardItem({"image/png": blob})]);
}

/** Check the real file-sharing capability on mobile; desktop uses the native browser download flow. */
export function canSavePng(document: Document, blob: Blob): boolean {
  const owner = document.defaultView;if (!owner) return false;
  if (Platform.isDesktopApp) return typeof owner.URL.createObjectURL === "function";
  try {return typeof owner.navigator.share === "function" && owner.navigator.canShare?.({files: [new owner.File([blob], "canvas.png", {type: "image/png"})]}) === true;}
  catch {return false;}
}

/** Hand an immutable PNG to the system; completion reports handoff, never an unverified successful save. */
export async function savePng(document: Document, filename: string, blob: Blob, current: () => boolean): Promise<void> {
  if (artifactFilename(filename, "png") !== filename || !current() || !canSavePng(document, blob)) throw new Error("Native PNG export unavailable");
  const owner = document.defaultView;if (!owner) throw new Error("Native PNG document retired");
  if (!Platform.isDesktopApp) {await owner.navigator.share({files: [new owner.File([blob], filename, {type: "image/png"})]});return;}
  const url = owner.URL.createObjectURL(blob), fragment = document.adoptNode(createFragment());
  try {fragment.createEl("a", {attr: {href: url, download: filename}}).click();}
  finally {owner.URL.revokeObjectURL(url);fragment.replaceChildren();}
}
