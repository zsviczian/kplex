/**
 * Native file-location actions for the node Open menu. These guarded private Obsidian
 * capabilities match the host's own file menu; no Electron/filesystem access is needed.
 * Callers retain action/session ownership and pass the current presentation environment.
 */
import type { App, TFile } from "obsidian";
import type { PresentationEnvironment } from "../../core/contracts/presentationEnvironment";

type FileRevealApp = App & {
  showInFolder?: (path: string) => void;
  internalPlugins?: {
    getEnabledPluginById?: (id: "file-explorer") => {
      revealInFolder?: (file: TFile) => void | Promise<void>;
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

/** Reveal only the current native file; recheck device/plugin availability at execution time. */
export async function revealFile(app: App, file: TFile, destination: FileRevealDestination, environment: PresentationEnvironment): Promise<void> {
  if (app.vault.getFileByPath(file.path) !== file) return;
  if (destination === "system") {
    if (fileRevealMenuState(app, environment).systemLabel) (app as FileRevealApp).showInFolder?.(file.path);
    return;
  }
  await fileExplorer(app)?.revealInFolder?.(file);
}
