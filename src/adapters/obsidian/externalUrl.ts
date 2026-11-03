/**
 * Obsidian host adapter for explicit supported-link activation in a surface's owning document.
 *
 * Obsidian routes rendered external-link anchors to the Web Viewer when the user has configured it
 * to open external links, and otherwise delegates them to the device's default browser. Keeping the
 * activation on a real anchor also avoids treating a URL like a Vault file/workspace view.
 * Obsidian protocol actions use the owning window's verified native route, bypassing web guests.
 */
import type { App } from "obsidian";
import {isObsidianUri, webUrlOrigin} from "./urlIdentity";

/** Narrow, optional view-registry boundary; Obsidian's public SDK does not expose view availability. */
type AppWithViewRegistry = App & {
  viewRegistry?: { getViewCreatorByType?: (type: string) => unknown };
};

/**
 * Check that the native Web Viewer view is registered before assigning it to a Sidecar leaf.
 * Disabled/desktop-only core plugins have no creator; fail closed when the internal registry is absent.
 * A supplied target must be HTTP(S); protocol actions have no web-view capability.
 */
export function isWebViewerAvailable(app: App, url?: string): boolean {
  return (url === undefined || webUrlOrigin(url) !== null) && typeof (app as AppWithViewRegistry).viewRegistry?.getViewCreatorByType?.("webviewer") === "function";
}

/**
 * Explicitly activate a supported URI or web link. Protocol actions bypass web interception;
 * web anchors are removed synchronously even on failure. Unsupported schemes remain inert.
 */
export function openExternalUrl(url: string, ownerDocument: Document): void {
  if (isObsidianUri(url)) {
    // Native CLI acceptance verifies this owning-window route, including encoded file headings.
    // Bypass web-specific interception: protocol actions run only after an explicit Open action.
    (ownerDocument.defaultView ?? window).open(url, "_blank", "noopener");return;
  }
  if (!webUrlOrigin(url)) return;
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
