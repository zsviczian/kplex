/**
 * Hosts one native Obsidian Markdown leaf inside a plugin-owned DOM element.
 *
 * Obsidian does not expose a public "embed a WorkspaceLeaf here" helper. Hover Editor uses the
 * same narrow WorkspaceSplit/WorkspaceLeaf seam: construct an isolated split, give it the owning
 * workspace root/container, insert one leaf, and detach that leaf on teardown. Keep every use of
 * that host-specific seam in this adapter so the React graph only deals with a small controller.
 */
import { WorkspaceLeaf, WorkspaceSplit, type App, type TFile, type Workspace } from "obsidian";

export type EmbeddedMarkdownMode = "preview" | "source";
export type EmbeddedDocumentView = "markdown" | "excalidraw";

const embeddedMarkdownLeaves = new WeakSet<WorkspaceLeaf>();

/** True only for native leaves owned by the central-node editor rather than the workspace tree. */
export function isEmbeddedMarkdownLeaf(leaf: WorkspaceLeaf | null | undefined): boolean {
  return Boolean(leaf && embeddedMarkdownLeaves.has(leaf));
}

export interface EmbeddedMarkdownLeafController {
  open(file: TFile, mode: EmbeddedMarkdownMode): Promise<void>;
  setMode(mode: EmbeddedMarkdownMode): Promise<void>;
  getDocumentView(): EmbeddedDocumentView | null;
  isExcalidrawFile(): boolean;
  toggleExcalidrawView(mode: EmbeddedMarkdownMode): Promise<EmbeddedDocumentView | null>;
  activate(): void;
  resize(): void;
  dispose(): void;
}

type EmbeddedWorkspaceSplit = {
  containerEl: HTMLElement;
  insertChild(index: number, child: WorkspaceLeaf, resize?: boolean): void;
  getRoot: () => unknown;
  getContainer: () => unknown;
};

type WorkspaceSplitConstructor = new (workspace: Workspace, direction: "horizontal" | "vertical") => EmbeddedWorkspaceSplit;
type WorkspaceLeafConstructor = new (app: App) => WorkspaceLeaf;
type RootAwareLeaf = WorkspaceLeaf & {
  getRoot?: () => unknown;
  getContainer?: () => unknown;
};
type ResizableView = WorkspaceLeaf["view"] & { onResize?: () => void };
type ExcalidrawView = WorkspaceLeaf["view"] & { excalidrawAPI?: unknown };
type ExcalidrawAutomateApi = {
  isExcalidraw?: () => boolean;
  setViewModeEnabled?: (enabled: boolean) => void;
  getViewElements?: () => readonly unknown[];
  viewZoomToElements?: (selectElements: boolean, elements: readonly unknown[], margin?: number) => void;
};
type ExcalidrawAutomateBridge = ExcalidrawAutomateApi & {
  getAPI?: (view: WorkspaceLeaf["view"]) => ExcalidrawAutomateApi | null | undefined;
};
type ExcalidrawWindow = Window & { ExcalidrawAutomate?: ExcalidrawAutomateBridge };
type ObsidianCommandManager = {
  executeCommandById(commandId: string): boolean;
};
type AppWithCommandManager = App & { commands?: ObsidianCommandManager };

/**
 * Create an isolated native Markdown leaf whose DOM remains owned by `mountEl`.
 *
 * @remarks This intentionally mirrors Hover Editor's narrow WorkspaceSplit seam. The returned
 * controller owns the leaf and must be disposed when the React host unmounts.
 */
