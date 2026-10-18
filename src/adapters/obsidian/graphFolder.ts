/** Physical folder lookup at the established legacy graph/Obsidian boundary. */
import type { App, TFolder } from "obsidian";
import type { GraphPage } from "../../types";

/** Translate only the legacy folder facade's explicit coordinate, never a neutral opaque NodeId. */
export function graphFolderPath(page: GraphPage): string | null {
  if (!page.isFolder || !page.path.startsWith("folder:")) return null;
  const path = page.path.slice("folder:".length);
  return path || null;
}

/** Resolve the exact current native incarnation without creating folders or scanning the vault. */
export function graphFolder(app: App, page: GraphPage): TFolder | null {
  const path = graphFolderPath(page);
  return path === "/" ? app.vault.getRoot() : path ? app.vault.getFolderByPath(path) : null;
}
