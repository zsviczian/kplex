import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Menu, type TFile, type WorkspaceLeaf } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { GraphPage } from "../types";
import type { PresentationEnvironment } from "../core/contracts/presentationEnvironment";
import { isSearchFocusShortcut } from "../core/plex/shortcutPresentation";
import type { Translator } from "../lang";
import { searchFieldCopy } from "./features/searchPresentation";
import type { DocumentSyncMode, KplexViewSurface, NodeSortOrder, SidecarPosition } from "../settings";
import { SearchBox } from "./SearchBox";
import { ActionButton } from "./components/ActionButton";
import { PlexGraph } from "./PlexGraph";
import { ObsidianIcon } from "./ObsidianIcon";
import { EMPTY_PLEX_FILTER, PlexFilter, type GraphFilterLayoutMode, type PlexFilterState, type PlexVisibilitySetting } from "./PlexFilter";
import { compilePlexFilter } from "../lens/SimplePlexFilter";
import { compileGraphLensDefinitions, type GraphLensDefinition } from "../lens/GraphLens";
import { installKplexLongPressTooltips } from "./LongPressTooltip";

type BooleanToolbarSetting = PlexVisibilitySetting | "renderAlias";

function IndexStatusIndicator({ plugin }: { plugin: ExcaliBrainPlugin }) {
  const [status, setStatus] = useState(() => plugin.getIndexStatus());
  useEffect(() => plugin.subscribeIndexStatus(() => setStatus(plugin.getIndexStatus())), [plugin]);
  return <span
    className={`kplex-index-status${status.upToDate ? " is-ready" : " is-updating"}`}
    aria-label={status.label}
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

export function ExcaliBrainApp({ plugin, surface, hostLeaf, translate, environment }: {
  plugin: ExcaliBrainPlugin;
  surface: KplexViewSurface;
  hostLeaf: WorkspaceLeaf;
  translate: Translator;
  environment: PresentationEnvironment;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [renderRevision, forceRender] = useState(0);
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
  const activeFileRef = useRef<TFile | null>(
    plugin.index.get(activePath)?.file ?? (initialWorkspaceFile?.path === activePath ? initialWorkspaceFile : null),
  );
  const [historyCursor, setHistoryCursor] = useState(() => Math.max(0, plugin.settings.navigationHistory.length - 1));

  const activate = useCallback((target: GraphPage, record = true) => {
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
    // These toolbar/filter controls are presentation-only. Folder/tag topology and aliases are
    // already present in the index, so changing their display must never rebuild the semantic graph.
    await plugin.saveSettings(false, true);
    forceRender((value) => value + 1);
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
      .setTitle("Sync most recent note tab with K-Plex")
      .setIcon("arrow-right")
      .setDisabled(!page?.file)
      .onClick(() => { if (page) void plugin.syncMostRecentTabWithKplex(page).then(() => forceRender((value) => value + 1)); }));
    menu.addItem((item) => item
      .setTitle("Sync K-Plex with most recent note tab")
      .setIcon("arrow-left")
      .onClick(() => void plugin.syncKplexWithMostRecentTab().then((file) => {
        if (!file) return;
        const target = plugin.index.get(file.path);
        if (target) activate(target, true);
      })));

    menu.addSeparator();
    const choices: Array<[DocumentSyncMode, string, string]> = [
      ["off", "K-Plex not linked to a note tab", "unlink"],
      ["recent", "K-Plex linked to most recent note tab", "link"],
      ["pinned", "K-Plex pinned to one fixed note tab", "pin"],
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
      .setTitle("Show linked/pinned tab")
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
    event.preventDefault();
    event.stopPropagation();
    activateSearch();
  };

  const handlePlexPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    plugin.dismissKplexMenu();
    const target = event.target as Element | null;
    if (target?.closest("input, textarea, select, button, a, [contenteditable='true'], [role='button']")) return;
    rootRef.current?.focus({ preventScroll: true });
  };


  if (!page) return <div className="excalibrain-app excalibrain-empty">
    <div className="kplex-index-status-empty"><IndexStatusIndicator plugin={plugin} /></div>
    <span>Building K-Plex index…</span>
  </div>;

  const linkedLabel = plugin.getLinkedDocumentLeafLabel();
  const syncMode = plugin.getDocumentSyncMode();
  const syncTargetAvailable = plugin.hasDocumentSyncTarget();
  const syncIcon = syncMode === "pinned" ? "pin" : syncMode === "recent" ? "link" : "unlink";
  const syncTitle = syncMode === "off"
    ? "K-Plex is not linked to a note tab"
    : syncMode === "recent"
      ? (syncTargetAvailable ? "K-Plex is linked to the most recent note tab" : "No recent note tab is currently available")
      : (syncTargetAvailable
        ? `K-Plex is pinned to a fixed note tab${linkedLabel ? ` · ${linkedLabel}` : ""}`
        : "K-Plex has a pinned-tab preference, but the tab is not currently connected");
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
      ["right", "Right", "panel-right"], ["left", "Left", "panel-left"], ["above", "Above", "panel-top"], ["below", "Below", "panel-bottom"],
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
  >
    <div className="excalibrain-main-column">
      <div className="excalibrain-top-stack">
        <header className="excalibrain-topbar">
          <IndexStatusIndicator plugin={plugin} />
          <div className="excalibrain-brand"><ObsidianIcon name="brain-circuit" size={20} className="excalibrain-brand-mark" /><strong>K-Plex</strong></div>
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
            index={plugin.index}
            onActivate={activate}
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
          />
          <div className="excalibrain-top-actions is-compact">
            <button
              className={`excalibrain-icon-button${syncMode !== "off" && syncTargetAvailable ? " is-on" : ""}`}
              aria-label={`${syncTitle}. Click for sync actions and link mode.`}
              onClick={showDocumentSyncMenu}
            ><ObsidianIcon name={syncIcon} size={17} /></button>
            <ToolButton
              icon="type"
              title={plugin.settings.renderAlias ? "Display aliases: on" : "Display aliases: off"}
              on={plugin.settings.renderAlias}
              onClick={() => void toggleToolbarSetting("renderAlias")}
            />
            <span className="excalibrain-toolbar-divider" />
            <ToolButton icon={plugin.settings.graphDepth === 2 ? "list-chevrons-down-up" : "list-chevrons-up-down"} title={plugin.settings.graphDepth === 2 ? "Single-level view" : "Expanded view: show each node’s children"} on={plugin.settings.graphDepth === 2} onClick={() => void toggleExpandedView()} />
            <ToolButton icon="spline" title={plugin.settings.connectorStyle === "bezier" ? "Use straight connectors" : "Use curved connectors"} on={plugin.settings.connectorStyle === "bezier"} onClick={() => void toggleConnectorStyle()} />
            <ToolButton icon="settings" title="Open K-Plex settings" onClick={() => plugin.openSettings()} />
          </div>
        </header>

        {pinnedPages.length > 0 && <div className="kplex-pinned-bar" aria-label="Pinned nodes">
          {pinnedPages.map((pinned) => {
            const title = plugin.index.titleFor(pinned);
            return <div key={pinned.path} className={`kplex-pinned-chip${pinned.path === page.path ? " is-active" : ""}`}>
              <button className="kplex-pinned-open" title={`${title}\n${pinned.path}`} onClick={() => activate(pinned)}><ObsidianIcon name="pin" size={12} /><span>{title}</span></button>
              <button className="kplex-pinned-remove" aria-label={`Unpin ${title}`} onClick={() => void unpin(pinned.path)}><ObsidianIcon name="x" size={11} /></button>
            </div>;
          })}
        </div>}
      </div>

      <main className="excalibrain-workspace">
        <section className="excalibrain-graph-area">
          <div className="excalibrain-zone-label zone-parent">PARENTS</div>
          <div className="excalibrain-zone-label zone-left">FRIENDS / PREVIOUS</div>
          <div className="excalibrain-zone-label zone-right">CHALLENGERS / NEXT</div>
          <div className="excalibrain-zone-label zone-child">CHILDREN</div>
          <PlexGraph plugin={plugin} index={plugin.index} settings={viewSettings} surface={profileSurface} hostLeaf={hostLeaf} predicate={plexFilterPredicate} lenses={compiledGraphLenses} filterLayoutMode={filterLayoutMode} predicateRevision={predicateRevision} showCrossLinks={plexFilter.showCrossLinks} activePath={page.path} renderRevision={renderRevision} onActivate={activate} onOpen={open} />
        </section>
      </main>

      {sidecarAvailable && <div className={`kplex-sidecar-controls is-${sidecarEdgePosition}${sidecarOpen ? " is-open" : " is-closed"}`} aria-label="Sidecar controls">
        <button className="kplex-sidecar-primary" aria-label={sidecarOpen ? "Close companion Sidecar" : `Open Sidecar on the ${sidecarEdgePosition}`} onClick={() => void plugin.toggleSidecar(hostLeaf, page)}><ObsidianIcon name={sidecarOpen ? closeSidecarIcon : openSidecarIcon} size={16} /></button>
        {sidecarOpen && <>
          <button aria-label="Fold K-Plex and give the companion document the full split" onClick={() => void plugin.collapsePlexForSidecar(hostLeaf)}><ObsidianIcon name={foldPlexIcon} size={15} /></button>
          <button aria-label="Move Sidecar" onClick={showSidecarMoveMenu}><ObsidianIcon name="move" size={15} /></button>
          <button aria-label="Detach Sidecar — keep this tab open independently" onClick={() => void plugin.detachSidecar(hostLeaf)}><ObsidianIcon name="unlink" size={15} /></button>
        </>}
      </div>}

      <footer className="excalibrain-history-bar">
        <span className="excalibrain-history-label">PAST NODES</span>
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
