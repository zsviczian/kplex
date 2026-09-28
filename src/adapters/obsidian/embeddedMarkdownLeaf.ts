/**
 * Hosts one native Obsidian Markdown leaf inside a plugin-owned DOM element.
 *
 * Obsidian does not expose a public "embed a WorkspaceLeaf here" helper. Hover Editor uses the
 * same narrow WorkspaceSplit/WorkspaceLeaf seam: construct an isolated split, give it the owning
 * workspace root/container, insert one leaf, and detach that leaf on teardown. Keep every use of
 * that host-specific seam in this adapter so the React graph only deals with a small controller.
 */
import { Platform, WorkspaceLeaf, WorkspaceSplit, type App, type TFile, type Workspace } from "obsidian";
import {
  hasMinimumExcalidrawIntegrationVersion,
  MINIMUM_EXCALIDRAW_INTEGRATION_VERSION,
} from "./excalidrawIntegrationVersion";

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
type LinkOpeningLeaf = WorkspaceLeaf & {
  openLinkText?: (linkText: string, sourcePath: string, state?: unknown) => Promise<void>;
};
type ResizableView = WorkspaceLeaf["view"] & { onResize?: () => void };
type ExcalidrawView = WorkspaceLeaf["view"] & { excalidrawAPI?: unknown };
type ExcalidrawPaneTarget = "active-pane" | "new-pane" | "popout-window" | "new-tab" | "md-properties";
type ExcalidrawViewLinkClickContext = {
  linkText: string,
  event: MouseEvent | null,
  action: ExcalidrawPaneTarget,
  view: WorkspaceLeaf["view"],
  ea: ExcalidrawAutomateApi,
};
type ExcalidrawAutomateApi = {
  isExcalidraw?: () => boolean;
  verifyMinimumPluginVersion?: (requiredVersion: string) => boolean;
  setViewModeEnabled?: (enabled: boolean) => void;
  getViewElements?: () => readonly unknown[];
  viewZoomToElements?: (selectElements: boolean, elements: readonly unknown[], margin?: number) => void;
  viewZoomToFit?: () => void;
  getLeaf?: (origo: WorkspaceLeaf, targetPane?: ExcalidrawPaneTarget) => WorkspaceLeaf;
  registerViewLinkClickHook?: (
    hook: (context: ExcalidrawViewLinkClickContext) => boolean | void,
  ) => () => void;
  destroy?: () => void;
};
type ExcalidrawAutomateBridge = ExcalidrawAutomateApi & {
  getAPI?: (view: WorkspaceLeaf["view"]) => ExcalidrawAutomateApi | null | undefined;
};
type ExcalidrawWindow = Window & { ExcalidrawAutomate?: ExcalidrawAutomateBridge };
type ObsidianCommandManager = {
  executeCommandById(commandId: string): boolean;
};
type AppWithCommandManager = App & { commands?: ObsidianCommandManager };
type CodeMirrorLine = { from: number; to: number; text: string };
type CodeMirrorDocument = { lineAt(position: number): CodeMirrorLine };
type CodeMirrorEditorView = {
  posAtDOM(node: Node, offset?: number): number;
  state: { doc: CodeMirrorDocument };
};
type MarkdownViewWithCodeMirror = WorkspaceLeaf["view"] & { editor?: { cm?: CodeMirrorEditorView } };

const warnedIncompatibleExcalidrawBridges = new WeakSet<object>();

function isExternalLinkTarget(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//");
}

/** Normalize the raw link text emitted by Markdown/Excalidraw into an Obsidian link target. */
function internalLinkTarget(rawTarget: string): string | null {
  let target = rawTarget.trim();
  if (!target) return null;
  if (target.startsWith("!")) target = target.slice(1).trim();

  if (target.startsWith("[[") && target.endsWith("]]")) {
    const body = target.slice(2, -2);
    const aliasAt = body.indexOf("|");
    target = (aliasAt >= 0 ? body.slice(0, aliasAt) : body).trim();
  } else {
    const markdownMatch = target.match(/^\[[^\]]*\]\((.+)\)$/);
    if (markdownMatch) target = markdownMatch[1].trim();
  }

  if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1).trim();
  if (!target || isExternalLinkTarget(target)) return null;
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

