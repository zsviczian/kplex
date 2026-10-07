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
import { FileView, Menu, type TFile, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../main";
import type { GraphPage } from "../types";
import type { PresentationEnvironment } from "../core/contracts/presentationEnvironment";
import { isSearchFocusShortcut, isPlexFindShortcut } from "../core/plex/shortcutPresentation";
import type { Translator } from "../lang";
import { physicalPositionLabel } from "./features/positionPresentation";
import { searchFieldCopy } from "./features/searchPresentation";
import type { DocumentSyncMode, KplexViewSurface, NodeSortOrder, SidecarMarkdownMode, SidecarPosition } from "../settings";
import { SearchBox } from "./features/SearchBox";
import { createLegacyGraphSearchRead } from "../adapters/obsidian/graphContracts";
import { isEmbeddedMarkdownLeaf } from "../adapters/obsidian/embeddedMarkdownLeaf";
import { getDraggedFile } from "../adapters/obsidian/fileExplorerDrag";
import { ActionButton } from "./components/ActionButton";
import { DoubleTapGesture } from "./components/DoubleTapGesture";
import { InfoBubble } from "./components/InfoBubble";
import type { FloatingLayerDismissReason } from "./components/FloatingLayer";
import { PlexGraph } from "./PlexGraph";
import { ObsidianIcon } from "./ObsidianIcon";
import { VaultStatsModal } from "./VaultStatsModal";
import { EMPTY_PLEX_FILTER, PlexFilter, type GraphFilterLayoutMode, type PlexFilterState, type PlexVisibilitySetting } from "./PlexFilter";
import { compilePlexFilter } from "../lens/SimplePlexFilter";
import { compileGraphLensDefinitions, type GraphLensDefinition } from "../lens/GraphLens";
import { installKplexLongPressTooltips } from "./LongPressTooltip";

type BooleanToolbarSetting = PlexVisibilitySetting | "renderAlias";
type IndexStatus = ReturnType<KplexPlugin["getIndexStatus"]>;

/** Subscribe a visible K-Plex surface to host-owned index status and catch up once on reveal. */
function useIndexStatus(plugin: KplexPlugin, hostLeaf: WorkspaceLeaf): IndexStatus {
  const [status, setStatus] = useState(() => plugin.getIndexStatus());
  useEffect(() => {
    /** Refresh only when a visible status fact changed; progressive graph publication can be frequent. */
    const refresh = (): void => {
      if (!plugin.isKplexLeafVisible(hostLeaf)) return;
      const next = plugin.getIndexStatus();
      setStatus((current) => (
        current.upToDate === next.upToDate
        && current.phase === next.phase
        && current.label === next.label
        && current.indexedFiles === next.indexedFiles
        && current.totalFiles === next.totalFiles
          ? current
          : next
      ));
    };
    const releaseCoordinator = plugin.subscribeIndexStatus(refresh);
    const releaseIndex = plugin.index.subscribe(refresh);
    const releasePresentation = plugin.index.subscribePresentation(refresh);
    const releaseVisibility = plugin.subscribeKplexVisibility(refresh);
    return () => {
      releaseCoordinator();
      releaseIndex();
      releasePresentation();
      releaseVisibility();
    };
  }, [plugin, hostLeaf]);
  return status;
}

/** Show status on hover and open the vault summary by double-click, stationary double-tap or keyboard. */
function IndexStatusIndicator({
  status,
  indicatorRef,
  open,
  onHoverStart,
  onHoverEnd,
  onToggle,
}: {
  status: IndexStatus;
  indicatorRef?: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onToggle: () => void;
}) {
  const taps = useRef(new DoubleTapGesture());
  const press = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastTouch = useRef(-1000);
  return <button
    ref={indicatorRef}
    type="button"
    className={`kplex-index-status${status.upToDate ? " is-ready" : status.phase === "incomplete" ? " is-incomplete" : " is-updating"}`}
    aria-label={status.label}
    aria-expanded={open}
    aria-haspopup="dialog"
    onMouseEnter={onHoverStart}
    onMouseLeave={onHoverEnd}
    onFocus={onHoverStart}
    onBlur={onHoverEnd}
    onDoubleClick={/** Ignore the mouse double-click synthesized after a handled touch pair. */ (event) => {
      if (event.timeStamp - lastTouch.current > 800) onToggle();
    }}
    onPointerDown={/** Record short stationary touch presses; long-press tooltips retain their own guard. */ (event) => {
      if (event.pointerType === "touch") press.current = { time: event.timeStamp, x: event.clientX, y: event.clientY };
    }}
    onPointerCancel={() => { press.current = null; taps.current.reset(); }}
    onPointerUp={/** Use completed tap pairs because mobile WebViews need not synthesize double-click. */ (event) => {
      if (event.pointerType !== "touch") return;
      lastTouch.current = event.timeStamp;
      const start = press.current;
      press.current = null;
      if (!start || event.timeStamp - start.time > 400 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
        taps.current.reset(); return;
      }
      if (taps.current.complete("index-status", event.timeStamp, event.clientX, event.clientY)) onToggle();
    }}
    onKeyDown={/** Keep keyboard activation available without opening on a single pointer click. */ (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onToggle();
    }}
  />;
}

/** Render a labeled toolbar action and pass its owning-window click event to native menu callers. */
function ToolButton({ icon, title, on, disabled, onClick }: {
  icon: string;
  title: string;
  on?: boolean;
  disabled?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return <button
    className={`kplex-icon-button${on ? " is-on" : ""}`}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
  ><ObsidianIcon name={icon} size={17} /></button>;
}

/** Compose the native K-Plex toolbar, filters and scene with injected localization and environment facts; host effects remain plugin-owned. */
export function KplexApp({ plugin, surface, hostLeaf, translate, environment }: {
  plugin: KplexPlugin;
  surface: KplexViewSurface;
  hostLeaf: WorkspaceLeaf;
  translate: Translator;
  environment: PresentationEnvironment;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const indexStatusRef = useRef<HTMLButtonElement>(null);
  const indexStatus = useIndexStatus(plugin, hostLeaf);
  const [showStartupIndexBubble, setShowStartupIndexBubble] = useState(false);
  const [indexStatusInfoMode, setIndexStatusInfoMode] = useState<"closed" | "hover">("closed");
  const suppressRestoredIndexStatusFocusRef = useRef(false);
  const [renderRevision, forceRender] = useState(0);
  const [plexFilter, setPlexFilter] = useState<PlexFilterState>(EMPTY_PLEX_FILTER);
  const [filterLayoutMode, setFilterLayoutMode] = useState<GraphFilterLayoutMode>("keep");
  const [findFilterOwner, setFindFilterOwner] = useState<{
    query: string; previousFilter: PlexFilterState; previousLayout: GraphFilterLayoutMode;
  } | null>(null);
  /** Apply a temporary Find filter while retaining the prior quick filter and layout exactly once. */
  const applyFindFilter = (query: string): void => {
    setFindFilterOwner((owner) => owner ? { ...owner, query } : {
      query, previousFilter: plexFilter, previousLayout: filterLayoutMode,
    });
    setPlexFilter((current) => ({ ...current, field: "node.label", operator: "contains", value: query }));
    setFilterLayoutMode("reflow");
  };
  /** Restore the Find-owned filter without overwriting a later manual edit in Filters and lenses. */
  const clearFindFilter = (): void => {
    if (!findFilterOwner) return;
    if (plexFilter.field === "node.label" && plexFilter.operator === "contains"
      && plexFilter.value === findFilterOwner.query && filterLayoutMode === "reflow") {
      setPlexFilter(findFilterOwner.previousFilter);
      setFilterLayoutMode(findFilterOwner.previousLayout);
    }
    setFindFilterOwner(null);
  };
  const plexFilterPredicate = useMemo(() => compilePlexFilter(plexFilter), [plexFilter]);
  const [graphLenses, setGraphLensesState] = useState<GraphLensDefinition[]>(() => plugin.settings.graphLenses);
  const compiledGraphLenses = useMemo(() => compileGraphLensDefinitions(graphLenses), [graphLenses]);
  const [predicateRevision, refreshPredicates] = useState(0);
  const [hostWidth, setHostWidth] = useState(0);
  const [sidecarRevision, setSidecarRevision] = useState(0);
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const [findFocusRequest, setFindFocusRequest] = useState(0);
  const [areaSettingsMode, setAreaSettingsMode] = useState(false);
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
  // Presentation publication is render-only; it must not trigger semantic subscriptions or reads.
  useEffect(() => plugin.index.subscribePresentation(() => {
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
  useEffect(/** Route the active native view's Find shortcut before Obsidian's document-level handler. */ () => {
    const scope = hostLeaf.view.scope;
    if (!scope) return;
    const handler = scope.register(["Mod"], "f", /** Leave native editor Find intact; otherwise disclose this Plex's field. */ (event) => {
      const target = event.target as Element | null;
      if (target?.closest(".kplex-central-editor-content")) return;
      event.stopPropagation();
      setFindFocusRequest((value) => value + 1);
      return false;
    });
    return /** Unmount/window migration releases only this surface's hotkey registration. */ () => scope.unregister(handler);
  }, [hostLeaf]);

  useEffect(() => {
    const followFile = (file: TFile | null) => {
      if (!plugin.isKplexLeafVisible(hostLeaf)) return;
      const activeView = plugin.app.workspace.getActiveViewOfType(FileView);
      // Embedded navigation has its own callback. Re-activating/detaching that leaf must not
      // follow Obsidian's previous document back into the Plex's navigation history.
      if (!activeView || activeView.leaf === hostLeaf || isEmbeddedMarkdownLeaf(activeView.leaf)) return;
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
  const graphSearchRead = useMemo(() => createLegacyGraphSearchRead({
    /** Preserve Vault files and URL aliases independently of the current Plex and graph filters. */
    search: (query, limit) => plugin.index.search(query, limit, "vault-files"),
    titleFor: (target) => plugin.index.titleFor(target),
  }), [plugin.index]);

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

  /** Detailed index status replaces startup guidance once the user explicitly inspects the marker. */
  const acknowledgeIndexStatusInspection = useCallback((): void => {
    if (!indexStatus.upToDate) plugin.claimStartupIndexInfoBubble();
    setShowStartupIndexBubble(false);
  }, [plugin, indexStatus.upToDate]);

  /** Open transient index details for pointer hover or keyboard focus. */
  const showIndexStatusOnHover = useCallback((): void => {
    if (suppressRestoredIndexStatusFocusRef.current) {
      suppressRestoredIndexStatusFocusRef.current = false;
      return;
    }
    acknowledgeIndexStatusInspection();
    setIndexStatusInfoMode("hover");
  }, [acknowledgeIndexStatusInspection]);

  /** Close the transient hover/focus detail. */
  const hideIndexStatusAfterHover = useCallback((): void => {
    setIndexStatusInfoMode("closed");
  }, []);

  /** Open the persistent About vault dialog from double-click/double-tap or keyboard input. */
  const openVaultStats = useCallback((): void => {
    acknowledgeIndexStatusInspection();
    setIndexStatusInfoMode("closed");
    new VaultStatsModal(plugin).open();
  }, [acknowledgeIndexStatusInspection, plugin]);

  /** Dismiss index details while preventing Escape focus restoration from reopening them. */
  const dismissIndexStatusInfo = useCallback((reason?: FloatingLayerDismissReason): void => {
    if (reason === "escape") {
      suppressRestoredIndexStatusFocusRef.current = true;
      const view = indexStatusRef.current?.ownerDocument.defaultView;
      if (view) {
        view.queueMicrotask(
          /** Limit suppression to the synchronous focus restoration performed for this Escape. */
          () => { suppressRestoredIndexStatusFocusRef.current = false; },
        );
      } else {
        suppressRestoredIndexStatusFocusRef.current = false;
      }
    }
    setIndexStatusInfoMode("closed");
  }, []);

  const indexStatusInfoOpen = indexStatusInfoMode !== "closed";
  const indexStatusMessage = <div className="kplex-index-status-details">
    {["indexing", "saving-cache", "updating"].includes(indexStatus.phase) &&
      <div>{translate("index.filesIndexed", { indexed: indexStatus.indexedFiles, total: indexStatus.totalFiles })}</div>
    }
    <div>{indexStatus.label}</div>
  </div>;

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

  /** Open the target through the host while preserving this surface's document for external-link routing. */
  const open = useCallback((target: GraphPage) => {
    void plugin.openPage(target, hostLeaf.view.containerEl.ownerDocument);
  }, [plugin, hostLeaf]);

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
    plugin.showKplexMenuAtMouseEvent(menu, event.nativeEvent, hostLeaf);
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

  /** Open the owning-window native settings menu; area editing remains transient to this surface. */
  const showSettingsMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const menu = new Menu();
    menu.addItem((item) => item
      .setTitle(translate("app.pluginSettings"))
      .setIcon("settings")
      .onClick(() => plugin.openSettings()));
    menu.addItem((item) => item
      .setTitle(translate("app.areaSettings"))
      .setIcon("move-vertical")
      .setChecked(areaSettingsMode)
      .onClick(() => setAreaSettingsMode((enabled) => !enabled)));
    plugin.showKplexMenuAtMouseEvent(menu, event.nativeEvent, hostLeaf);
  };

  const activateSearch = () => setSearchFocusRequest((value) => value + 1);
  const searchCopy = searchFieldCopy(translate, environment);

  const handlePlexKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const find = isPlexFindShortcut(event);
    if (!find && !isSearchFocusShortcut(event)) return;
    const target = event.target as Element | null;
    // The central editor is a native Obsidian Markdown surface. Do not steal editor shortcuts
    // such as Ctrl/Cmd+F while focus is inside it; the graph search remains available from the
    // toolbar after the editor has been enabled.
    if (find && target?.closest(".kplex-central-editor-content")) return;
    event.preventDefault();
    event.stopPropagation();
    if (find) setFindFocusRequest((value) => value + 1);
    else activateSearch();
  };

  /** Focus bare Plex space while preserving controls and portaled filter-header drag focus. */
  const handlePlexPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    plugin.dismissKplexMenu();
    const target = event.target as Element | null;
    // React portal capture still reaches this shell before the header's native drag listener.
    if (target?.closest(".kplex-central-editor-content, .kplex-filter-panel, input, textarea, select, button, a, [contenteditable='true'], [role='button']")) return;
    rootRef.current?.focus({ preventScroll: true });
  };

  /** Accept a single current Vault file from Obsidian File Explorer, including images and Canvas. */
  const handlePlexDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!getDraggedFile(plugin.app)) return;
    event.preventDefault();
  };

  /** Re-center on the dropped file, queuing it while partial indexing catches up. */
  const handlePlexDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const file = getDraggedFile(plugin.app);
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
    className="kplex-app kplex-empty"
    onDragOver={handlePlexDragOver}
    onDrop={handlePlexDrop}
  >
    <div className="kplex-index-status-empty">
      <IndexStatusIndicator
        status={indexStatus}
        indicatorRef={indexStatusRef}
        open={indexStatusInfoOpen}
        onHoverStart={showIndexStatusOnHover}
        onHoverEnd={hideIndexStatusAfterHover}
        onToggle={openVaultStats}
      />
      <InfoBubble
        open={indexStatusInfoOpen}
        targetRef={indexStatusRef}
        message={indexStatusMessage}
        onDismiss={dismissIndexStatusInfo}
      />
    </div>
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
    plugin.showKplexMenuAtMouseEvent(menu, event.nativeEvent, hostLeaf);
  };

  void sidecarRevision; // subscription is a render trigger; all state is owned by the plugin.

  return <div
    ref={rootRef}
    className={`kplex-app kplex-surface-${surface}${condensedBySidecar ? " is-sidecar-condensed" : ""}`}
    data-kplex-tooltip-scope
    tabIndex={-1}
    onKeyDownCapture={handlePlexKeyDown}
    onPointerDownCapture={handlePlexPointerDown}
    onDragOver={handlePlexDragOver}
    onDrop={handlePlexDrop}
  >
    <div className={`kplex-main-column${plugin.settings.wrapNodeLabels ? " is-two-line-history" : ""}`}>
      <div className="kplex-top-stack">
        <header className="kplex-topbar">
          <IndexStatusIndicator
            status={indexStatus}
            indicatorRef={indexStatusRef}
            open={indexStatusInfoOpen}
            onHoverStart={showIndexStatusOnHover}
            onHoverEnd={hideIndexStatusAfterHover}
            onToggle={openVaultStats}
          />
          <InfoBubble
            open={showStartupIndexBubble && !indexStatus.upToDate && !indexStatusInfoOpen}
            targetRef={indexStatusRef}
            message={translate("index.incompleteBubble")}
            dismissLabel={translate("infoBubble.dismiss")}
            onDismiss={dismissStartupIndexBubble}
          />
          <InfoBubble
            open={indexStatusInfoOpen}
            targetRef={indexStatusRef}
            message={indexStatusMessage}
            onDismiss={dismissIndexStatusInfo}
          />
          <div className="kplex-brand"><ObsidianIcon name="brain-circuit" size={20} className="kplex-brand-mark" /><strong>{translate("view.displayName")}</strong></div>
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
            portalSelector=".kplex-app"
            appTopbarSelector=".kplex-topbar"
            revision={renderRevision}
            onActivate={/** Physical search remains usable during partial hydration; materialize only the selected current file. */ (id) => {
              let target = plugin.index.getVaultSearchPage(id);
              if (target?.file && !plugin.index.get(id)) target = plugin.index.insertCreatedFile(target.file);
              if (target) activate(target, true);
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
            onChange={/** Manual quick-filter edits retire Find ownership rather than being undone by its button. */ (next) => {
              setFindFilterOwner(null); setPlexFilter(next);
            }}
            lenses={graphLenses}
            onLensesChange={updateGraphLenses}
            layoutMode={filterLayoutMode}
            onLayoutModeChange={/** An explicit layout choice belongs to the filter panel. */ (mode) => {
              setFindFilterOwner(null); setFilterLayoutMode(mode);
            }}
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
          <div className="kplex-top-actions is-compact">
            <button
              className={`kplex-icon-button${syncMode !== "off" && syncTargetAvailable ? " is-on" : ""}`}
              aria-label={translate("app.syncActions", { status: syncTitle })}
              onClick={showDocumentSyncMenu}
            ><ObsidianIcon name={syncIcon} size={17} /></button>
            <ToolButton
              icon="type"
              title={translate(plugin.settings.renderAlias ? "app.displayAliasesOn" : "app.displayAliasesOff")}
              on={plugin.settings.renderAlias}
              onClick={() => void toggleToolbarSetting("renderAlias")}
            />
            <span className="kplex-toolbar-divider" />
            <ToolButton icon={plugin.settings.graphDepth === 2 ? "list-chevrons-down-up" : "list-chevrons-up-down"} title={translate(plugin.settings.graphDepth === 2 ? "app.singleLevelView" : "app.expandedView")} on={plugin.settings.graphDepth === 2} onClick={() => void toggleExpandedView()} />
            <ToolButton icon="spline" title={translate(plugin.settings.connectorStyle === "bezier" ? "app.useStraightConnectors" : "app.useCurvedConnectors")} on={plugin.settings.connectorStyle === "bezier"} onClick={() => void toggleConnectorStyle()} />
            <ToolButton icon="settings" title={translate("app.settingsMenu")} on={areaSettingsMode} onClick={showSettingsMenu} />
          </div>
        </header>

        {pinnedPages.length > 0 && <div className="kplex-pinned-bar" aria-label={translate("app.pinnedNodes")}>
          {pinnedPages.map((pinned) => {
            const title = plugin.index.titleFor(pinned);
            return <div key={pinned.path} className={`kplex-pinned-chip${pinned.path === page.path ? " is-active" : ""}`}>
              <button className="kplex-pinned-open" data-kplex-pinned-path={pinned.path} title={`${title}\n${pinned.path}`} onClick={() => activate(pinned)}><ObsidianIcon name="pin" size={12} /><span>{title}</span></button>
              <button className="kplex-pinned-remove" aria-label={translate("app.unpinNode", { title })} onClick={() => void unpin(pinned.path)}><ObsidianIcon name="x" size={11} /></button>
            </div>;
          })}
        </div>}
      </div>

      <main className="kplex-workspace">
        <section className="kplex-graph-area">
          <div className="kplex-zone-label zone-parent">{translate("app.zoneParents")}</div>
          <div className="kplex-zone-label zone-left">{translate("app.zoneFriendsPrevious")}</div>
          <div className="kplex-zone-label zone-right">{translate("app.zoneChallengersNext")}</div>
          <div className="kplex-zone-label zone-child">{translate("app.zoneChildren")}</div>
          <PlexGraph plugin={plugin} index={plugin.index} settings={viewSettings} surface={profileSurface} hostLeaf={hostLeaf} predicate={plexFilterPredicate} lenses={compiledGraphLenses} filterLayoutMode={filterLayoutMode} predicateRevision={predicateRevision} showCrossLinks={plexFilter.showCrossLinks} activePath={page.path} renderRevision={renderRevision} findFocusRequest={findFocusRequest}
          semanticRevision={plugin.index.getSemanticRevision()} onActivate={activate} onOpen={open} onCentralNodeEditorChange={setCentralNodeEditorEnabled} onCentralNodeModeChange={rememberCentralNodeMarkdownMode} areaSettingsMode={areaSettingsMode} onAreaSettingsModeChange={setAreaSettingsMode}
          onApplyFindFilter={applyFindFilter} appliedFindFilterQuery={findFilterOwner?.query ?? null} onClearFindFilter={clearFindFilter} />
        </section>
      </main>

      {sidecarAvailable && <div className={`kplex-sidecar-controls is-${sidecarEdgePosition}${sidecarOpen ? " is-open" : " is-closed"}`} aria-label={translate("app.sidecarControls")}>
        <button type="button" className="kplex-sidecar-primary" aria-pressed={sidecarOpen} aria-label={sidecarOpen ? translate("app.closeSidecar") : translate("app.openSidecarAt", { position: physicalPositionLabel(sidecarEdgePosition, translate) })} onClick={() => void plugin.toggleSidecar(hostLeaf, page)}><ObsidianIcon name={sidecarOpen ? closeSidecarIcon : openSidecarIcon} size={16} /></button>
        {sidecarOpen && <>
          <button aria-label={translate("app.foldForSidecar")} onClick={() => void plugin.collapsePlexForSidecar(hostLeaf)}><ObsidianIcon name={foldPlexIcon} size={15} /></button>
          <button aria-label={translate("app.moveSidecar")} onClick={showSidecarMoveMenu}><ObsidianIcon name="move" size={15} /></button>
          <button aria-label={translate("app.detachSidecar")} onClick={() => void plugin.detachSidecar(hostLeaf)}><ObsidianIcon name="unlink" size={15} /></button>
        </>}
      </div>}

      <footer className="kplex-history-bar">
        <span className="kplex-history-label">{translate("app.pastNodes")}</span>
        <div className="kplex-history-list">
          {plugin.settings.navigationHistory.slice(-14).reverse().map((path, indexValue) => {
            const item = plugin.index.get(path);
            if (!item) return null;
            const title = plugin.index.titleFor(item);
            return <button key={`${path}:${indexValue}`} data-kplex-history-path={path} title={`${title}\n${path}`} className={path === page.path ? "is-active" : ""} onClick={() => activate(item)}><span className="kplex-history-text">{title}</span></button>;
          })}
        </div>
      </footer>
    </div>
  </div>;
}
