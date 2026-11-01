/**
 * Native file/folder-location actions for the node Open menu. These guarded private Obsidian
 * capabilities match the host's own file menu; no Electron/filesystem access is needed.
 * Callers retain action/session ownership and pass the current presentation environment.
 */
import type { App, TFile, TFolder } from "obsidian";
import type { GraphPage } from "../../types";
import type { PresentationEnvironment } from "../../core/contracts/presentationEnvironment";

type FileRevealApp = App & {
  showInFolder?: (path: string) => void;
  internalPlugins?: {
    getEnabledPluginById?: (id: "file-explorer") => {
      revealInFolder?: (file: TFile | TFolder) => void | Promise<void>;
    } | null;
  };
};

export type FileRevealDestination = "system" | "navigation";

/** Reacquire the enabled Files instance, so disabling it also retires already-open menu actions. */
function fileExplorer(app: App) {
  return (app as FileRevealApp).internalPlugins?.getEnabledPluginById?.("file-explorer");
}

/** Read native availability without opening a pane or acquiring graph/source data. */
export function fileRevealMenuState(app: App, environment: PresentationEnvironment) {
  return {
    systemLabel: environment.device !== "desktop" || typeof (app as FileRevealApp).showInFolder !== "function"
      ? null : environment.keyConvention === "macos" ? "graph.openInFinder" as const
        : environment.keyConvention === "windows" ? "graph.openInExplorer" as const : "graph.showInSystemExplorer" as const,
    navigation: typeof fileExplorer(app)?.revealInFolder === "function",
  };
}

/** Resolve native locations without admitting synthetic folders or acquiring graph/source data. */
export function nativeRevealTarget(app: App, page: Pick<GraphPage, "file" | "isFolder" | "path">): TFile | TFolder | null {
  if (page.file) return page.file;
  if (!page.isFolder || !page.path.startsWith("folder:")) return null;
  return page.path === "folder:/" ? app.vault.getRoot() : app.vault.getFolderByPath(page.path.slice("folder:".length));
}

/** Reveal only the current native file/folder; recheck identity and host availability at execution. */
export async function revealFile(app: App, file: TFile | TFolder, destination: FileRevealDestination, environment: PresentationEnvironment): Promise<void> {
  const current = "children" in file
    ? file.path === "/" ? app.vault.getRoot() : app.vault.getFolderByPath(file.path)
    : app.vault.getFileByPath(file.path);
  if (current !== file) return;
  if (destination === "system") {
    if (fileRevealMenuState(app, environment).systemLabel) (app as FileRevealApp).showInFolder?.(file.path);
    return;
  }
  await fileExplorer(app)?.revealInFolder?.(file);
}