/** Return a native Obsidian link target from the source line under a CodeMirror link decoration. */
function markdownLinkTargetAt(sourceLine: string, sourceOffset: number): string | null {
  let cursor = 0;
  while (cursor < sourceLine.length) {
    const open = sourceLine.indexOf("[[", cursor);
    if (open < 0) break;
    const close = sourceLine.indexOf("]]", open + 2);
    if (close < 0) break;
    if (sourceOffset >= open - 1 && sourceOffset <= close + 2) {
      const body = sourceLine.slice(open + 2, close);
      const aliasAt = body.indexOf("|");
      const target = (aliasAt >= 0 ? body.slice(0, aliasAt) : body).trim();
      return target || null;
    }
    cursor = close + 2;
  }

  cursor = 0;
  while (cursor < sourceLine.length) {
    const separator = sourceLine.indexOf("](", cursor);
    if (separator < 0) break;
    const labelStart = sourceLine.lastIndexOf("[", separator);
    if (labelStart < 0) {
      cursor = separator + 2;
      continue;
    }

    let close = -1;
    let nestedParens = 0;
    let escaped = false;
    for (let index = separator + 2; index < sourceLine.length; index += 1) {
      const char = sourceLine[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "(") {
        nestedParens += 1;
        continue;
      }
      if (char === ")") {
        if (nestedParens === 0) {
          close = index;
          break;
        }
        nestedParens -= 1;
      }
    }
    if (close < 0) break;

    if (sourceOffset >= labelStart - 1 && sourceOffset <= close + 1) {
      const rawDestination = sourceLine.slice(separator + 2, close).trim();
      if (!rawDestination) return null;
      let target = rawDestination;
      if (target.startsWith("<")) {
        const angleClose = target.indexOf(">");
        if (angleClose > 0) target = target.slice(1, angleClose);
      } else {
        const whitespace = target.search(/\s/);
        if (whitespace > 0) target = target.slice(0, whitespace);
      }
      target = target.trim();
      if (!target || isExternalLinkTarget(target)) return null;
      try {
        return decodeURIComponent(target);
      } catch {
        return target;
      }
    }
    cursor = close + 1;
  }
  return null;
}

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
  onExcalidrawVersionMismatch?: (requiredVersion: string) => void,
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
  type WindowWithMutationObserver = Window & { MutationObserver: typeof MutationObserver; Element: typeof Element };
  const viewWindow = (mountEl.ownerDocument.defaultView ?? window) as WindowWithMutationObserver;

  /** Resolve the Excalidraw Automate bridge belonging to the embedded view's window. */
  const getExcalidrawBridge = (): ExcalidrawAutomateBridge | null => (
    (viewWindow as ExcalidrawWindow).ExcalidrawAutomate
      ?? (window as ExcalidrawWindow).ExcalidrawAutomate
      ?? null
  );

  /** Verify the semantic integration boundary and report an old release only once per bridge. */
  const hasCompatibleExcalidrawBridge = (
    bridge: ExcalidrawAutomateBridge | null,
    reportMismatch: boolean,
  ): bridge is ExcalidrawAutomateBridge => {
    if (!bridge) return false;
    const compatible = hasMinimumExcalidrawIntegrationVersion(bridge);
    if (
      !compatible
      && reportMismatch
      && !warnedIncompatibleExcalidrawBridges.has(bridge)
    ) {
      warnedIncompatibleExcalidrawBridges.add(bridge);
      onExcalidrawVersionMismatch?.(MINIMUM_EXCALIDRAW_INTEGRATION_VERSION);
    }
    return compatible;
  };
  const fileOpenRef = onFileChange ? app.workspace.on("file-open", (file) => {
    if (disposed || !file) return;
    const state = leaf.getViewState();
    const stateFile = (state.state as { file?: unknown } | undefined)?.file;
    if (stateFile !== file.path) return;
    currentFile = file;
    onFileChange(file);
  }) : null;

  /** Notify React/graph navigation after the hosted leaf itself changed files. */
  const notifyEmbeddedFileChange = (): void => {
    if (disposed || !onFileChange) return;
    const stateFile = (leaf.getViewState().state as { file?: unknown } | undefined)?.file;
    if (typeof stateFile !== "string") return;
    const nextFile = app.vault.getFileByPath(stateFile);
    if (!nextFile || nextFile.path === currentFile?.path) return;
    currentFile = nextFile;
    onFileChange(nextFile);
  };

  /** Open a link on the hosted leaf itself, then make that file the Plex center as well. */
  const openEmbeddedLink = async (rawTarget: string): Promise<void> => {
    if (disposed || !currentFile) return;
    const linkText = internalLinkTarget(rawTarget);
    if (!linkText) return;
    const embeddedLeaf: LinkOpeningLeaf = leaf;
    if (typeof embeddedLeaf.openLinkText !== "function") return;
    const sourcePath = currentFile.path;
    await embeddedLeaf.openLinkText(linkText, sourcePath);
    if (disposed) return;
    // Some native views update getViewState() one turn after openLinkText() resolves.
    await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, 0));
    notifyEmbeddedFileChange();
  };

  /**
   * Keep ordinary Markdown link navigation inside the embedded leaf.
   *
   * Native Markdown click handlers assume a leaf that participates in the normal workspace tree.
   * On this synthetic split, their default path can ask the workspace for another leaf and open a
   * new tab. Hover Editor avoids that by targeting its hosted leaf directly. Do the same here for
   * the normal follow-link gesture in each Markdown mode, while leaving explicit alternate-pane
   * modifiers to Obsidian.
   */
  const onEmbeddedLinkClick = (event: MouseEvent): void => {
    if (Platform.isMobile || disposed || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof viewWindow.Element)) return;

    const editorLink = target.closest<HTMLElement>(".cm-hmd-internal-link, .cm-link, .cm-url");
    const nativeLink = target.closest<HTMLElement>(
      "a.internal-link, [data-href], [data-link-data-href], [data-link-path]",
    );
    const linkContainer = editorLink ?? nativeLink;
    if (!linkContainer || !mountEl.contains(linkContainer)) return;

    // An unmodified click is K-Plex's same-editor navigation gesture in both Markdown modes and
    // in the document-properties UI. Any modifier belongs to Obsidian: Cmd/Ctrl+click can open a
    // new tab, while Shift/Alt combinations keep their normal host behavior.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const dataHrefElement = linkContainer.matches("[data-href], [data-link-data-href], [data-link-path]")
      ? linkContainer
      : linkContainer.querySelector<HTMLElement>("[data-href], [data-link-data-href], [data-link-path]");
    const anchor = linkContainer.matches("a")
      ? linkContainer
      : linkContainer.querySelector<HTMLAnchorElement>("a");
    let linkText = dataHrefElement?.getAttribute("data-href")
      ?? dataHrefElement?.getAttribute("data-link-data-href")
      ?? dataHrefElement?.getAttribute("data-link-path")
      ?? anchor?.getAttribute("data-href")
      ?? anchor?.getAttribute("href")
      ?? null;
    if (!linkText && editorLink) {
      const editorView = (leaf.view as MarkdownViewWithCodeMirror).editor?.cm;
      if (editorView) {
        try {
          const position = editorView.posAtDOM(target, 0);
          const line = editorView.state.doc.lineAt(position);
          linkText = markdownLinkTargetAt(line.text, position - line.from);
        } catch {
          // Let Obsidian handle the click normally if this CodeMirror decoration cannot be mapped.
          return;
        }
      }
    }
    if (!linkText || !currentFile || isExternalLinkTarget(linkText) || !internalLinkTarget(linkText)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void openEmbeddedLink(linkText).catch((error: unknown) => {
      console.error(`K-Plex failed to open embedded Markdown link ${linkText}.`, error);
    });
  };
  // Listen at the owning document's capture phase. Obsidian registers different Markdown link
  // handlers for Reading View and Live Preview; catching the gesture above both view-local handler
  // stacks keeps the same-leaf behavior consistent without disturbing clicks outside this mount.
  viewWindow.document.addEventListener("click", onEmbeddedLinkClick, true);

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

  let scopedExcalidrawView: WorkspaceLeaf["view"] | null = null;
  let scopedExcalidrawApi: ExcalidrawAutomateApi | null = null;
  let ownsScopedExcalidrawApi = false;

  /** Resolve one reusable Excalidraw Automate API for this view without assuming the main window. */
  const excalidrawApiForView = (view: WorkspaceLeaf["view"]): ExcalidrawAutomateApi | null => {
    if (scopedExcalidrawView === view) return scopedExcalidrawApi;
    if (ownsScopedExcalidrawApi) scopedExcalidrawApi?.destroy?.();
    scopedExcalidrawView = view;
    scopedExcalidrawApi = null;
    ownsScopedExcalidrawApi = false;
    const bridge = getExcalidrawBridge();
    if (!bridge) return null;
    if (typeof bridge.getAPI !== "function") {
      scopedExcalidrawApi = bridge;
      return bridge;
    }
    try {
      scopedExcalidrawApi = bridge.getAPI(view) ?? null;
      ownsScopedExcalidrawApi = Boolean(scopedExcalidrawApi);
      return scopedExcalidrawApi;
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

  let unregisterExcalidrawLinkRouting: (() => void) | null = null;
  let routedExcalidrawView: WorkspaceLeaf["view"] | null = null;

  /**
   * Route Excalidraw link targets from the synthetic leaf without changing Excalidraw's configured
   * modifier semantics. `active-pane` belongs inside the embedded editor. `new-tab` and `new-pane`
   * need a real workspace origin because Excalidraw cannot derive a normal tab/split from the
   * synthetic leaf; ask Excalidraw Automate for those destinations using the owning K-Plex leaf.
   * Pop-out/properties actions and external links remain fully native.
   */
  const installExcalidrawLinkRouting = (): void => {
    if (Platform.isMobile) return;
    if (!hasCompatibleExcalidrawBridge(getExcalidrawBridge(), false)) return;
    const view = leaf.view;
    if (routedExcalidrawView === view) return;
    unregisterExcalidrawLinkRouting?.();
    unregisterExcalidrawLinkRouting = null;
    routedExcalidrawView = null;
    const api = excalidrawApiForView(view);
    if (!api?.registerViewLinkClickHook) return;
    routedExcalidrawView = view;
    unregisterExcalidrawLinkRouting = api.registerViewLinkClickHook(({ linkText, action, view: sourceView, ea }) => {
      if (disposed || sourceView !== leaf.view || getDocumentView() !== "excalidraw") return;
      const target = internalLinkTarget(linkText);
      if (!target) return;

      if (action === "active-pane") {
        void openEmbeddedLink(target).catch((error: unknown) => {
          console.error(`K-Plex failed to open embedded Excalidraw link ${linkText}.`, error);
        });
        return false;
      }

      if (action !== "new-tab" && action !== "new-pane") return;

      // `hostLeaf` is the real K-Plex workspace leaf supplied by PlexGraph, while `leaf` is the
      // synthetic embedded Excalidraw leaf. Always give Excalidraw Automate the real host as the
      // origin for workspace-level destinations. For `new-tab`, also re-anchor Obsidian's active
      // leaf context because EA ultimately delegates tab creation to Workspace.getLeaf("tab").
      if (action === "new-tab") app.workspace.setActiveLeaf(hostLeaf, { focus: false });

      const targetLeaf = ea.getLeaf?.(hostLeaf, action);
      const linkOpeningLeaf: LinkOpeningLeaf | null = targetLeaf ?? (
        action === "new-tab" ? app.workspace.getLeaf("tab") : app.workspace.getLeaf("split")
      );
      if (typeof linkOpeningLeaf.openLinkText !== "function" || !currentFile) return;
      void linkOpeningLeaf.openLinkText(target, currentFile.path).catch((error: unknown) => {
        console.error(`K-Plex failed to open Excalidraw link ${linkText} in ${action}.`, error);
      });
      return false;
    });
  };

  const restoreExcalidrawLinkRouting = (): void => {
    unregisterExcalidrawLinkRouting?.();
    unregisterExcalidrawLinkRouting = null;
    routedExcalidrawView = null;
  };

  /** Detect an Excalidraw-backed Markdown file from stable vault metadata. */
  const isExcalidrawBackedFile = (file: TFile | null): boolean => {
    if (!file) return false;
    if (/\.excalidraw\.md$/i.test(file.path)) return true;
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    return Boolean(frontmatter && Object.prototype.hasOwnProperty.call(frontmatter, "excalidraw-plugin"));
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
    return isExcalidrawBackedFile(currentFile);
  };

  /** Fit the mounted Excalidraw scene into the embedded viewport once its Automate API is ready. */
  const zoomExcalidrawToFit = (api: ExcalidrawAutomateApi | null): void => {
    if (!api) return;
    try {
      if (api.viewZoomToFit) {
        api.viewZoomToFit();
      } else if (api.getViewElements && api.viewZoomToElements) {
        api.viewZoomToElements(false, api.getViewElements(), 0.1);
      }
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
    installExcalidrawLinkRouting();
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
  const finishExcalidrawAfterOpen = async (
    filePath: string,
    sequence: number,
    applyPresentation = true,
  ): Promise<void> => {
    const maxAttempts = 160;
    for (let attempt = 0; attempt < maxAttempts && !disposed; attempt += 1) {
      if (sequence !== openSequence || currentFile?.path !== filePath) return;
      if (getDocumentView() === "excalidraw") {
        const view = leaf.view as ExcalidrawView;
        if (view.excalidrawAPI) {
          const api = excalidrawApiForView(view);
          if (api) {
            // Let Excalidraw finish its own mount-time state restoration before registering the
            // view-scoped integration or applying the compatibility presentation fallback.
            await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, 25));
            if (disposed || sequence !== openSequence || currentFile?.path !== filePath || leaf.view !== view) return;
            try {
              installExcalidrawLinkRouting();
              if (applyPresentation) {
                api.setViewModeEnabled?.(requestedMode === "preview");
                zoomExcalidrawToFit(api);
              }
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
    if (previousView === "excalidraw") restoreExcalidrawLinkRouting();
    app.workspace.setActiveLeaf(leaf, { focus: true });
    const executed = commands.executeCommandById("obsidian-excalidraw-plugin:toggle-excalidraw-view");
    if (!executed) {
      if (previousView === "excalidraw") installExcalidrawLinkRouting();
      return previousView;
    }

    const maxAttempts = 80;
    for (let attempt = 0; attempt < maxAttempts && !disposed; attempt += 1) {
      const nextView = getDocumentView();
      if (nextView && nextView !== previousView) break;
      await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, 25));
    }
    if (disposed) return null;
    await setMode(mode);
    if (getDocumentView() === "excalidraw") {
      installExcalidrawLinkRouting();
      zoomExcalidrawToFit(excalidrawApiForView(leaf.view));
    }
    resize();
    return getDocumentView();
  };

  return {
    async open(file, mode) {
      if (disposed) return;
      const sequence = ++openSequence;
      currentFile = file;
      requestedMode = mode;
      const bridge = getExcalidrawBridge();
      const excalidrawBackedFile = isExcalidrawBackedFile(file);
      const compatibleBridge = excalidrawBackedFile
        ? hasCompatibleExcalidrawBridge(bridge, true)
        : false;
      const supportsIntegrationState = Boolean(
        compatibleBridge && bridge?.registerViewLinkClickHook && bridge?.viewZoomToFit,
      );
      let openedWithIntegrationState = false;
      if (supportsIntegrationState) {
        openedWithIntegrationState = true;
        await leaf.setViewState({
          type: "excalidraw",
          active: false,
          state: {
            file: file.path,
            mode: mode === "preview" ? "view" : "edit",
            zoomToFit: true,
          },
        }, { focus: false });
      } else {
        await leaf.openFile(file, { active: false });
      }
      if (disposed || sequence !== openSequence) return;
      if (openedWithIntegrationState) {
        void finishExcalidrawAfterOpen(file.path, sequence, false);
        return;
      }
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
      // Make the hosted leaf active without forcing focus back into the editor. Native controls
      // such as Markdown's Cmd/Ctrl+F search field must be allowed to keep the DOM focus that the
      // user's click just gave them. The leaf is still active for commands and link handling.
      app.workspace.setActiveLeaf(leaf, { focus: false });
    },
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      openSequence += 1;
      fullscreenObserver?.disconnect();
      restoreExcalidrawLinkRouting();
      if (ownsScopedExcalidrawApi) scopedExcalidrawApi?.destroy?.();
      scopedExcalidrawView = null;
      scopedExcalidrawApi = null;
      ownsScopedExcalidrawApi = false;
      restoreNativeFullscreenGeometry();
      if (fileOpenRef) app.workspace.offref(fileOpenRef);
      viewWindow.document.removeEventListener("click", onEmbeddedLinkClick, true);
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
