/**
 * Guarded native settings-page navigation for host-bound cross-links. Obsidian's unpublished
 * page opener can complete without a truthy return; only explicit refusal triggers fallback.
 * No settings or vault data are changed, and native page/window lifetime stays host-owned.
 */
import type { App } from "obsidian";

/** Open an exact translated declarative path, preserving a successfully opened page instead of resetting it to the root. */
export function navigatePluginSettings(app: App, tabId: string, pagePath: readonly string[]): boolean {
  const controller = (app as unknown as { setting?: {
    open?: () => void;
    openPagePath?: (id: string, path: string[]) => unknown;
    findTabById?: (id: string) => unknown;
    navigateToPage?: (tab: unknown, path: string[]) => unknown;
  } }).setting;
  try {
    if (!controller?.open) return false;
    controller.open();
    if (typeof controller.openPagePath === "function") {
      const result = controller.openPagePath(tabId, [...pagePath]);
      return result !== null && result !== false;
    }
    if (typeof controller.findTabById !== "function" || typeof controller.navigateToPage !== "function") return false;
    const tab = controller.findTabById(tabId);
    if (!tab) return false;
    controller.navigateToPage(tab, [...pagePath]);
    return true;
  } catch (error) {
    console.warn("K-Plex native settings page navigation failed", error);
    return false;
  }
}
