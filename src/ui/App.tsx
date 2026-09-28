/**
 * Host-bound React shell for K-Plex navigation, startup guidance, File Explorer note drops, toolbar and Sidecar controls. It composes shared components and injected environment/localization capabilities; plugin methods own host effects.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { Menu, type TFile, type WorkspaceLeaf } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import type { PresentationEnvironment } from "../core/contracts/presentationEnvironment";
import { isSearchFocusShortcut } from "../core/plex/shortcutPresentation";
import type { Translator } from "../lang";
import { physicalPositionLabel } from "./features/positionPresentation";
import { searchFieldCopy } from "./features/searchPresentation";
import type { DocumentSyncMode, KplexViewSurface, NodeSortOrder, SidecarMarkdownMode, SidecarPosition } from "../settings";
import { SearchBox } from "./features/SearchBox";
import { createLegacyGraphSearchRead } from "../adapters/obsidian/graphContracts";
import { getDraggedMarkdownFile } from "../adapters/obsidian/fileExplorerDrag";
import { ActionButton } from "./components/ActionButton";
import { InfoBubble } from "./components/InfoBubble";
import { PlexGraph } from "./PlexGraph";
import { ObsidianIcon } from "./ObsidianIcon";
import { EMPTY_PLEX_FILTER, PlexFilter, type GraphFilterLayoutMode, type PlexFilterState, type PlexVisibilitySetting } from "./PlexFilter";
import { compilePlexFilter } from "../lens/SimplePlexFilter";
import { compileGraphLensDefinitions, type GraphLensDefinition } from "../lens/GraphLens";
import { installKplexLongPressTooltips } from "./LongPressTooltip";

type BooleanToolbarSetting = PlexVisibilitySetting | "renderAlias";
type IndexStatus = ReturnType<ExcaliBrainPlugin["getIndexStatus"]>;

/** Subscribe a mounted K-Plex surface to the host-owned index readiness status. */
function useIndexStatus(plugin: ExcaliBrainPlugin): IndexStatus {
  const [status, setStatus] = useState(() => plugin.getIndexStatus());
  useEffect(
    /** Subscribe through the plugin lifecycle and always read its latest composite status. */
    () => plugin.subscribeIndexStatus(
      /** Refresh this surface after the host coordinator changes readiness or activity. */
      () => setStatus(plugin.getIndexStatus()),
    ),
    [plugin],
  );
  return status;
}

/** Render the compact colored index state marker, optionally exposing its node as a callout target. */
function IndexStatusIndicator({ status, indicatorRef }: {
  status: IndexStatus;
  indicatorRef?: RefObject<HTMLSpanElement | null>;
}) {
  return <span
    ref={indicatorRef}
    className={`kplex-index-status${status.upToDate ? " is-ready" : " is-updating"}`}
    aria-label={status.label}
    tabIndex={-1}
  />;
}