export function mountEmbeddedMarkdownLeaf(
  app: App,
  hostLeaf: WorkspaceLeaf,
  mountEl: HTMLElement,
  onFileChange?: (file: TFile) => void,
): EmbeddedMarkdownLeafController {
  const SplitConstructor = WorkspaceSplit as unknown as WorkspaceSplitConstructor;
  const LeafConstructor = WorkspaceLeaf as unknown as WorkspaceLeafConstructor;
  const split = new SplitConstructor(app.workspace, "vertical");
  const bridgedHostLeaf = hostLeaf as RootAwareLeaf;

  // Hover Editor deliberately keeps the embedded split's DOM in its own surface while reporting
  // the real owning workspace root/container to Obsidian. Markdown views use those methods to
  // resolve the correct main/pop-out document and workspace context. Returning the mount element
  // here looks tempting, but it is not a WorkspaceContainer and breaks that host contract.
  split.getRoot = () => bridgedHostLeaf.getRoot?.() ?? split;
  split.getContainer = () => bridgedHostLeaf.getContainer?.() ?? bridgedHostLeaf.getRoot?.() ?? split;

  // Excalidraw fullscreen walks upward from the view content until it reaches the nearest DOM
  // `.workspace-split`, then treats that split as the visible workspace root and hides all other
  // splits in the owning document. Our synthetic split is nested inside K-Plex's real workspace
  // leaf, so advertising it as a DOM workspace split makes Excalidraw hide the actual host split
  // that contains it. Keep the WorkspaceSplit object model, but make its DOM wrapper transparent
  // to that ancestry walk so fullscreen reaches the real Obsidian split, just as it does for a
  // normal workspace leaf. K-Plex supplies the small amount of layout CSS this wrapper needs.
  split.containerEl.classList.add("kplex-embedded-workspace-root", "kplex-embedded-workspace-split");
  mountEl.replaceChildren(split.containerEl);

  const leaf = new LeafConstructor(app);
  split.insertChild(0, leaf);
  split.containerEl.classList.remove("workspace-split");
  embeddedMarkdownLeaves.add(leaf);
  let disposed = false;
  let currentFile: TFile | null = null;
  let openSequence = 0;
  let requestedMode: EmbeddedMarkdownMode = "preview";
  type WindowWithMutationObserver = Window & { MutationObserver: typeof MutationObserver };
  const viewWindow = (mountEl.ownerDocument.defaultView ?? window) as WindowWithMutationObserver;
  const fileOpenRef = onFileChange ? app.workspace.on("file-open", (file) => {
    if (disposed || !file) return;
    const state = leaf.getViewState();
    const stateFile = (state.state as { file?: unknown } | undefined)?.file;
    if (stateFile === file.path) onFileChange(file);
  }) : null;

  /** Ask the current native view to recompute its editor/preview geometry after host resizing. */
  const resize = (): void => {
    if (disposed) return;
    (leaf.view as ResizableView | undefined)?.onResize?.();
  };

  // Excalidraw marks every ancestor on the active view path with `excalidraw-visible` while its
  // fullscreen manager is active. Once the synthetic split no longer terminates that walk, the
  // K-Plex editor overlay receives the marker as well. Expand that frame imperatively so the
  // drawing gets the same full-window geometry as a normal workspace leaf without forcing a React
  // render that could overwrite Excalidraw's temporary ancestry classes.
  const fullscreenHost = mountEl.closest<HTMLElement>(".kplex-central-editor-overlay");
  let fullscreenStyle: {
    position: string;
    left: string;
    top: string;
    width: string;
    height: string;
    zIndex: string;
  } | null = null;
  const applyNativeFullscreenGeometry = (): void => {
    if (!fullscreenHost) return;
    fullscreenHost.setCssStyles({
      position: "fixed",
      left: "0px",
      top: "0px",
      width: "100vw",
      height: "100vh",
      zIndex: "1000",
    });
  };
  const restoreNativeFullscreenGeometry = (): void => {
    if (!fullscreenHost || !fullscreenStyle) return;
    fullscreenHost.classList.remove("is-native-view-fullscreen");
    fullscreenHost.setCssStyles(fullscreenStyle);
    fullscreenStyle = null;
  };
  const syncNativeFullscreenFrame = (): void => {
    if (!fullscreenHost) return;
    const fullscreen = fullscreenHost.classList.contains("excalidraw-visible");
    if (fullscreen && !fullscreenStyle) {
      fullscreenStyle = {
        position: fullscreenHost.style.position,
        left: fullscreenHost.style.left,
        top: fullscreenHost.style.top,
        width: fullscreenHost.style.width,
        height: fullscreenHost.style.height,
        zIndex: fullscreenHost.style.zIndex,
      };
      fullscreenHost.classList.add("is-native-view-fullscreen");
      applyNativeFullscreenGeometry();
      resize();
      return;
    }
    if (fullscreen && fullscreenStyle) {
      // React still owns the normal Plex geometry. If a viewport/layout render writes a new normal
      // rectangle while Excalidraw is fullscreen, remember that newer rectangle, then immediately
      // reassert fullscreen geometry. Exit will therefore restore the current Plex layout rather
      // than the dimensions from before a window resize.
      const geometryChanged = fullscreenHost.style.left !== "0px"
        || fullscreenHost.style.top !== "0px"
        || fullscreenHost.style.width !== "100vw"
        || fullscreenHost.style.height !== "100vh";
      if (geometryChanged) {
        fullscreenStyle.left = fullscreenHost.style.left;
        fullscreenStyle.top = fullscreenHost.style.top;
        fullscreenStyle.width = fullscreenHost.style.width;
        fullscreenStyle.height = fullscreenHost.style.height;
        applyNativeFullscreenGeometry();
        resize();
      }
      return;
    }
    if (!fullscreenStyle) return;
    restoreNativeFullscreenGeometry();
    resize();
  };
  const fullscreenObserver = fullscreenHost ? new viewWindow.MutationObserver(syncNativeFullscreenFrame) : null;
  if (fullscreenHost && fullscreenObserver) {
    fullscreenObserver.observe(fullscreenHost, { attributes: true, attributeFilter: ["class", "style"] });
  }
  syncNativeFullscreenFrame();

  /** Resolve the Excalidraw Automate API for this embedded view without assuming the main window. */
  const excalidrawApiForView = (view: WorkspaceLeaf["view"]): ExcalidrawAutomateApi | null => {
    const owningBridge = (viewWindow as ExcalidrawWindow).ExcalidrawAutomate;
    const fallbackBridge = (window as ExcalidrawWindow).ExcalidrawAutomate;
    const bridge = owningBridge ?? fallbackBridge;
    if (!bridge) return null;
    if (typeof bridge.getAPI !== "function") return bridge;
    try {
      return bridge.getAPI(view) ?? null;
    } catch {
      return null;
    }
  };

  /** Report which native representation currently owns the embedded Excalidraw-capable note. */
  const getDocumentView = (): EmbeddedDocumentView | null => {
    const type = leaf.getViewState().type;
    if (type === "markdown" || type === "excalidraw") return type;
    return null;
  };

  /** Detect an Excalidraw-backed Markdown file while remaining safe when the plugin is absent. */
  const isExcalidrawFile = (): boolean => {
    if (getDocumentView() === "excalidraw") return true;
    const api = excalidrawApiForView(leaf.view);
    try {
      if (api?.isExcalidraw?.()) return true;
    } catch {
      // Fall through to file metadata/path detection while the Excalidraw view is still mounting.
    }
    if (!currentFile) return false;
    if (/\.excalidraw\.md$/i.test(currentFile.path)) return true;
    const frontmatter = app.metadataCache.getFileCache(currentFile)?.frontmatter;
    return Boolean(frontmatter && Object.prototype.hasOwnProperty.call(frontmatter, "excalidraw-plugin"));
  };

  /** Fit the mounted Excalidraw scene into the embedded viewport once its Automate API is ready. */
  const zoomExcalidrawToFit = (api: ExcalidrawAutomateApi | null): void => {
    if (!api?.getViewElements || !api.viewZoomToElements) return;
    try {
      api.viewZoomToElements(false, api.getViewElements(), 0.1);
    } catch {
      // Excalidraw can briefly expose the API before its scene has finished attaching to the view.
    }
  };

  /** Map K-Plex reading/edit mode onto Excalidraw view/edit mode once its React canvas is ready. */
  const setExcalidrawMode = async (mode: EmbeddedMarkdownMode): Promise<void> => {
    if (getDocumentView() !== "excalidraw") return;
    const maxAttempts = 160;
    for (let attempt = 0; attempt < maxAttempts && !disposed; attempt += 1) {
      const view = leaf.view as ExcalidrawView;
      if (view.excalidrawAPI) break;
      await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, 25));
    }
    if (disposed) return;
    const view = leaf.view as ExcalidrawView;
    if (!view.excalidrawAPI) return;
    const api = excalidrawApiForView(view);
    api?.setViewModeEnabled?.(mode === "preview");
    resize();
  };

  /** Switch the embedded native view without changing the file or creating another leaf. */
  const setMode = async (mode: EmbeddedMarkdownMode): Promise<void> => {
    requestedMode = mode;
    if (disposed) return;
    const documentView = getDocumentView();
    if (documentView === "excalidraw") {
      await setExcalidrawMode(mode);
      return;
    }
    if (documentView !== "markdown") return;
    const state = leaf.getViewState();
    await leaf.setViewState({
      ...state,
      active: false,
      state: { ...state.state, mode },
    });
    if (!disposed) resize();
  };

  /**
   * Finish Excalidraw setup after an Excalidraw-backed file has switched to its drawing view.
   *
   * `WorkspaceLeaf.openFile()` can resolve before Excalidraw has replaced the temporary Markdown
   * view and mounted `excalidrawAPI`. Applying reading mode only in the immediate `open()` path can
   * therefore be lost and the drawing settles in edit mode. Keep a short, cancellable post-open
   * watcher so the same mode is applied once the real drawing view is ready, then zoom the scene to
   * fit the available central-editor viewport.
   */
  const finishExcalidrawAfterOpen = async (filePath: string, sequence: number): Promise<void> => {
    const maxAttempts = 160;
    for (let attempt = 0; attempt < maxAttempts && !disposed; attempt += 1) {
      if (sequence !== openSequence || currentFile?.path !== filePath) return;
      if (getDocumentView() === "excalidraw") {
        const view = leaf.view as ExcalidrawView;
        if (view.excalidrawAPI) {
          const api = excalidrawApiForView(view);
          if (api?.setViewModeEnabled) {
            // Let Excalidraw finish its own mount-time state restoration before enforcing K-Plex's
            // remembered mode. This mirrors a user toggling view/edit mode after the drawing loads.
            await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, 25));
            if (disposed || sequence !== openSequence || currentFile?.path !== filePath || leaf.view !== view) return;
            try {
              api.setViewModeEnabled(requestedMode === "preview");
              zoomExcalidrawToFit(api);
              resize();
              return;
            } catch {
              // The API can briefly exist before the drawing is ready to accept state changes.
            }
          }
        }
      }
      await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, 25));
    }
  };

  /** Toggle an Excalidraw note between drawing and Markdown while preserving the chosen read/edit mode. */
  const toggleExcalidrawView = async (mode: EmbeddedMarkdownMode): Promise<EmbeddedDocumentView | null> => {
    if (disposed || !isExcalidrawFile()) return getDocumentView();
    const previousView = getDocumentView();
    const commands = (app as AppWithCommandManager).commands;
    if (!commands) return previousView;

    // `focusLeaf()` and `App.commands` are host internals and are not declared by the public
    // Obsidian types. `setActiveLeaf()` is the typed focus path already used by this adapter;
    // the narrow command-manager bridge is kept here because Excalidraw exposes this switch only
    // as a command.
    app.workspace.setActiveLeaf(leaf, { focus: true });
    const executed = commands.executeCommandById("obsidian-excalidraw-plugin:toggle-excalidraw-view");
    if (!executed) return previousView;

    const maxAttempts = 80;
    for (let attempt = 0; attempt < maxAttempts && !disposed; attempt += 1) {
      const nextView = getDocumentView();
      if (nextView && nextView !== previousView) break;
      await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, 25));
    }
    if (disposed) return null;
    await setMode(mode);
    if (getDocumentView() === "excalidraw") zoomExcalidrawToFit(excalidrawApiForView(leaf.view));
    resize();
    return getDocumentView();
  };

  return {
    async open(file, mode) {
      if (disposed) return;
      const sequence = ++openSequence;
      currentFile = file;
      requestedMode = mode;
      await leaf.openFile(file, { active: false });
      if (disposed || sequence !== openSequence) return;
      await setMode(mode);
      if (disposed || sequence !== openSequence) return;
      if (isExcalidrawFile()) void finishExcalidrawAfterOpen(file.path, sequence);
    },
    setMode,
    getDocumentView,
    isExcalidrawFile,
    toggleExcalidrawView,
    activate() {
      if (disposed) return;
      // Match Hover Editor's focus model: the embedded leaf becomes Obsidian's active editor only
      // when the user actually interacts with it, never merely because K-Plex rendered the node.
      app.workspace.setActiveLeaf(leaf, { focus: true });
    },
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      openSequence += 1;
      fullscreenObserver?.disconnect();
      restoreNativeFullscreenGeometry();
      if (fileOpenRef) app.workspace.offref(fileOpenRef);
      try {
        leaf.detach();
      } catch {
        // The host may already have detached the leaf during window/workspace teardown.
      }
      embeddedMarkdownLeaves.delete(leaf);
      split.containerEl.remove();
      if (mountEl.isConnected) mountEl.replaceChildren();
    },
  };
}
