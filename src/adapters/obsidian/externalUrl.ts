/**
 * Obsidian host adapter for web-link activation in a K-Plex surface's owning document.
 *
 * Obsidian routes rendered external-link anchors to the Web Viewer when the user has configured it
 * to open external links, and otherwise delegates them to the device's default browser. Keeping the
 * activation on a real anchor also avoids treating a URL like a Vault file/workspace view.
 */
import type { App } from "obsidian";

/** Narrow, optional view-registry boundary; Obsidian's public SDK does not expose view availability. */
type AppWithViewRegistry = App & {
  viewRegistry?: { getViewCreatorByType?: (type: string) => unknown };
};

/**
 * Check that the native Web Viewer view is registered before assigning it to a Sidecar leaf.
 * Disabled/desktop-only core plugins have no creator; fail closed when the internal registry is absent.
 */
export function isWebViewerAvailable(app: App): boolean {
  return typeof (app as AppWithViewRegistry).viewRegistry?.getViewCreatorByType?.("webviewer") === "function";
}

/**
 * Activate a document-attached external link so the host chooses Web Viewer or the device browser.
 * The temporary anchor is removed synchronously, including when host activation throws.
 */
export function openExternalUrl(url: string, ownerDocument: Document): void {
  const link = ownerDocument.body.createEl("a");
  link.classList.add("external-link");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  try {
    link.click();
  } finally {
    link.remove();
  }
}