function ToolButton({ icon, title, on, disabled, onClick }: {
  icon: string;
  title: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return <button
    className={`excalibrain-icon-button${on ? " is-on" : ""}`}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
  ><ObsidianIcon name={icon} size={17} /></button>;
}

/** Compose the native K-Plex toolbar, filters and scene with injected localization and environment facts; host effects remain plugin-owned. */
export function ExcaliBrainApp({ plugin, surface, hostLeaf, translate, environment }: {
  plugin: ExcaliBrainPlugin;
  surface: KplexViewSurface;
  hostLeaf: WorkspaceLeaf;
  translate: Translator;
  environment: PresentationEnvironment;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const indexStatusRef = useRef<HTMLSpanElement>(null);
  const indexStatus = useIndexStatus(plugin);
  const [showStartupIndexBubble, setShowStartupIndexBubble] = useState(false);
  const [renderRevision, forceRender] = useState(0);
  const graphSearchRead = useMemo(() => createLegacyGraphSearchRead(plugin.index), [plugin.index]);
  const [plexFilter, setPlexFilter] = useState<PlexFilterState>(EMPTY_PLEX_FILTER);
  const [filterLayoutMode, setFilterLayoutMode] = useState<GraphFilterLayoutMode>("keep");
  const plexFilterPredicate = useMemo(() => compilePlexFilter(plexFilter), [plexFilter]);
  const [graphLenses, setGraphLensesState] = useState<GraphLensDefinition[]>(() => plugin.settings.graphLenses);
  const compiledGraphLenses = useMemo(() => compileGraphLensDefinitions(graphLenses), [graphLenses]);
  const [predicateRevision, refreshPredicates] = useState(0);
  const [hostWidth, setHostWidth] = useState(0);
  const [sidecarRevision, setSidecarRevision] = useState(0);
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const [initialWorkspaceFile] = useState<TFile | null>(() => plugin.app.workspace.getActiveFile());
  const [activePath, setActivePath] = useState(() => {
    const history = plugin.settings.navigationHistory;
    // During Obsidian workspace restore, getActiveFile()/getMostRecentLeaf() can temporarily point
    // at the first serialized tab in a group. A restored K-Plex view should keep its own persisted
    // center until the startup sidecar/link re-association window has finished.
    return (plugin.isStartupInitializing() && plugin.settings.lastActivePath
      ? plugin.settings.lastActivePath
      : initialWorkspaceFile?.path) ?? (
      plugin.settings.lastActivePath
      || history[history.length - 1]
      || "folder:/"
    );
  });
  const activePathRef = useRef(activePath);
  const pendingFileExplorerDropRef = useRef<TFile | null>(null);
  const activeFileRef = useRef<TFile | null>(
    plugin.index.get(activePath)?.file ?? (initialWorkspaceFile?.path === activePath ? initialWorkspaceFile : null),
  );
  const [historyCursor, setHistoryCursor] = useState(() => Math.max(0, plugin.settings.navigationHistory.length - 1));

  const activate = useCallback((target: GraphPage, record = true) => {
    // Any newer explicit navigation supersedes a note waiting for partial indexing.
    pendingFileExplorerDropRef.current = null;
    activePathRef.current = target.path;
    activeFileRef.current = target.file;
    setActivePath(target.path);
    plugin.settings.lastActivePath = target.path;
    if (record) {
      const next = [...plugin.settings.navigationHistory.filter((path) => path !== target.path), target.path].slice(-40);
      plugin.settings.navigationHistory = next;
      setHistoryCursor(next.length - 1);
    }
    void plugin.saveSettings(false, false);
    void plugin.syncPageToDocumentLeaf(target);
    void plugin.syncSidecarToPage(hostLeaf, target);
  }, [plugin, hostLeaf]);

  /** Complete a queued File Explorer note drop as soon as partial indexing publishes that note. */
  const activatePendingFileExplorerDrop = useCallback(() => {
    const file = pendingFileExplorerDropRef.current;
    if (!file) return;
    if (plugin.app.vault.getFileByPath(file.path) !== file) {
      pendingFileExplorerDropRef.current = null;
      return;
    }
    const target = plugin.index.get(file.path);
    if (!target) return;
    pendingFileExplorerDropRef.current = null;
    activate(target, true);
  }, [plugin, activate]);

  /** Register and clean up the pending-drop index subscription for this mounted K-Plex surface. */
  const subscribePendingFileExplorerDrop = useCallback(
    () => plugin.index.subscribe(activatePendingFileExplorerDrop),
    [plugin, activatePendingFileExplorerDrop],
  );

  useEffect(subscribePendingFileExplorerDrop, [subscribePendingFileExplorerDrop]);

  useEffect(() => plugin.index.subscribe(() => {
    // A TFile keeps its object identity while Obsidian renames or moves it. Track the central file
    // by that identity and adopt its new path only after the rebuilt index has published it. This
    // prevents the center from briefly/finally falling back to folder:/ when its filename changes.
    const trackedFile = activeFileRef.current;
    if (trackedFile && trackedFile.path === activePathRef.current && !plugin.index.get(trackedFile.path)
      && plugin.isManagedCreatedFile(trackedFile) && plugin.app.vault.getFileByPath(trackedFile.path) === trackedFile) {
      // A full index build can have started before this note was created. If that stale snapshot
      // publishes after the user has already selected the optimistic node, immediately reinsert the
      // known TFile instead of allowing the center to fall back to the previous history entry.
      plugin.index.insertCreatedFile(trackedFile);
      return;
    }
    if (trackedFile && trackedFile.path !== activePathRef.current && plugin.index.get(trackedFile.path)) {
      activePathRef.current = trackedFile.path;
      setActivePath(trackedFile.path);
    }
    // Hidden tabs/sidebars stay mounted in Obsidian. Do not run the graph React tree for a shared
    // index publication unless this surface is actually visible; it catches up on reveal.
    if (plugin.isKplexLeafVisible(hostLeaf)) forceRender((value) => value + 1);
  }), [plugin, hostLeaf]);
  useEffect(() => plugin.subscribeKplexVisibility(() => {
    // A hidden mounted view may have skipped one or more shared index publications while another
    // K-Plex surface was visible. Re-render exactly once when this leaf becomes visible again.
    if (plugin.isKplexLeafVisible(hostLeaf)) forceRender((value) => value + 1);
  }), [plugin, hostLeaf]);
  useEffect(() => {
    if (!plexFilterPredicate?.dependencies.usesFrontmatter && !compiledGraphLenses.usesFrontmatter) return;
    const ref = plugin.app.metadataCache.on("changed", (file) => {
      if (file.extension === "md" && plugin.isKplexLeafVisible(hostLeaf)) {
        refreshPredicates((value) => value + 1);
      }
    });
    return () => plugin.app.metadataCache.offref(ref);
  }, [plugin, hostLeaf, plexFilterPredicate, compiledGraphLenses.usesFrontmatter]);
  useEffect(() => plugin.subscribeGraphLenses((next) => setGraphLensesState(next)), [plugin]);
  useEffect(() => plugin.subscribeSidecar(() => setSidecarRevision((value) => value + 1)), [plugin]);
  useEffect(() => plugin.subscribeNavigation((path) => {
    const target = plugin.index.get(path);
    if (target) activate(target, true);
  }), [plugin, activate]);
  useEffect(
    () => plugin.subscribeSearchFocus(hostLeaf, () => setSearchFocusRequest((value) => value + 1)),
    [plugin, hostLeaf],
  );

  useEffect(() => {
    const followFile = (file: TFile | null) => {
      if (!plugin.isKplexLeafVisible(hostLeaf)) return;
      if (!file || !plugin.shouldFollowDocumentFile(file) || !plugin.index.get(file.path)) return;
      const target = plugin.index.get(file.path);
      if (target) activate(target, true);
    };

    const fileRef = plugin.app.workspace.on("file-open", followFile);
    const leafRef = plugin.app.workspace.on("active-leaf-change", () => {
      if (!plugin.isKplexLeafVisible(hostLeaf)) return;
      forceRender((value) => value + 1);
      followFile(plugin.app.workspace.getActiveFile());
    });
    return () => {
      plugin.app.workspace.offref(fileRef);
      plugin.app.workspace.offref(leafRef);
    };
  }, [plugin, hostLeaf, activate]);

  const exactPage = plugin.index.get(activePath);
  const fallbackPath = exactPage ? null : plugin.resolveNavigationFallbackPath(activePath);
  const page = exactPage
    ?? (fallbackPath ? plugin.index.get(fallbackPath) : undefined)
    ?? plugin.index.get("folder:/");
  const hasPage = Boolean(page);

  useEffect(/** Claim startup guidance after the first useful page, and permanently close it on readiness. */ () => {
    if (indexStatus.upToDate) {
      setShowStartupIndexBubble(false);
      return;
    }
    if (!page || !plugin.isKplexLeafVisible(hostLeaf)) return;
    if (plugin.claimStartupIndexInfoBubble()) setShowStartupIndexBubble(true);
  }, [plugin, hostLeaf, page?.path, indexStatus.upToDate, renderRevision]);

  /** Keep explicit and outside-pointer/Escape dismissal on the same caller-owned state transition. */
  const dismissStartupIndexBubble = useCallback((): void => {
    setShowStartupIndexBubble(false);
  }, []);

  // The first render can show the empty indexing view, which has no rootRef. Attach once the
  // graph root appears, and release the document-scoped listener if it disappears again.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    return installKplexLongPressTooltips(el.ownerDocument);
  }, [hasPage]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setHostWidth(el.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasPage]);

  useEffect(() => {
    if (!page) return;
    const replacingMissingCenter = page.path !== activePath;
    // During partial startup hydration the root can exist before a still-valid persisted center has
    // been restored. Never persist that temporary root. Once the authoritative index is ready, a
    // genuinely missing center falls back through navigation history and only then to folder:/.
    if (replacingMissingCenter && page.path === "folder:/" && !plugin.isNavigationFallbackReady()) return;
    activePathRef.current = page.path;
    activeFileRef.current = page.file;
    if (replacingMissingCenter) {
      setActivePath(page.path);
      const historyIndex = plugin.settings.navigationHistory.lastIndexOf(page.path);
      if (historyIndex >= 0) setHistoryCursor(historyIndex);
    }
    if (plugin.settings.lastActivePath === page.path) return;
    plugin.settings.lastActivePath = page.path;
    void plugin.saveSettings(false, false);
  }, [page?.path, activePath, plugin]);

  const open = useCallback((target: GraphPage) => { void plugin.openPage(target); }, [plugin]);

  const updateGraphLenses = useCallback((next: GraphLensDefinition[]) => {
    setGraphLensesState(next);
    void plugin.setGraphLenses(next);
  }, [plugin]);

  const goHistory = (delta: number) => {
    const list = plugin.settings.navigationHistory;
    if (!list.length) return;
    const cursor = Math.max(0, Math.min(list.length - 1, historyCursor + delta));
    setHistoryCursor(cursor);
    const target = plugin.index.get(list[cursor]);
    if (target) activate(target, false);
  };

  const toggleToolbarSetting = async (key: BooleanToolbarSetting) => {
    plugin.settings[key] = !plugin.settings[key];
    // These toolbar/filter controls are presentation-only. Folder/tag topology and aliases reuse
    // already-materialized graph state, so toggling them must not rebuild the semantic index.
    await plugin.saveSettings(false, true);
    forceRender((value) => value + 1);
  };

  /** Switch the center presentation immediately; persistence must not delay the node transition. */
  const setCentralNodeEditorEnabled = (enabled: boolean): void => {
    if (plugin.settings.embedCentralNode === enabled) return;
    plugin.settings.embedCentralNode = enabled;
    forceRender((value) => value + 1);
    void plugin.saveSettings(false, false).catch((error: unknown) => {
      console.error("K-Plex failed to save the central-node editor preference.", error);
    });
  };

  /** Remember the mode selected in the embedded center so the next center opens the same way. */
  const rememberCentralNodeMarkdownMode = (mode: SidecarMarkdownMode): void => {
    if (plugin.settings.centralNodeMarkdownMode === mode) return;
    plugin.settings.centralNodeMarkdownMode = mode;
    void plugin.saveSettings(false, false).catch((error: unknown) => {
      console.error("K-Plex failed to save the central-node Markdown mode.", error);
    });
  };

  const setNodeSortOrder = async (order: NodeSortOrder) => {
    if (plugin.settings.nodeSortOrder === order) return;
    plugin.settings.nodeSortOrder = order;
    await plugin.saveSettings(false, true);
    forceRender((value) => value + 1);
  };

  const setSiblingVisibility = async (show: boolean) => {
    if (plugin.settings.renderSiblings === show) return;
    plugin.settings.renderSiblings = show;
    // Siblings are derived from the existing semantic graph, so changing visibility only needs
    // a presentation refresh; the persisted setting remains the default for future K-Plex views.
    await plugin.saveSettings(false, true);
    forceRender((value) => value + 1);
  };

  const setDocumentSyncMode = async (mode: DocumentSyncMode) => {
    await plugin.setDocumentSyncMode(mode, page);
    forceRender((value) => value + 1);
  };

  const showDocumentSyncMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const menu = new Menu();
    const current = plugin.getDocumentSyncMode();

    menu.addItem((item) => item
      .setTitle(translate("app.syncRecentTabWithPlex"))
      .setIcon("arrow-right")
      .setDisabled(!page?.file)
      .onClick(() => { if (page) void plugin.syncMostRecentTabWithKplex(page).then(() => forceRender((value) => value + 1)); }));
    menu.addItem((item) => item
      .setTitle(translate("app.syncPlexWithRecentTab"))
      .setIcon("arrow-left")
      .onClick(() => void plugin.syncKplexWithMostRecentTab().then((file) => {
        if (!file) return;
        const target = plugin.index.get(file.path);
        if (target) activate(target, true);
      })));

    menu.addSeparator();
    const choices: Array<[DocumentSyncMode, string, string]> = [
      ["off", translate("app.syncModeOff"), "unlink"],
      ["recent", translate("app.syncModeRecent"), "link"],
      ["pinned", translate("app.syncModePinned"), "pin"],
    ];
    for (const [mode, title, icon] of choices) {
      menu.addItem((item) => item
        .setTitle(title)
        .setIcon(icon)
        .setChecked(current === mode)
        .onClick(() => void setDocumentSyncMode(mode)));
    }
    menu.addSeparator();
    menu.addItem((item) => item
      .setTitle(translate("app.showLinkedTab"))
      .setIcon("scan-eye")
      .setDisabled(!plugin.hasDocumentSyncTarget())
      .onClick(() => void plugin.showLinkedDocumentLeaf()));
    plugin.showKplexMenuAtMouseEvent(menu, event.nativeEvent);
  };

  const toggleExpandedView = async () => {
    plugin.settings.graphDepth = plugin.settings.graphDepth === 2 ? 1 : 2;
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
  };

  const toggleConnectorStyle = async () => {
    plugin.settings.connectorStyle = plugin.settings.connectorStyle === "straight" ? "bezier" : "straight";
    await plugin.saveSettings(false, false);
    forceRender((value) => value + 1);
  };

  const activateSearch = () => setSearchFocusRequest((value) => value + 1);
  const searchCopy = searchFieldCopy(translate, environment);

  const handlePlexKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isSearchFocusShortcut(event)) return;
    const target = event.target as Element | null;
    // The central editor is a native Obsidian Markdown surface. Do not steal editor shortcuts
    // such as Ctrl/Cmd+F while focus is inside it; the graph search remains available from the
    // toolbar after the editor has been enabled.
    if (target?.closest(".kplex-central-editor-content")) return;
    event.preventDefault();
    event.stopPropagation();
    activateSearch();
  };

  /** Keep ordinary pointer focus behavior separate from File Explorer drag/drop handling. */
  const handlePlexPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    plugin.dismissKplexMenu();
    const target = event.target as Element | null;
    if (target?.closest(".kplex-central-editor-content, input, textarea, select, button, a, [contenteditable='true'], [role='button']")) return;
    rootRef.current?.focus({ preventScroll: true });
  };

  /** Allow the browser drop gesture only for a single Markdown note from Obsidian File Explorer. */
  const handlePlexDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!getDraggedMarkdownFile(plugin.app)) return;
    event.preventDefault();
  };

  /** Re-center this K-Plex surface on a File Explorer note, queuing it while partial indexing catches up. */
  const handlePlexDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const file = getDraggedMarkdownFile(plugin.app);
    if (!file) return;
    event.preventDefault();
    event.stopPropagation();
    const target = plugin.index.get(file.path);
    if (target) {
      pendingFileExplorerDropRef.current = null;
      activate(target, true);
      return;
    }
    pendingFileExplorerDropRef.current = file;
  };

  if (!page) return <div
    className="excalibrain-app excalibrain-empty"
    onDragOver={handlePlexDragOver}
    onDrop={handlePlexDrop}
  >
    <div className="kplex-index-status-empty"><IndexStatusIndicator status={indexStatus} /></div>
    <span>{translate("app.buildingIndex")}</span>
  </div>;

  const linkedLabel = plugin.getLinkedDocumentLeafLabel();
  const syncMode = plugin.getDocumentSyncMode();
  const syncTargetAvailable = plugin.hasDocumentSyncTarget();
  const syncIcon = syncMode === "pinned" ? "pin" : syncMode === "recent" ? "link" : "unlink";
  const syncTitle = syncMode === "off"
    ? translate("app.syncStatusOff")
    : syncMode === "recent"
      ? (syncTargetAvailable ? translate("app.syncStatusRecent") : translate("app.syncStatusNoRecent"))
      : (syncTargetAvailable
        ? translate("app.syncStatusPinned", { suffix: linkedLabel ? ` · ${linkedLabel}` : "" })
        : translate("app.syncStatusPinnedUnavailable"));
  const pinnedPages = plugin.settings.pinnedNodes
    .map((path) => plugin.index.get(path))
    .filter((item): item is GraphPage => Boolean(item));
  const sidecarAvailable = surface !== "sidepanel";
  const sidecarPosition = sidecarAvailable ? plugin.getSidecarPosition(hostLeaf) : null;
  const sidecarOpen = Boolean(sidecarPosition);
  const sidecarEdgePosition = sidecarPosition ?? plugin.settings.sidecarPosition;
  const foldPlexIcon = sidecarEdgePosition === "left" ? "panel-right-close"
    : sidecarEdgePosition === "above" ? "panel-bottom-close"
      : sidecarEdgePosition === "below" ? "panel-top-close"
        : "panel-left-close";
  const closeSidecarIcon = sidecarEdgePosition === "left" ? "panel-left-close"
    : sidecarEdgePosition === "above" ? "panel-top-close"
      : sidecarEdgePosition === "below" ? "panel-bottom-close"
        : "panel-right-close";
  const openSidecarIcon = sidecarEdgePosition === "left" ? "panel-left-open"
    : sidecarEdgePosition === "above" ? "panel-top-open"
      : sidecarEdgePosition === "below" ? "panel-bottom-open"
        : "panel-right-open";
  const condensedBySidecar = sidecarAvailable && sidecarOpen && hostWidth > 0 && hostWidth <= plugin.settings.sidecarCondensedBreakpoint;
  const profileSurface: KplexViewSurface = condensedBySidecar ? "sidepanel" : surface;
  const viewSettings = plugin.getViewSettings(profileSurface);

  const unpin = async (path: string) => { if (plugin.isPinned(path)) await plugin.togglePinned(path); forceRender((value) => value + 1); };

  const showSidecarMoveMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const menu = new Menu();
    const options: Array<[SidecarPosition, string, string]> = [
      ["right", translate("position.right"), "panel-right"], ["left", translate("position.left"), "panel-left"], ["above", translate("position.above"), "panel-top"], ["below", translate("position.below"), "panel-bottom"],
    ];
    for (const [position, label, icon] of options) menu.addItem((item) => item
      .setTitle(label).setIcon(icon).setChecked((sidecarPosition ?? plugin.settings.sidecarPosition) === position)
      .onClick(() => void plugin.moveSidecar(hostLeaf, position, page)));
    plugin.showKplexMenuAtMouseEvent(menu, event.nativeEvent);
  };

  void sidecarRevision; // subscription is a render trigger; all state is owned by the plugin.

  return <div
    ref={rootRef}
    className={`excalibrain-app kplex-surface-${surface}${condensedBySidecar ? " is-sidecar-condensed" : ""}`}
    data-kplex-tooltip-scope
    tabIndex={-1}
    onKeyDownCapture={handlePlexKeyDown}
    onPointerDownCapture={handlePlexPointerDown}
    onDragOver={handlePlexDragOver}
    onDrop={handlePlexDrop}
  >
    <div className="excalibrain-main-column">
      <div className="excalibrain-top-stack">
        <header className="excalibrain-topbar">
          <IndexStatusIndicator status={indexStatus} indicatorRef={indexStatusRef} />
          <InfoBubble
            open={showStartupIndexBubble && !indexStatus.upToDate}
            targetRef={indexStatusRef}
            message={translate("index.incompleteBubble")}
            dismissLabel={translate("infoBubble.dismiss")}
            onDismiss={dismissStartupIndexBubble}
          />
          <div className="excalibrain-brand"><ObsidianIcon name="brain-circuit" size={20} className="excalibrain-brand-mark" /><strong>{translate("view.displayName")}</strong></div>
          <ActionButton
            label={translate("toolbar.navigateBack")}
            icon={<ObsidianIcon name="arrow-big-left" size={17} />}
            onClick={() => goHistory(-1)}
            disabled={historyCursor <= 0}
          />
          <ActionButton
            label={translate("toolbar.navigateForward")}
            icon={<ObsidianIcon name="arrow-big-right" size={17} />}
            onClick={() => goHistory(1)}
            disabled={historyCursor >= plugin.settings.navigationHistory.length - 1}
          />
          <SearchBox
            graph={graphSearchRead}
            icon={<ObsidianIcon name="search" size={16} />}
            portalSelector=".excalibrain-app"
            appTopbarSelector=".excalibrain-topbar"
            revision={renderRevision}
            onActivate={(id) => {
              const target = plugin.index.get(id);
              if (target) activate(target);
            }}
            focusRequest={searchFocusRequest}
            placeholder={searchCopy.placeholder}
            ariaLabel={searchCopy.ariaLabel}
          />
          <PlexFilter
            index={plugin.index}
            center={page}
            revision={renderRevision}
            value={plexFilter}
            onChange={setPlexFilter}
            lenses={graphLenses}
            onLensesChange={updateGraphLenses}
            layoutMode={filterLayoutMode}
            onLayoutModeChange={setFilterLayoutMode}
            showSiblings={plugin.settings.renderSiblings}
            onShowSiblingsChange={(show) => void setSiblingVisibility(show)}
            visibility={{
              showAttachments: plugin.settings.showAttachments,
              showVirtualNodes: plugin.settings.showVirtualNodes,
              showInferredNodes: plugin.settings.showInferredNodes,
              showPageNodes: plugin.settings.showPageNodes,
              showFolderNodes: plugin.settings.showFolderNodes,
              showTagNodes: plugin.settings.showTagNodes,
              showURLNodes: plugin.settings.showURLNodes,
            }}
            onVisibilityChange={(key) => void toggleToolbarSetting(key)}
            sortOrder={plugin.settings.nodeSortOrder}
            onSortOrderChange={(order) => void setNodeSortOrder(order)}
            translate={translate}
          />
          <div className="excalibrain-top-actions is-compact">
            <button
              className={`excalibrain-icon-button${syncMode !== "off" && syncTargetAvailable ? " is-on" : ""}`}
              aria-label={translate("app.syncActions", { status: syncTitle })}
              onClick={showDocumentSyncMenu}
            ><ObsidianIcon name={syncIcon} size={17} /></button>
            <ToolButton
              icon="type"
              title={translate(plugin.settings.renderAlias ? "app.displayAliasesOn" : "app.displayAliasesOff")}
              on={plugin.settings.renderAlias}
              onClick={() => void toggleToolbarSetting("renderAlias")}
            />
            <span className="excalibrain-toolbar-divider" />
            <ToolButton icon={plugin.settings.graphDepth === 2 ? "list-chevrons-down-up" : "list-chevrons-up-down"} title={translate(plugin.settings.graphDepth === 2 ? "app.singleLevelView" : "app.expandedView")} on={plugin.settings.graphDepth === 2} onClick={() => void toggleExpandedView()} />
            <ToolButton icon="spline" title={translate(plugin.settings.connectorStyle === "bezier" ? "app.useStraightConnectors" : "app.useCurvedConnectors")} on={plugin.settings.connectorStyle === "bezier"} onClick={() => void toggleConnectorStyle()} />
            <ToolButton icon="settings" title={translate("app.openSettings")} onClick={() => plugin.openSettings()} />
          </div>
        </header>

        {pinnedPages.length > 0 && <div className="kplex-pinned-bar" aria-label={translate("app.pinnedNodes")}>
          {pinnedPages.map((pinned) => {
            const title = plugin.index.titleFor(pinned);
            return <div key={pinned.path} className={`kplex-pinned-chip${pinned.path === page.path ? " is-active" : ""}`}>
              <button className="kplex-pinned-open" title={`${title}\n${pinned.path}`} onClick={() => activate(pinned)}><ObsidianIcon name="pin" size={12} /><span>{title}</span></button>
              <button className="kplex-pinned-remove" aria-label={translate("app.unpinNode", { title })} onClick={() => void unpin(pinned.path)}><ObsidianIcon name="x" size={11} /></button>
            </div>;
          })}
        </div>}
      </div>

      <main className="excalibrain-workspace">
        <section className="excalibrain-graph-area">
          <div className="excalibrain-zone-label zone-parent">{translate("app.zoneParents")}</div>
          <div className="excalibrain-zone-label zone-left">{translate("app.zoneFriendsPrevious")}</div>
          <div className="excalibrain-zone-label zone-right">{translate("app.zoneChallengersNext")}</div>
          <div className="excalibrain-zone-label zone-child">{translate("app.zoneChildren")}</div>
          <PlexGraph plugin={plugin} index={plugin.index} settings={viewSettings} surface={profileSurface} hostLeaf={hostLeaf} predicate={plexFilterPredicate} lenses={compiledGraphLenses} filterLayoutMode={filterLayoutMode} predicateRevision={predicateRevision} showCrossLinks={plexFilter.showCrossLinks} activePath={page.path} renderRevision={renderRevision} onActivate={activate} onOpen={open} onCentralNodeEditorChange={setCentralNodeEditorEnabled} onCentralNodeModeChange={rememberCentralNodeMarkdownMode} />
        </section>
      </main>

      {sidecarAvailable && <div className={`kplex-sidecar-controls is-${sidecarEdgePosition}${sidecarOpen ? " is-open" : " is-closed"}`} aria-label={translate("app.sidecarControls")}>
        <button className="kplex-sidecar-primary" aria-label={sidecarOpen ? translate("app.closeSidecar") : translate("app.openSidecarAt", { position: physicalPositionLabel(sidecarEdgePosition, translate) })} onClick={() => void plugin.toggleSidecar(hostLeaf, page)}><ObsidianIcon name={sidecarOpen ? closeSidecarIcon : openSidecarIcon} size={16} /></button>
        {sidecarOpen && <>
          <button aria-label={translate("app.foldForSidecar")} onClick={() => void plugin.collapsePlexForSidecar(hostLeaf)}><ObsidianIcon name={foldPlexIcon} size={15} /></button>
          <button aria-label={translate("app.moveSidecar")} onClick={showSidecarMoveMenu}><ObsidianIcon name="move" size={15} /></button>
          <button aria-label={translate("app.detachSidecar")} onClick={() => void plugin.detachSidecar(hostLeaf)}><ObsidianIcon name="unlink" size={15} /></button>
        </>}
      </div>}

      <footer className="excalibrain-history-bar">
        <span className="excalibrain-history-label">{translate("app.pastNodes")}</span>
        <div className="excalibrain-history-list">
          {plugin.settings.navigationHistory.slice(-14).reverse().map((path, indexValue) => {
            const item = plugin.index.get(path);
            if (!item) return null;
            const title = plugin.index.titleFor(item);
            return <button key={`${path}:${indexValue}`} title={`${title}\n${path}`} className={path === page.path ? "is-active" : ""} onClick={() => activate(item)}>{title}</button>;
          })}
        </div>
      </footer>
    </div>
  </div>;
}
