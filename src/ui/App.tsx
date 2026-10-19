/**
 * Saved navigation remains visible before native tree/cache readiness. Provisional absence never
 * authorizes replacing the requested center with a different history entry or the vault root.
 * Host-bound React shell for K-Plex navigation, startup guidance, File Explorer note drops, toolbar and Sidecar controls. It composes shared components and injected environment/localization capabilities; plugin methods own host effects. The native view owns session display modes; React projects Zen chrome and supplies exact camera-resize preparation without replacing its root. Search/Find scopes and hints use effective action bindings; each surface releases its own registrations on teardown.
 * Wander owns one cancellable per-view session over graph projection ports and the shared activation path;
 * explicit navigation origins and native input pause it without replacing history, editor or Zen owners.
 * The root leases one shared delayed-hover/long-press tooltip owner for its rendering document.
 * Cross-link visibility reads shared persisted settings rather than temporary quick-filter or Find snapshots.
 * Action-dispatched sync/Sidecar menus resolve fresh surface-local control anchors without routing DOM events through the action manager.
 * Native follow retains the latest canonical file while hidden and suppresses fallback scenes/motion during partial hydration.
 * Directional Sidecar attachment controls project host eligibility and use the same native follow owner for inward synchronization.
 * Existing native File properties panes follow the active surface's central file through a leased host adapter.
 * Global Find consumes existing tag/folder/file/URL vocabulary with caller-owned native type icons;
 * current native files and captured Plex links share drop navigation without source acquisition.
 * Native-view sessions retain independent centers/pending native follow and memory-only Footprints
 * across React/window remounts. Saved history and pins continue through the shared settings writer.
 */
import { subscribeAppearanceSources } from "../adapters/obsidian/colorChanges";
import type {AppearanceOwner} from "../core/plex/appearanceThemes";
import { ColorSourceModal } from "./ColorSourceModal";
import type { LensColorRequest, LensColorDialog } from "./PlexFilter";
import { appearanceWithoutColors } from "../core/contracts/appearance";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent as ReactDragEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { FileView, View, Menu, type TFile, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../main";
import type { GraphPage } from "../types";
import type { PresentationEnvironment } from "../core/contracts/presentationEnvironment";
import { isGraphTabCommandAvailable } from "../core/plex/viewPresentation";
import { type ActionContext } from "../application/ActionManager";
import { type ActionId, type ActionOutcome, type NodeRef } from "../core/plex/actions";
import { actionNodeRef, resolveActionPage } from "../adapters/obsidian/actionNode";
import { ActionMenuModal } from "./ActionMenuModal";
import { KeyboardHelpModal } from "./KeyboardHelpModal";
import { ActionTargetPicker, type ActionPickerItem } from "./ActionTargetPicker";
import { usePlexActions, type GraphActionPorts, type SurfaceActionImplementations } from "./usePlexActions";
import { centerViewSettings } from "./KplexCenterPresentation";
import type { Translator } from "../lang";
import { WanderController } from "../application/WanderController";
import { WanderControls } from "./features/WanderControls";
import type { KplexDisplayModes } from "./KplexDisplayModes";
import { physicalPositionLabel } from "./features/positionPresentation";
import { SidecarAttachControls } from "./features/SidecarAttachControls";
import { effectiveActionBindings } from "../core/plex/actionPreferences";
import { formatActionBinding } from "./actionPresentation";
import { surfaceAction } from "./surfaceActionImplementation";
import { toolbarMenuAnchor } from "./menuAnchor";
import type { DocumentSyncMode, KplexViewSurface, NodeSortOrder, SidecarMarkdownMode, SidecarPosition } from "../settings";
import { SearchBox } from "./features/SearchBox";
import { searchResultIconName } from "./features/searchResultPresentation";
import { nodeListPresentation } from "./nodeListPresentation";
import {nodeMarkdownLink} from "./nodeMarkdownLink";
import { createLegacyGraphSearchRead } from "../adapters/obsidian/graphContracts";
import { isEmbeddedMarkdownLeaf } from "../adapters/obsidian/embeddedMarkdownLeaf";
import { focusEmbeddedMarkdown } from "../adapters/obsidian/embeddedMarkdownFocus";
import { getDraggedFile } from "../adapters/obsidian/fileExplorerDrag";
import { draggedGraphPage, nodeLinkDragSource } from "../adapters/obsidian/nodeLinkDrag";
import { registerFilePropertiesCenter, type FilePropertiesCenterLease } from "../adapters/obsidian/filePropertiesCenter";
import { ActionButton } from "./components/ActionButton";
import { DoubleTapGesture } from "./components/DoubleTapGesture";
import { InfoBubble } from "./components/InfoBubble";
import type { FloatingLayerDismissReason } from "./components/FloatingLayer";
import { PlexGraph } from "./PlexGraph";
import { PlexFootprintsPanel } from "./PlexFootprintsPanel";
import { ObsidianIcon } from "./ObsidianIcon";
import { VaultStatsModal } from "./VaultStatsModal";
import { EMPTY_PLEX_FILTER, PlexFilter, type GraphFilterLayoutMode, type PlexFilterState, type PlexVisibilitySetting } from "./PlexFilter";
import { compilePlexFilter } from "../lens/SimplePlexFilter";
import { compileGraphLensDefinitions, type GraphLensDefinition } from "../lens/GraphLens";
import { installKplexLongPressTooltips, KPLEX_CONTROL_LONG_PRESS_EVENT } from "./LongPressTooltip";

type BooleanToolbarSetting = PlexVisibilitySetting | "renderAlias" | "showCrossLinks";
type IndexStatus = ReturnType<KplexPlugin["getIndexStatus"]>;

/**
 * Subscribe to host-owned index status, catching changes between render and subscription and on
 * reveal. Hidden surfaces skip intermediate progress but accept terminal readiness so a transient
 * native geometry change cannot leave a stale preparation indicator. Release all channels on teardown.
 */
function useIndexStatus(plugin: KplexPlugin, hostLeaf: WorkspaceLeaf): IndexStatus {
  const [status, setStatus] = useState(() => plugin.getIndexStatus());
  const lastStatusRef = useRef(status);
  useEffect(() => {
    /** Publish changed visible status facts or hidden terminal readiness; repeated graph events are no-ops. */
    const refresh = (): void => {
      const next = plugin.getIndexStatus();
      // Terminal readiness must clear a stale indicator even if native leaf geometry has not
      // settled yet. Skip intermediate hidden-view progress to avoid background render churn.
      const visible = plugin.isKplexLeafVisible(hostLeaf);
      if (!visible && (!next.upToDate || lastStatusRef.current.upToDate)) return;
      const previous = lastStatusRef.current;
      if (previous.upToDate === next.upToDate
        && previous.phase === next.phase
        && previous.label === next.label
        && previous.indexedFiles === next.indexedFiles
        && previous.totalFiles === next.totalFiles) return;
      lastStatusRef.current = next;
      setStatus(next);
    };
    const releaseCoordinator = plugin.subscribeIndexStatus(refresh);
    const releaseIndex = plugin.index.subscribe(refresh);
    const releasePresentation = plugin.index.subscribePresentation(refresh);
    const releaseVisibility = plugin.subscribeKplexVisibility(refresh);
    // Close the render-to-effect race: the index may finish before these listeners attach.
    refresh();
    return () => {
      releaseCoordinator();
      releaseIndex();
      releasePresentation();
      releaseVisibility();
    };
  }, [plugin, hostLeaf]);
  return status;
}

/** Show one status callout on hover/long press; double-tap and keyboard open the vault summary. */
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
  const localRef = useRef<HTMLButtonElement>(null);
  const controlRef = indicatorRef ?? localRef;
  const nameId = useId();
  useEffect(/** The shared stationary-touch owner opens this control's dedicated callout. */ () => {
    const control = controlRef.current;
    if (!control) return;
    control.addEventListener(KPLEX_CONTROL_LONG_PRESS_EVENT, onHoverStart);
    return () => control.removeEventListener(KPLEX_CONTROL_LONG_PRESS_EVENT, onHoverStart);
  }, [controlRef, onHoverStart]);
  return <>
    <span id={nameId} className="kplex-accessible-name">{status.label}</span>
    <button
      ref={controlRef}
      type="button"
      className={`kplex-index-status${status.upToDate ? " is-ready" : status.phase === "incomplete" ? " is-incomplete" : " is-updating"}`}
      aria-labelledby={nameId}
      data-kplex-tooltip="callout"
      aria-expanded={open}
      aria-haspopup="dialog"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      onDoubleClick={/** Ignore the mouse double-click synthesized after a handled touch pair. */ (event) => {
        if (event.timeStamp - lastTouch.current > 800) onToggle();
      }}
      onPointerDown={/** Record short stationary taps; the shared guard owns completed long presses. */ (event) => {
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
    />
  </>;
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

/** Compose the native toolbar, filters and scene; shared visibility preferences persist through plugin-owned host effects. */
export function KplexApp({ plugin, surface, hostLeaf, translate, environment, onReady, displayModes, centerPresentation, documentSession }: {
  plugin: KplexPlugin;
  surface: KplexViewSurface;
  hostLeaf: WorkspaceLeaf;
  translate: Translator;
  environment: PresentationEnvironment;
  onReady?: () => void;
  displayModes: KplexDisplayModes;
  centerPresentation: import("./KplexCenterPresentation").KplexCenterPresentation;
  documentSession: import("./KplexDocumentSession").KplexDocumentSession;
}) {
  const canvasNameId = useId();
  const displayState = useSyncExternalStore(displayModes.subscribe, displayModes.getSnapshot);
  const centerMode = useSyncExternalStore(centerPresentation.subscribe, centerPresentation.getSnapshot);
  const rootRef = useRef<HTMLDivElement>(null);
  const syncMenuButtonRef = useRef<HTMLButtonElement>(null);
  const sidecarMoveButtonRef = useRef<HTMLButtonElement>(null);
  const graphActionPorts = useRef<GraphActionPorts | null>(null);
  useEffect(/** Camera preparation must precede native overlay movement and React toolbar visibility changes. */ () => displayModes.onBeforeResize(/** Prepare only the currently mounted graph generation. */ () => graphActionPorts.current?.prepareDisplayResize?.()), [displayModes]);
  const [wander] = useState(/** One controller owns this view generation; all graph capabilities are read live. */ () => new WanderController({
    readScene: /** A detached graph cannot claim readiness or navigation eligibility. */ () => graphActionPorts.current?.readWanderScene?.() ?? { center: null, ready: false, candidates: [] },
    highlight: /** Selection/reveal remain owned by the graph's existing controller. */ destination => graphActionPorts.current?.highlightWander?.(destination) ?? false,
    clear: /** Retire only this session's highlight and arrival motion. */ () => graphActionPorts.current?.clearWander?.(),
    navigate: /** Graph preflight revalidates before the shared App activation. */ destination => graphActionPorts.current?.navigateWander?.(destination) ?? false,
    readZen: /** Snapshot the per-view session mode, independently of fullscreen. */ () => displayModes.getSnapshot().zen,
    setZen: /** Restore exact entry state through the existing resize owner. */ enabled => displayModes.setZen(enabled),
    now: /** Use monotonic time in the actual owning window. */ () => (rootRef.current?.ownerDocument.defaultView ?? window).performance.now(),
    schedule: /** Retain the scheduling window so migration cancels the exact timer. */ (callback, delay) => {
      const owner = rootRef.current?.ownerDocument.defaultView ?? window;
      const id = owner.setTimeout(callback, delay);
      return /** Clear this timer even after the native content moves documents. */ () => owner.clearTimeout(id);
    },
    random: /** Route tests inject seeded randomness; production uses ordinary local randomness. */ () => Math.random(),
  }));
  const wanderState = useSyncExternalStore(wander.subscribe, wander.getSnapshot);
  useEffect(/** Native unload and source-window retirement stop Wander even before React closes. */ () => {
    const release = displayModes.ownCleanup(/** Native view teardown cancels every pending cycle. */ () => wander.dispose());
    const owner = rootRef.current?.ownerDocument.defaultView;
    const retire = /** Window destruction cannot leave a live session retaining the old realm. */ (): void => wander.dispose();
    owner?.addEventListener("pagehide", retire);
    return /** Migration/unmount restores entry Zen and removes the exact lifetime lease. */ () => {
      owner?.removeEventListener("pagehide", retire); release(); wander.dispose();
    };
  }, [wander, displayModes]);
  const actionDialogs = useRef(new Set<{ close(): void }>());
  const dialogSerial = useRef(0);
  useEffect(/** Retire captured modal actions before a migrated/unmounted surface can receive work. */ () => () => {
    for (const dialog of actionDialogs.current) dialog.close();
    actionDialogs.current.clear();
  }, []);
  const indexStatusRef = useRef<HTMLButtonElement>(null);
  const indexStatus = useIndexStatus(plugin, hostLeaf);
  const [showStartupIndexBubble, setShowStartupIndexBubble] = useState(false);
  const [indexStatusInfoMode, setIndexStatusInfoMode] = useState<"closed" | "hover">("closed");
  const suppressRestoredIndexStatusFocusRef = useRef(false);
  const [renderRevision, forceRender] = useState(0);
  const [paintRevision, forcePaint] = useState(0);
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
    if (documentSession.pendingFollow) return documentSession.pendingFollow.file.path;
    if (documentSession.centerPath) return documentSession.centerPath;
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
  const activePageRef = useRef<GraphPage | null>(plugin.index.get(activePath) ?? null);
  const [navigationOrigin, setNavigationOrigin] = useState<"user" | "wander" | "follow">("user");
  const pendingDocumentFollowRef = useRef<TFile | null>(documentSession.pendingFollow?.file ?? null);
  const pendingDocumentDemandRef = useRef<{ file: TFile; path: string; release: () => void } | null>(null);
  const wasLeafVisibleRef = useRef(plugin.isKplexLeafVisible(hostLeaf));
  const pendingFileExplorerDropRef = useRef<TFile | null>(null);
  const activeFileRef = useRef<TFile | null>(
    documentSession.pendingFollow?.file ?? plugin.index.get(activePath)?.file ?? (initialWorkspaceFile?.path === activePath ? initialWorkspaceFile : null),
  );
  const [historyCursor, setHistoryCursor] = useState(() => Math.max(0, plugin.settings.navigationHistory.length - 1));
  useEffect(/** Catch native setState both before and after mounting without recording a provisional startup center. */ () => {
    const restore = (): void => {
      const path = documentSession.pendingFollow?.file.path ?? documentSession.centerPath;
      if (!documentSession.initialized) return;
      if (!path || path === activePathRef.current) {forceRender(value => value + 1);return;}
      activePathRef.current = path;activePageRef.current = plugin.index.get(path) ?? null;
      activeFileRef.current = activePageRef.current?.file ?? null;setActivePath(path);
    };
    const release = documentSession.subscribeRestoration(restore);restore();return release;
  }, [documentSession, plugin]);

  /** Retire only this surface's native-center demand after graph handover, supersession, hiding or unmount. */
  const releasePendingDocumentDemand = useCallback((): void => {
    const demand = pendingDocumentDemandRef.current;
    pendingDocumentDemandRef.current = null;
    demand?.release();
  }, []);
  useEffect(/** The App retains exact-center acquisition while PlexGraph is absent or changing centers. */ () => releasePendingDocumentDemand, [releasePendingDocumentDemand]);

  /**
   * Center an exact page; sidecar-open commands defer document synchronization to their owned open.
   * Passive follow keeps companion propagation: each host destination independently skips an
   * exact same-file observation, while other linked destinations still receive genuine navigation.
   */
  const activate = useCallback((target: GraphPage, record = true, syncDocuments = true, origin: "user" | "wander" | "follow" = "user") => {
    if (target.path !== activePathRef.current || origin === "follow") {
      if (origin !== "wander") wander.pause();
      graphActionPorts.current?.prepareNavigation?.(target.path, origin);
    }
    // Any newer explicit navigation supersedes a note waiting for partial indexing.
    pendingFileExplorerDropRef.current = null;
    activePathRef.current = target.path;
    activePageRef.current = target;
    activeFileRef.current = target.file;
    pendingDocumentFollowRef.current = null;
    documentSession.pendingFollow = null;
    documentSession.pendingUrl = null;
    // A just-published preview can depend on this lease. Keep it until the child graph acquires its own.
    const demand = pendingDocumentDemandRef.current;
    if (demand && (demand.file !== target.file || demand.path !== target.path)) releasePendingDocumentDemand();
    setNavigationOrigin(origin);
    setActivePath(target.path);
    documentSession.footprints.accept(actionNodeRef(target));
    documentSession.centerPath = target.path;
    documentSession.persist();
    plugin.settings.lastActivePath = target.path;
    if (record) {
      const next = [...plugin.settings.navigationHistory.filter((path) => path !== target.path), target.path].slice(-40);
      plugin.settings.navigationHistory = next;
      setHistoryCursor(next.length - 1);
    }
    void plugin.saveSettings(false, false);
    if (syncDocuments) {
      void plugin.syncPageToDocumentLeaf(target, hostLeaf);
      void plugin.syncSidecarToPage(hostLeaf, target);
    }
  }, [plugin, hostLeaf, wander, releasePendingDocumentDemand]);

  /** Transfer a settled preview lease only after this exact graph center has acquired its own semantic demand. */
  const acknowledgeDocumentDemandHandover = useCallback((path: string): void => {
    const demand = pendingDocumentDemandRef.current;
    if (!pendingDocumentFollowRef.current && demand?.path === path
      && plugin.index.get(path)?.file === demand.file) releasePendingDocumentDemand();
  }, [plugin, releasePendingDocumentDemand]);

  /** Rejecting an unaccepted native intent returns to this view's last accepted center. */
  const restoreAcceptedDocumentCenter = useCallback((): void => {
    const path = documentSession.centerPath;
    if (!path || path === activePathRef.current) return;
    activePathRef.current = path;
    activePageRef.current = plugin.index.get(path) ?? null;
    activeFileRef.current = activePageRef.current?.file ?? null;
    setActivePath(path);
  }, [documentSession, plugin]);

  /** Settle only the latest eligible native file once its exact index page is available to a visible Plex. */
  const activatePendingDocumentFollow = useCallback((): void => {
    const file = pendingDocumentFollowRef.current;
    if (!plugin.isKplexLeafVisible(hostLeaf)) {
      releasePendingDocumentDemand();
      return;
    }
    // Settled preview ownership survives intervening publications until the graph acknowledges acquisition.
    if (!file) return;
    const intent = documentSession.pendingFollow;
    if (!intent || intent.file !== file || intent.revision !== documentSession.revision
      || plugin.app.vault.getFileByPath(file.path) !== file || !plugin.shouldFollowDocumentFile(file, hostLeaf, intent.leaf)) {
      pendingDocumentFollowRef.current = null;
      documentSession.pendingFollow = null;
      releasePendingDocumentDemand();
      restoreAcceptedDocumentCenter();
      return;
    }
    setNavigationOrigin("follow");
    // Show a loading surface rather than the previous history/folder scene while this file hydrates.
    setActivePath(file.path);
    // Even a readable page can be borrowed from the previous graph's preview scope.
    // Retain this exact center before switching graphs and retiring that previous scope.
    if (pendingDocumentDemandRef.current?.file !== file || pendingDocumentDemandRef.current.path !== file.path) {
      releasePendingDocumentDemand();
      const demand = { file, path: file.path, release: /** A synchronous preview may settle this intent before acquisition returns its release capability. */ (): void => {} };
      pendingDocumentDemandRef.current = demand;
      const release = plugin.index.acquireSemanticDemand(file.path);
      if (pendingDocumentDemandRef.current === demand) demand.release = release;
      else release();
    }
    // Synchronous acquisition/publication may already settle or supersede this observation.
    if (pendingDocumentFollowRef.current !== file) return;
    const target = plugin.index.get(file.path);
    if (target?.file === file) activate(target, true, true, "follow");
  }, [plugin, hostLeaf, activate, releasePendingDocumentDemand, restoreAcceptedDocumentCenter]);

  /** Retain native identity while hidden without rendering the graph or starting relationship acquisition. */
  const observeDocumentFollow = useCallback((file: TFile | null): void => {
    if (!file || !plugin.shouldFollowDocumentFile(file, hostLeaf) || plugin.app.vault.getFileByPath(file.path) !== file) return;
    if (!pendingDocumentFollowRef.current && activeFileRef.current === file && activePathRef.current === file.path) {
      const target = plugin.index.get(file.path);
      // Native same-file echoes preserve explicit motion/representation, but other linked companions may still differ.
      if (target?.file === file && plugin.isKplexLeafVisible(hostLeaf)) {
        void plugin.syncPageToDocumentLeaf(target, hostLeaf);
        void plugin.syncSidecarToPage(hostLeaf, target);
      }
      return;
    }
    const intent = plugin.captureDocumentFollow(file, hostLeaf);if (!intent) return;
    documentSession.pendingUrl = null;
    documentSession.pendingFollow = intent;
    pendingDocumentFollowRef.current = file;
    pendingFileExplorerDropRef.current = null;
    activePathRef.current = file.path;
    activePageRef.current = plugin.index.get(file.path) ?? null;
    activeFileRef.current = file;
    activatePendingDocumentFollow();
  }, [plugin, hostLeaf, activatePendingDocumentFollow]);

  /** Retain unknown/hidden URLs without acquiring sources; publication can complete the same native intent. */
  const activatePendingDocumentUrl = useCallback((): void => {
    const intent = documentSession.pendingUrl;
    if (!intent) return;
    const followed = plugin.getDocumentFollowUrl(hostLeaf, intent.leaf);
    if (intent.revision !== documentSession.revision || !followed || followed.url !== intent.url) {
      documentSession.pendingUrl = null;
      return;
    }
    if (!plugin.isKplexLeafVisible(hostLeaf) || !followed.path) return;
    const target = plugin.index.get(followed.path);
    // The existing host resolver may canonicalize the native URL (for example a root slash).
    if (target?.url && target.path === followed.path) activate(target, true, true, "follow");
  }, [plugin, hostLeaf, activate, documentSession]);

  /** Native Web Viewer observations retain their exact source across hidden React remounts. */
  const observeDocumentUrl = useCallback((sourceLeaf: WorkspaceLeaf | undefined): void => {
    if (!sourceLeaf) return;
    const followed = plugin.getDocumentFollowUrl(hostLeaf, sourceLeaf);if (!followed || followed.path === activePathRef.current) return;
    pendingDocumentFollowRef.current = null;
    documentSession.pendingFollow = null;
    releasePendingDocumentDemand();
    restoreAcceptedDocumentCenter();
    documentSession.pendingUrl = {url: followed.url, leaf: sourceLeaf, revision: documentSession.revision};
    activatePendingDocumentUrl();
  }, [plugin, hostLeaf, activatePendingDocumentUrl, documentSession, releasePendingDocumentDemand, restoreAcceptedDocumentCenter]);

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

  useEffect(/** Publications settle a pending native identity before any visible scene catches up. */ () => {
    /** Keep rename identity and latest native-follow intent coherent with this publication. */
    const refresh = () => {
      activatePendingDocumentFollow();
      activatePendingDocumentUrl();
      // A TFile keeps its object identity while Obsidian renames or moves it. Track the central file
      // by that identity and adopt its new path only after the rebuilt index has published it. This
      // prevents the center from briefly/finally falling back to folder:/ when its filename changes.
      const trackedFile = activeFileRef.current;
      const currentPage = plugin.index.get(activePathRef.current);
      const trackedPage = activePageRef.current;
      // A centered ghost has no native file to track until materialization mutates that exact
      // accepted page. Follow only its identity remap; replacement objects and other Plex centers
      // cannot authorize navigation, history changes or document synchronization on this surface.
      if (!trackedFile && !currentPage && trackedPage?.file && trackedPage.path !== activePathRef.current
        && plugin.index.get(trackedPage.path) === trackedPage
        && plugin.app.vault.getFileByPath(trackedPage.file.path) === trackedPage.file) {
        activePathRef.current = trackedPage.path;
        activeFileRef.current = trackedPage.file;
        setActivePath(trackedPage.path);
      }
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
      activePageRef.current = plugin.index.get(activePathRef.current) ?? activePageRef.current;
      // Hidden tabs/sidebars stay mounted in Obsidian. Do not run the graph React tree for a shared
      // index publication unless this surface is actually visible; it catches up on reveal.
      if (plugin.isKplexLeafVisible(hostLeaf)) forceRender((value) => value + 1);
    };
    const release = plugin.index.subscribe(refresh);
    // A child's demand/layout effect can publish after render but before App's effects attach.
    // Catch that settled snapshot now, without reacquiring sources or waiting for another event.
    refresh();
    return release;
  }, [plugin, hostLeaf, activatePendingDocumentFollow, activatePendingDocumentUrl]);
  useEffect(/** Host previews publish through presentation; settle the owned native intent without refreshing semantics. */ () => plugin.index.subscribePresentation(/** Adopt a newly readable exact center, then repaint only visible surfaces. */ (event) => {
    if (event.kind === "paint") {
      if (plugin.isKplexLeafVisible(hostLeaf)) forcePaint(value => value + 1);
      return;
    }
    activatePendingDocumentFollow();
    activatePendingDocumentUrl();
    if (plugin.isKplexLeafVisible(hostLeaf)) forceRender((value) => value + 1);
  }), [plugin, hostLeaf, activatePendingDocumentFollow, activatePendingDocumentUrl]);
  /** Reconcile native visibility after workspace events or settled drawer geometry, retaining only the newest hidden file. */
  const reconcileDocumentFollowVisibility = useCallback((): void => {
    // A hidden mounted view may have skipped one or more shared index publications while another
    // K-Plex surface was visible. Re-render exactly once when this leaf becomes visible again.
    const visible = plugin.isKplexLeafVisible(hostLeaf);
    const revealed = visible && !wasLeafVisibleRef.current;
    wasLeafVisibleRef.current = visible;
    if (!visible) releasePendingDocumentDemand();
    if (visible) {
      if (revealed) observeDocumentFollow(plugin.getDocumentFollowFile(hostLeaf));
      activatePendingDocumentFollow();
      activatePendingDocumentUrl();
      forceRender(/** Catch up once with skipped shared publications. */ (value) => value + 1);
    }
  }, [plugin, hostLeaf, observeDocumentFollow, activatePendingDocumentFollow, activatePendingDocumentUrl, releasePendingDocumentDemand]);
  useEffect(/** Native workspace notifications share the geometry observer's reveal reconciliation. */ () =>
    plugin.subscribeKplexVisibility(reconcileDocumentFollowVisibility), [plugin, reconcileDocumentFollowVisibility]);
  useEffect(() => {
    if (!plexFilterPredicate?.dependencies.usesFrontmatter && !compiledGraphLenses.usesFrontmatter) return;
    const ref = plugin.app.metadataCache.on("changed", (file) => {
      if (file.extension === "md" && plugin.isKplexLeafVisible(hostLeaf)) {
        refreshPredicates((value) => value + 1);
      }
    });
    return () => plugin.app.metadataCache.offref(ref);
  }, [plugin, hostLeaf, plexFilterPredicate, compiledGraphLenses.usesFrontmatter]);
  useEffect(() => plugin.subscribeGraphLenses((next) => setGraphLensesState(current =>
    JSON.stringify(appearanceWithoutColors("graphLenses", current)) === JSON.stringify(appearanceWithoutColors("graphLenses", next)) ? current : next)), [plugin]);
  useEffect(/** Native ownership changes retire pending follow before an unrelated index event can complete it. */ () => plugin.subscribeSidecar(() => {
    activatePendingDocumentFollow();activatePendingDocumentUrl();setSidecarRevision(value => value + 1);
  }), [plugin, activatePendingDocumentFollow, activatePendingDocumentUrl]);
  useEffect(() => plugin.subscribeNavigation((path, owner) => {
    if (owner && owner !== hostLeaf) return;
    const target = plugin.index.get(path);
    if (target) activate(target, true);
  }), [plugin, activate]);
  useEffect(
    () => plugin.subscribeSearchFocus(hostLeaf, () => setSearchFocusRequest((value) => value + 1)),
    [plugin, hostLeaf],
  );

  useEffect(/** Native file/leaf events retain hidden follow intent without observing the Plex's own embedded view. */ () => {
    /** Observe an eligible external document; native destinations own same-file no-op decisions. */
    const followFile = (file: TFile | null) => {
      const activeView = plugin.app.workspace.getActiveViewOfType(FileView);
      if (!activeView) {observeDocumentUrl(plugin.app.workspace.getActiveViewOfType(View)?.leaf);return;}
      // Embedded navigation has its own callback. Re-activating/detaching that leaf must not
      // follow Obsidian's previous document back into the Plex's navigation history.
      if (!activeView || activeView.leaf === hostLeaf || isEmbeddedMarkdownLeaf(activeView.leaf)) return;
      if (file && !plugin.shouldFollowDocumentFile(file, hostLeaf, activeView.leaf)) return;
      observeDocumentFollow(file);
    };

    const fileRef = plugin.app.workspace.on("file-open", followFile);
    const leafRef = plugin.app.workspace.on("active-leaf-change", /** Hidden native activation still supplies the newest eligible file identity. */ leaf => {
      if (plugin.isKplexLeafVisible(hostLeaf)) forceRender(/** Refresh native action availability only for visible leaves. */ (value) => value + 1);
      followFile(plugin.app.workspace.getActiveFile());
      observeDocumentUrl(leaf ?? undefined);
    });
    return /** Release only this mounted view's workspace observations. */ () => {
      plugin.app.workspace.offref(fileRef);
      plugin.app.workspace.offref(leafRef);
    };
  }, [plugin, hostLeaf, observeDocumentFollow, observeDocumentUrl]);

  const indexedPage = plugin.index.get(activePath);
  const exactPage = !pendingDocumentFollowRef.current || indexedPage?.file === pendingDocumentFollowRef.current
    ? indexedPage : undefined;
  // A borrowed preview can disappear when the old center retires, before the new preview publishes.
  // Keep a followed native center through that gap instead of falling back to unrelated history.
  const waitingForDocument = pendingDocumentFollowRef.current !== null || navigationOrigin === "follow"
    && activeFileRef.current !== null && plugin.app.vault.getFileByPath(activeFileRef.current.path) === activeFileRef.current;
  const fallbackPath = exactPage || waitingForDocument ? null : plugin.resolveNavigationFallbackPath(activePath);
  // Before the native tree/cache is ready, absence is provisional. Keep this surface's saved
  // center and loading state rather than displaying a different node and persisting it.
  const waitingForStartupCenter = !exactPage && !plugin.isNavigationFallbackReady();
  const page = exactPage
    ?? (fallbackPath ? plugin.index.get(fallbackPath) : undefined)
    ?? (waitingForDocument || waitingForStartupCenter ? undefined : plugin.index.get("folder:/"));
  const hasPage = Boolean(page);
  const propertiesCenterFile = useRef<TFile | null>(null);
  const propertiesCenterLease = useRef<FilePropertiesCenterLease | null>(null);
  propertiesCenterFile.current = page?.file ?? null;
  useEffect(/** The native Properties follower owns no graph demand and retires with this exact root/document. */ () => {
    const lease = registerFilePropertiesCenter(plugin.app, hostLeaf,
      /** Read the rendered center's canonical file, including materialization and non-file centers. */ () => propertiesCenterFile.current,
      /** Background Plex roots must not replace the foreground surface's utility-pane identity. */ () => plugin.isKplexLeafVisible(hostLeaf));
    propertiesCenterLease.current = lease;
    return /** Release this root without cancelling a native disk operation already accepted by the host. */ () => {
      if (propertiesCenterLease.current === lease) propertiesCenterLease.current = null;
      lease.dispose();
    };
  }, [plugin, hostLeaf]);
  useEffect(/** Refresh only a changed center identity/path; color and progress renders do not reload Properties. */ () => {
    propertiesCenterLease.current?.refresh();
  }, [page?.file, page?.path]);
  const graphSearchRead = useMemo(() => createLegacyGraphSearchRead({
    /** Search existing notes, folders, tags and URL vocabulary independently of current Plex filters. */
    search: (query, limit) => plugin.index.search(query, limit, "vault"),
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
    {!plugin.index.isOnDemandMode() && ["indexing", "saving-cache", "updating"].includes(indexStatus.phase) &&
      <div>{translate("index.filesIndexed", { indexed: indexStatus.indexedFiles, total: indexStatus.totalFiles })}</div>
    }
    <div>{indexStatus.label}</div>
  </div>;

  // The first render can show the empty indexing view, which has no rootRef. Attach once the
  // graph root appears, and release the document-scoped hover/long-press owner on teardown.
  useEffect(/** Share delayed control hints across ordinary and portalled surfaces in this document. */ () => {
    const el = rootRef.current;
    if (!el) return;
    return installKplexLongPressTooltips(el.ownerDocument);
  }, [hasPage]);

  useEffect(/** Measure the original pane profile through the current rendering document’s observer. */ () => {
    // Workspace layout events can precede mobile drawer geometry. The host survives the loading
    // surface, so observing it also catches a reveal while rootRef is temporarily absent.
    const el = hostLeaf.view.containerEl;
    if (!el) return;
    type ResizeWindow = Window & { ResizeObserver: typeof ResizeObserver };
    const owningWindow = (el.ownerDocument.defaultView ?? window) as ResizeWindow;
    const update = /** Fullscreen coverage must not switch the original pane’s condensed scene profile. */ (): void => {
      reconcileDocumentFollowVisibility();
      if (!displayModes.getSnapshot().fullscreen) setHostWidth((rootRef.current ?? el).getBoundingClientRect().width);
    };
    update();
    const observer = new owningWindow.ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayModes, hostLeaf, reconcileDocumentFollowVisibility]);

  useEffect(() => {
    if (!page || !documentSession.initialized || documentSession.pendingFollow || documentSession.pendingUrl || activePathRef.current !== activePath) return;
    const replacingMissingCenter = page.path !== activePath;
    // During partial startup hydration the root can exist before a still-valid persisted center has
    // been restored. Never persist that temporary root. Once the authoritative index is ready, a
    // genuinely missing center falls back through navigation history and only then to folder:/.
    if (replacingMissingCenter && page.path === "folder:/" && !plugin.isNavigationFallbackReady()) return;
    activePathRef.current = page.path;
    activePageRef.current = page;
    activeFileRef.current = page.file;
    if (documentSession.initialized && !documentSession.footprints.length) documentSession.footprints.accept(actionNodeRef(page));
    if (documentSession.centerPath !== page.path) {documentSession.centerPath = page.path;documentSession.persist();}
    if (replacingMissingCenter) {
      setActivePath(page.path);
      const historyIndex = plugin.settings.navigationHistory.lastIndexOf(page.path);
      if (historyIndex >= 0) setHistoryCursor(historyIndex);
    }
    if (plugin.settings.lastActivePath === page.path) return;
    plugin.settings.lastActivePath = page.path;
    void plugin.saveSettings(false, false);
  }, [page?.path, activePath, plugin, documentSession, documentSession.initialized]);

  /** Open the target through the host while preserving this surface's document for external-link routing. */
  /** Center the accepted existing note and ensure its managed sidecar is open without toggling it. */
  const centerAndOpenSidecar = useCallback((target: GraphPage) => {
    activate(target, true, false);
    return plugin.openSidecar(hostLeaf, target);
  }, [activate, plugin, hostLeaf]);

  const open = useCallback((target: GraphPage) => {
    return plugin.openPage(target, hostLeaf.view.containerEl.ownerDocument, {hostLeaf});
  }, [plugin, hostLeaf]);

  const updateGraphLenses = useCallback((next: GraphLensDefinition[], baseline?: GraphLensDefinition[], owner?: AppearanceOwner) => plugin.setGraphLenses(next, baseline, owner), [plugin]);

  const lensAppearance = useMemo(/** Only the lens control subscribes; inactive metadata cannot rebuild the parent scene. */ () => ({
    capture: /** Capture at editor/action opening, not when Save eventually runs. */ () => plugin.captureAppearanceOwner(),
    isCurrent: /** Reject old activation epochs, including A→B→A. */ (owner: AppearanceOwner) => plugin.isAppearanceOwnerCurrent(owner),
    subscribe: /** The control releases its selected-theme observation on unmount. */ (changed: () => void) => plugin.subscribeAppearanceThemes(changed),
    name: /** Display data is read only on opening; render/paint never scans saved themes. */ () => plugin.settings.appearanceThemes?.themes.find(theme => theme.id === plugin.settings.appearanceThemes?.selectedId)?.name ?? translate("themes.userName"),
  }), [plugin, translate]);

  /** The native shell previews current paint; the detached React lens still owns its local draft. */
  const editLensColor = useCallback((request: LensColorRequest): LensColorDialog => {
    const target = request.target, owner = request.owner ?? plugin.captureAppearanceOwner();
    const opening = structuredClone({colorPreferences: plugin.settings.colorPreferences, baseNodeStyle: plugin.settings.baseNodeStyle,
      baseLinkStyle: plugin.settings.baseLinkStyle, backgroundColor: plugin.settings.backgroundColor});
    /** A retired draft keeps its own palette/base while the document’s native CSS may still change. */
    const current = (): Pick<typeof plugin.settings, "colorPreferences" | "baseNodeStyle" | "baseLinkStyle" | "backgroundColor"> => plugin.isAppearanceOwnerCurrent(owner) ? plugin.settings : opening;
    const dialog = new ColorSourceModal(plugin.app, {sourceScope: rootRef.current?.querySelector<HTMLElement>(".kplex-plex") ?? rootRef.current ?? request.sourceScope, translate, bindEditor: editor => plugin.bindAppearanceEditor(editor, owner), title: request.title, target, initial: request.initial,
      help: translate("colors.parentHelp"), actionLabel: translate("colors.useColor"), preferences: () => current().colorPreferences,
      nodeStyle: () => ({...current().baseNodeStyle, ...request.nodeStyle()}), linkStyle: () => ({...current().baseLinkStyle, ...request.linkStyle()}),
      background: () => current().backgroundColor, inherit: () => target.kind === "canvas" ? current().backgroundColor
        : target.kind === "node" ? current().baseNodeStyle[target.field] : current().baseLinkStyle[target.field],
      subscribeCss: changed => {const ref = plugin.app.workspace.on("css-change", changed); return () => plugin.app.workspace.offref(ref);},
      subscribeColors: changed => subscribeAppearanceSources(listener => plugin.index.subscribePresentation(listener), () => plugin.settings, changed),
      onSave: async source => {if (!plugin.isAppearanceOwnerCurrent(owner) || !request.apply(source)) throw new Error("Lens editor retired"); return {refreshPending: false};},
    }); dialog.open(); return {element: dialog.containerEl, retire: () => dialog.retire()};
  }, [plugin, translate]);

  const goHistory = (delta: number) => {
    const list = plugin.settings.navigationHistory;
    if (!list.length) return;
    const cursor = Math.max(0, Math.min(list.length - 1, historyCursor + delta));
    setHistoryCursor(cursor);
    const target = plugin.index.get(list[cursor]);
    if (target) activate(target, false);
  };

  /** Persist a shared visibility preference and refresh mounted views without rebuilding the index. */
  const toggleToolbarSetting = async (key: BooleanToolbarSetting) => {
    plugin.settings[key] = !plugin.settings[key];
    // These toolbar/filter controls are presentation-only. Folder/tag topology and aliases reuse
    // already-materialized graph state, so toggling them must not rebuild the semantic index.
    await plugin.saveSettings(false, true);
    forceRender((value) => value + 1);
  };

  /** Change only this native leaf; workspace state survives migration/restart without changing other views. */
  const setCentralNodeEditorEnabled = (enabled: boolean): void => {
    centerPresentation.update({embedCentralNode: enabled});
  };

  /** Remember the mode selected in the embedded center so the next center opens the same way. */
  const rememberCentralNodeMarkdownMode = (mode: SidecarMarkdownMode): void => {
    centerPresentation.update({centralNodeMarkdownMode: mode});
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
    await plugin.setDocumentSyncMode(hostLeaf, mode, page);
    forceRender((value) => value + 1);
  };

  /** Resolve this surface's live control after action dispatch; native Menu retains document/clamping/dismissal ownership. */
  const showToolbarMenu = (menu: Menu, control: RefObject<HTMLButtonElement | null>): void => {
    const anchor = toolbarMenuAnchor(rootRef.current, control.current);
    if (anchor) plugin.showKplexMenuAtPosition(menu, anchor.position, anchor.ownerDocument, hostLeaf);
  };

  /** Open existing sync choices at the owning button for pointer, keyboard and palette invocation. */
  const showDocumentSyncMenu = () => {
    const menu = new Menu();
    const current = plugin.getDocumentSyncMode(hostLeaf);

    menu.addItem((item) => item
      .setTitle(translate("app.syncRecentTabWithPlex"))
      .setIcon("arrow-right")
      .setDisabled(!page?.file && !page?.url)
      .onClick(() => { if (page) void plugin.syncMostRecentTabWithKplex(page, hostLeaf).then(() => forceRender((value) => value + 1)); }));
    menu.addItem((item) => item
      .setTitle(translate("app.syncPlexWithRecentTab"))
      .setIcon("arrow-left")
      .onClick(() => void plugin.syncKplexWithMostRecentTab(hostLeaf)));

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
      .setDisabled(!plugin.hasDocumentSyncTarget(hostLeaf))
      .onClick(() => void plugin.showLinkedDocumentLeaf(hostLeaf)));
    showToolbarMenu(menu, syncMenuButtonRef);
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
  const showSettingsMenu = (event?: MouseEvent<HTMLButtonElement>) => {
    const menu = new Menu();
    menu.addItem((item) => item
      .setTitle(translate("app.pluginSettings"))
      .setIcon("settings")
      .onClick(() => plugin.openSettings()));
    menu.addItem((item) => item
      .setTitle(translate("app.areaSettings"))
      .setIcon("move-vertical")
      .setChecked(areaSettingsMode)
      .onClick(() => runAction("view.areas.toggle")));
    if (event) plugin.showKplexMenuAtMouseEvent(menu, event.nativeEvent, hostLeaf);
    else {
      const root = rootRef.current;
      const bounds = root?.getBoundingClientRect();
      if (root && bounds) plugin.showKplexMenuAtPosition(menu, { x: bounds.left + 40, y: bounds.top + 40 }, root.ownerDocument, hostLeaf);
    }
  };

  /** Disclose Vault search and request focus without changing the central node. */
  const activateSearch = () => setSearchFocusRequest((value) => value + 1);
  const searchHint = effectiveActionBindings(plugin.settings.actionPreferences, "search.focus")
    .map(binding => formatActionBinding(binding, environment, translate)).filter(Boolean).join(" / ");
  const searchCopy = { placeholder: searchHint ? translate("search.placeholderWithShortcut", { shortcut: searchHint }) : translate("search.placeholder"), ariaLabel: translate("search.ariaLabel") };

  /** Focus bare Plex space while preserving controls and portaled filter-header drag focus. */
  const handlePlexPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    plugin.dismissKplexMenu();
    const target = event.target as Element | null;
    if (target?.closest("[data-kplex-wander-control]")) return;
    wander.pause();
    // React portal capture still reaches this shell before the header's native drag listener.
    if (target?.closest(".kplex-central-editor-content, .kplex-filter-panel, input, textarea, select, button, a, [contenteditable='true'], [role='button']")) return;
    graphActionPorts.current?.clearSelection?.();
    rootRef.current?.focus({ preventScroll: true });
  };

  /** Accept current native files and exact Plex URL/tag/placeholder links without source acquisition. */
  const handlePlexDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    const target = draggedGraphPage(plugin.app, plugin.index, event);
    if (!target && (nodeLinkDragSource(plugin.app) || !getDraggedFile(plugin.app)) && !event.dataTransfer.types.includes("text/plain")) return;
    event.preventDefault();
  };

  /** Re-center on an existing dropped endpoint; only native files may wait for partial indexing. */
  const handlePlexDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const target = draggedGraphPage(plugin.app, plugin.index, event);
    const file = getDraggedFile(plugin.app);
    if (!target && (nodeLinkDragSource(plugin.app) || !file)) return;
    event.preventDefault();
    event.stopPropagation();
    if (target) {
      pendingFileExplorerDropRef.current = null;
      activate(target, true);
      return;
    }
    if (file) pendingFileExplorerDropRef.current = file;
  };

  /** Explicit graph focus reveals its captured native tab; other foreground actions reveal when invoked as published commands. */
  const uiAction = (execute: Parameters<typeof surfaceAction>[0], available?: Parameters<typeof surfaceAction>[1]) => surfaceAction(
    /** A fresh generation check after native reveal prevents late focus theft during migration/close. */ async context => {
      if (context.request.id === "graph.focus" || context.request.source === "obsidian-command" && ["actions.open", "keyboard.help", "editor.focus", "search.focus", "find.focus"].includes(context.request.id)) {
        if (!await plugin.revealActionSurface(actions.surfaceId) || context.generation === undefined || !plugin.isActionSurfaceCurrent(actions.surfaceId, context.generation)) return { status: "cancelled" };
      }
      return execute(context);
    }, available);
  /** Resolve exactly the accepted node; pin/history actions never choose another row after filtering. */
  const actionPage = (context: ActionContext): GraphPage | null => context.target.kind === "node"
    ? resolveActionPage(plugin.index, context.target.node) : null;
  /** Open a finite pins/history list without materializing missing files or compressing saved slots. */
  const openSavedPicker = (kind: "pins" | "history"): ActionOutcome => {
    const paths = [...(kind === "pins" ? plugin.settings.pinnedNodes : plugin.settings.navigationHistory)];
    const items: ActionPickerItem<NodeRef | null>[] = paths.map(/** Retain unavailable saved rows explicitly. */ path => {
      const target = plugin.index.get(path);
      const presentation = target ? nodeListPresentation(target, plugin.index.titleFor(target)) : null;
      return { label: presentation?.label ?? translate("actions.missingTarget", { path }), icon: presentation?.icon ?? "file-question",
        detail: path, disabled: !target, value: target ? actionNodeRef(target) : null };
    });
    const sessionId = `${actions.surfaceId}:picker:${++dialogSerial.current}`;
    const picker = new ActionTargetPicker(plugin.app, items, translate(kind === "pins" ? "actions.pinsPlaceholder" : "actions.historyPlaceholder"),
      /** Dispatch the captured target only after manager identity and surface checks. */ target => {
        if (target) actions.dispatch({ id: "node.activate", source: "local-menu", target: { kind: "explicit", node: target } });
      }, /** Release exclusivity and callback ownership on every modal exit. */ () => {
        actionDialogs.current.delete(picker); plugin.actionManager.closeSession(sessionId);
      });
    actionDialogs.current.add(picker); picker.open();
    return { status: "opened", sessionId };
  };
  /** Capture selected-or-center before native modal focus replaces the launching region. */
  const openLocalActions = (help: boolean): ActionOutcome => {
    if (help) {
      const sessionId = `${actions.surfaceId}:help:${++dialogSerial.current}`;
      const modal = new KeyboardHelpModal(plugin, /** Native close retires the reference without executing a listed action. */ () => {
        actionDialogs.current.delete(modal); plugin.actionManager.closeSession(sessionId);
      });
      actionDialogs.current.add(modal); modal.open();
      return { status: "opened", sessionId };
    }
    const snapshot = actions.readSnapshot();
    /** Detach target identity from canonical pages, whose native file can change while the menu is open. */
    const capture = (target: GraphPage | undefined) => target ? { file: target.file, reference: actionNodeRef(target) } : null;
    const capturedCenter = capture(page);
    const capturedSelected = snapshot.selected;
    const selectedPage = capture(capturedSelected ? plugin.index.get(capturedSelected.node.identity) : undefined);
    const sessionId = `${actions.surfaceId}:menu:${++dialogSerial.current}`;
    const modal = new ActionMenuModal(plugin, plugin.actionManager, actions.surfaceId,
      /** Follow same-file rename, refuse deletion/replacement, and preserve strict selected occurrence. */ () => {
        /** Reacquire one captured node without ever falling back to another note at the old path. */
        const refresh = (captured: ReturnType<typeof capture>): ReturnType<typeof actionNodeRef> | null => {
          if (!captured) return null;
          const file = captured.file;
          if (file && plugin.app.vault.getFileByPath(file.path) !== file) return null;
          const current = file ? plugin.index.get(file.path) : resolveActionPage(plugin.index, captured.reference);
          return current && (!file || current.file === file) ? actionNodeRef(current) : null;
        };
        const currentSelection = graphActionPorts.current?.readSelected();
        const selectedNode = capturedSelected?.node.kind === "section" ? capturedSelected.node : refresh(selectedPage);
        const selected = capturedSelected && selectedNode && currentSelection?.occurrenceId === capturedSelected.occurrenceId
          ? { node: selectedNode, occurrenceId: capturedSelected.occurrenceId } : null;
        return { center: refresh(capturedCenter), selected };
      },
      /** Retire modal leases independently of target validity or successful execution. */ () => {
        actionDialogs.current.delete(modal); plugin.actionManager.closeSession(sessionId);
      });
    actionDialogs.current.add(modal); modal.open();
    return { status: "opened", sessionId };
  };
  /** Focus the existing filter/lens control through its native disclosure and focus behavior. */
  const openFilterControl = (): void => {
    if (displayModes.getSnapshot().zen) displayModes.toggleZen();
    const trigger = rootRef.current?.querySelector<HTMLButtonElement>(".kplex-filter-trigger");
    if (!trigger) return;
    if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();
    trigger.focus();
  };
  const appImplementations: SurfaceActionImplementations = {
    "actions.open": uiAction(/** Show actions for this surface's captured context. */ () => openLocalActions(false)),
    "keyboard.help": uiAction(/** Help derives from the effective catalog/preferences. */ () => openLocalActions(true)),
    "graph.focus": uiAction(/** Explicit focus never follows an unrelated native editor file. */ () => rootRef.current?.focus({ preventScroll: true })),
    "editor.focus": uiAction(/** Delegate to the exact native representation; a visible wrapper alone never proves that focus transferred. */ () => {
      const mount = rootRef.current?.querySelector<HTMLElement>(".kplex-central-editor-leaf-host");
      if (mount) return focusEmbeddedMarkdown(mount) ? undefined : { status: "unavailable", reasonKey: "actions.unavailable" };
      const frame = rootRef.current?.querySelector<HTMLElement>(".kplex-central-editor-content .kplex-embedded-web-frame");
      if (frame?.getClientRects().length) {
        frame.focus({ preventScroll: true });
        if (frame.ownerDocument.activeElement === frame) return;
      }
      return plugin.focusAssociatedEditor(hostLeaf) ? undefined : { status: "unavailable", reasonKey: "actions.unavailable" };
    }, /** No hidden editor creation is part of focus availability. */ () => Boolean(rootRef.current?.querySelector(".kplex-central-editor-content")) || plugin.hasAssociatedEditor(hostLeaf)),
    "search.focus": uiAction(/** Reveal the toolbar before requesting native search focus, without retargeting the center. */ () => {
      if (displayModes.getSnapshot().zen) displayModes.toggleZen();
      activateSearch();
    }),
    "find.focus": uiAction(/** Reveal Zen-hidden Find before requesting this Plex’s field focus. */ () => {
      if (displayModes.getSnapshot().zen) displayModes.toggleZen();
      setFindFocusRequest(value => value + 1);
    }),
    "history.back": uiAction(/** Boundary traversal stays a bounded existing-history operation. */ () => goHistory(-1)),
    "history.forward": uiAction(/** Traverse the existing history cursor without acquiring missing files. */ () => goHistory(1)),
    "history.open": uiAction(/** Include all saved history, beyond the footer's visible subset. */ () => openSavedPicker("history")),
    "pins.open": uiAction(/** Preserve saved order and unavailable rows in the complete searchable pins picker. */ () => openSavedPicker("pins")),
    "view.aliases.toggle": uiAction(/** Reuse the current toolbar's presentation-only mutation. */ () => toggleToolbarSetting("renderAlias")),
    "view.fullscreen.toggle": uiAction(/** Reveal the native group before fullscreen moves its content; the view retains Zen and overlay ownership. */ () => {
      plugin.restorePlexFoldBeforeReveal(hostLeaf);
      displayModes.toggleFullscreen();
    }, () => displayModes.fullscreenAvailable),
    "view.wander.start": uiAction(/** All start surfaces resume the same per-view session. */ () => wander.start(), () => Boolean(page && rootRef.current?.querySelector(".kplex-plex"))),
    "view.wander.stop": uiAction(/** Stop restores the immutable entry Zen state. */ () => wander.stop(), () => wander.getSnapshot().phase !== "stopped"),
    "view.zen.toggle": uiAction(/** Independent session chrome visibility never changes persisted settings. */ () => displayModes.toggleZen()),
    "view.depth.toggle": uiAction(/** Reuse the established projection depth setting. */ () => toggleExpandedView()),
    "view.connectors.toggle": uiAction(/** Camera and connector appearance remain presentation-only. */ () => toggleConnectorStyle()),
    "view.areas.toggle": uiAction(/** Area editing mode remains transient and surface-local. */ () => setAreaSettingsMode(value => !value)),
    "view.center-editor.toggle": uiAction(/** Existing embedded editor capability and cleanup remain graph-owned. */ () => setCentralNodeEditorEnabled(!centerMode.embedCentralNode)),
    "view.sync.choose": uiAction(/** Open the same keyboard-accessible native sync menu. */ () => showDocumentSyncMenu()),
    "view.sidecar.toggle": uiAction(/** Toggle only the managed companion for this owning leaf. */ () => page ? plugin.toggleSidecar(hostLeaf, page) : undefined, () => surface !== "sidepanel" && Boolean(page)),
    "view.sidecar.attach-from-center": uiAction(/** Reuse the eligible adjacent pane and populate it from this center. */ () => plugin.attachAdjacentSidecar(hostLeaf, "to-leaf", page),
      /** Folder/tag/ghost centers cannot populate an ordinary document pane. */ () => Boolean((page?.file || page?.url) && plugin.getAdjacentSidecarCandidate(hostLeaf))),
    "view.sidecar.attach-from-pane": uiAction(/** Preserve the pane's content and reuse native follow's partial-index demand handover. */ async () => {
      const target = await plugin.attachAdjacentSidecar(hostLeaf, "to-plex");
      if (target?.file) observeDocumentFollow(target.file);
      else if (target) {
        const indexed = plugin.index.get(target.path);
        if (indexed) activate(indexed, true, false);
      }
    }, /** An empty pane has nothing to bring into the Plex. */ () => plugin.getAdjacentSidecarTarget(hostLeaf) !== null),
    "view.sidecar.detach": uiAction(/** Detach the existing companion without selecting a different native leaf. */ () => plugin.detachSidecar(hostLeaf), () => surface !== "sidepanel" && plugin.isSidecarOpen(hostLeaf)),
    "view.sidecar.position": uiAction(/** Explicit choices and keyboard menu share the same host move implementation. */ context => {
      if (context.request.id === "view.sidecar.position" && context.request.args?.position && page) return plugin.moveSidecar(hostLeaf, context.request.args.position, page);
      showSidecarMoveMenu();
      return;
    }, () => surface !== "sidepanel" && Boolean(page)),
  };
  for (const id of ["view.filters.open", "view.lens.choose", "view.sort.choose", "view.visibility.open"] as const) {
    appImplementations[id] = uiAction(openFilterControl);
  }
  for (const id of ["pin.toggle", "pin.add", "pin.remove"] as const) {
    appImplementations[id] = {
      availability: /** Pinning supports current materialized semantic nodes, without a graph scan. */ context => actionPage(context)
        ? { state: "enabled" } : { state: "disabled", reasonKey: "actions.target-unavailable" },
      execute: /** Add/remove are idempotent; stale remove requests cannot toggle a pin back on. */ async context => {
        const target = actionPage(context);
        if (!target) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
        const pinned = plugin.isPinned(target.path);
        if (id === "pin.toggle" || id === "pin.add" && !pinned || id === "pin.remove" && pinned) await plugin.togglePinned(target.path);
        forceRender(value => value + 1);
        return { status: "completed" };
      },
    };
  }
  for (const slot of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
    appImplementations[`pin.open-slot.${slot}`] = uiAction(/** Slot resolution precedes hydration filtering, so missing earlier entries do not shift meanings. */ () => {
      const path = plugin.settings.pinnedNodes[slot - 1];
      const target = path ? plugin.index.get(path) : undefined;
      if (target) activate(target);
    }, /** Missing slots stay unavailable rather than redirecting to a neighboring pin. */ () => Boolean(plugin.index.get(plugin.settings.pinnedNodes[slot - 1] ?? "")));
  }
  const sidecarAvailable = surface !== "sidepanel";
  const sidecarPosition = sidecarAvailable ? plugin.getSidecarPosition(hostLeaf) : null;
  const sidecarOpen = Boolean(sidecarPosition);
  const sidecarEdgePosition = sidecarPosition ?? plugin.getDocumentSidecarPosition(hostLeaf);
  const adjacentSidecar = sidecarAvailable && !sidecarOpen ? plugin.getAdjacentSidecarCandidate(hostLeaf) : null;
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
  const baseViewSettings = useMemo(/** Retain the existing profile's identity across non-settings publications. */ () => plugin.getViewSettings(profileSurface), [plugin, profileSurface, renderRevision]);
  const basePaintSettings = useMemo(/** Only paint publication refreshes color-only inputs. */ () => plugin.getViewSettings(profileSurface), [plugin, profileSurface, renderRevision, paintRevision]);
  const viewSettings = useMemo(/** Local center mode changes layout only in its own leaf. */ () => centerViewSettings(baseViewSettings, centerMode), [baseViewSettings, centerMode]);
  const paintSettings = useMemo(/** Preserve inherited profile fields and paint-only ownership. */ () => centerViewSettings(basePaintSettings, centerMode), [basePaintSettings, centerMode]);
  const paintLenses = useMemo(/** Reuse compiled predicates while replacing only their already-sanitized style payloads. */ () => {
    const styles = new Map(plugin.settings.graphLenses.map(lens => [lens.id, lens.style]));
    return {...compiledGraphLenses, lenses: compiledGraphLenses.lenses.map(lens => ({...lens, style: styles.get(lens.id)}))};
  }, [plugin, compiledGraphLenses, paintRevision]);
  const actions = usePlexActions({ plugin, hostLeaf, root: rootRef, convention: environment.keyConvention,
    center: page, graph: graphActionPorts, implementations: appImplementations, mounted: hasPage,
    onUserInteraction: /** Native commands/keyboard interactions pause before their accepted work. */ () => wander.pause(),
    readEscapeAction: /** Wander stops first; subsequent Escapes follow the existing display hierarchy. */ () => wander.getSnapshot().phase !== "stopped" ? "view.wander.stop" : displayModes.getSnapshot().zen ? "view.zen.toggle" : displayModes.getSnapshot().fullscreen ? "view.fullscreen.toggle" : null,
    historyBack: historyCursor > 0, historyForward: historyCursor < plugin.settings.navigationHistory.length - 1, onReady });
  /** Forward intentional toolbar/control actions with explicit owning surface. */
  const runAction = (id: ActionId): void => actions.dispatch({ id, source: "toolbar" });
  const supportButton = <ToolButton icon="bug" title={translate("support.reportTitle")} onClick={/** Invoke the owning clipboard writer directly before any action-dispatch await, including partial startup. */ event => plugin.reportBug(event.currentTarget, actions.surfaceId)} />;

  // History belongs to loaded settings, not semantic readiness. Preserve every saved slot on
  // both loading and graph surfaces; unresolved targets stay inert until their owner publishes.
  const historyBar = <footer className="kplex-history-bar">
    <span className="kplex-history-label">{translate("app.pastNodes")}</span>
    <div className="kplex-history-list">
      {plugin.settings.navigationHistory.slice(-14).reverse().map((path, indexValue) => {
        const item = plugin.index.get(path);
        const {label: title, icon} = item ? nodeListPresentation(item, plugin.index.titleFor(item)) : {label: path, icon: "file-question"};
        return <button key={`${path}:${indexValue}`} data-kplex-history-path={path} aria-label={`${title}\n${path}`} disabled={!item}
          className={path === activePath ? "is-active" : ""}
          onClick={/** Dispatch only this currently available saved identity; no fallback or note creation. */ () => {if (item) actions.dispatch({id: "node.activate", source: "toolbar", target: {kind: "explicit", node: actionNodeRef(item)}});}}>
          <ObsidianIcon name={icon} size={12} /><span className="kplex-history-text">{title}</span>
        </button>;
      })}
    </div>
  </footer>;

  if (!page) return <div
    ref={rootRef}
    tabIndex={0}
    role="region"
    aria-labelledby={canvasNameId}
    className="kplex-app"
    data-kplex-tooltip-scope
    onDragOver={handlePlexDragOver}
    onDrop={handlePlexDrop}
  >
    <span id={canvasNameId} className="kplex-accessible-name">{translate("view.displayName")}</span>
    <div className={`kplex-main-column${plugin.settings.wrapNodeLabels ? " is-two-line-history" : ""}`}>
      <div aria-hidden="true" />
      <div className="kplex-graph-area kplex-empty">
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
      </div>
      {!displayState.zen && historyBar}
    </div>
    {!displayState.zen && <div className="kplex-empty-support">{supportButton}</div>}
  </div>;

  const linkedLabel = plugin.getLinkedDocumentLeafLabel(hostLeaf);
  const syncMode = plugin.getDocumentSyncMode(hostLeaf);
  const syncTargetAvailable = plugin.hasDocumentSyncTarget(hostLeaf);
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



  /** The action-dispatched Sidecar menu shares fresh control anchoring without changing position choices. */
  const showSidecarMoveMenu = () => {
    const menu = new Menu();
    const options: Array<[SidecarPosition, string, string]> = [
      ["right", translate("position.right"), "panel-right"], ["left", translate("position.left"), "panel-left"], ["above", translate("position.above"), "panel-top"], ["below", translate("position.below"), "panel-bottom"],
    ];
    for (const [position, label, icon] of options) menu.addItem((item) => item
      .setTitle(label).setIcon(icon).setChecked(sidecarEdgePosition === position)
      .onClick(/** Position choices dispatch the same typed intent as a configured shortcut. */ () => actions.dispatch({ id: "view.sidecar.position", source: "context-menu", args: { position } })));
    showToolbarMenu(menu, sidecarMoveButtonRef);
  };

  void sidecarRevision; // subscription is a render trigger; all state is owned by the plugin.

  return <div
    ref={rootRef}
    className={`kplex-app kplex-surface-${surface}${condensedBySidecar ? " is-sidecar-condensed" : ""}${displayState.zen ? " is-zen" : ""}`}
    data-kplex-tooltip-scope
    tabIndex={0}
    role="region"
    aria-labelledby={canvasNameId}
    onPointerDownCapture={handlePlexPointerDown}
    onWheelCapture={/** A real graph/editor wheel gesture pauses; playback widgets retain their own input. */ event => { if (!(event.target as Element).closest("[data-kplex-wander-control]")) wander.pause(); }}
    onDragStartCapture={/** External/graph drag input is user-owned even without node activation. */ () => wander.pause()}
    onContextMenuCapture={/** Opening native menus holds the current route. */ () => wander.pause()}
    onDragOver={handlePlexDragOver}
    onDrop={handlePlexDrop}
  >
    <span id={canvasNameId} className="kplex-accessible-name">{translate("view.displayName")}</span>
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
            onClick={() => runAction("history.back")}
            disabled={historyCursor <= 0}
          />
          <ActionButton
            label={translate("toolbar.navigateForward")}
            icon={<ObsidianIcon name="arrow-big-right" size={17} />}
            onClick={() => runAction("history.forward")}
            disabled={historyCursor >= plugin.settings.navigationHistory.length - 1}
          />
          <SearchBox
            graph={graphSearchRead}
            icon={<ObsidianIcon name="search" size={16} />}
            resultIcon={/** Explicit type facets choose the host's native Lucide icon. */ hit => <ObsidianIcon name={searchResultIconName(hit.node)} size={16} />}
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
            value={{ ...plexFilter, showCrossLinks: plugin.settings.showCrossLinks }}
            onChange={/** Persist cross-link changes separately from temporary filters; manual edits retire Find ownership. */ (next) => {
              if (next.showCrossLinks !== plugin.settings.showCrossLinks) void toggleToolbarSetting("showCrossLinks");
              setFindFilterOwner(null); setPlexFilter(next);
            }}
            lenses={plugin.settings.graphLenses} colorPalette={plugin.settings.colorPreferences.palette}
            onLensesChange={updateGraphLenses} onEditColor={editLensColor} appearance={lensAppearance} lensesReadOnly={plugin.settings.graphLensesColorFuture !== undefined || plugin.settings.appearanceThemesFuture !== undefined}
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
            {supportButton}
            <button
              ref={syncMenuButtonRef}
              type="button"
              aria-haspopup="menu"
              data-kplex-menu-trigger="sync"
              className={`kplex-icon-button${syncMode !== "off" && syncTargetAvailable ? " is-on" : ""}`}
              aria-label={translate("app.syncActions", { status: syncTitle })}
              onClick={() => runAction("view.sync.choose")}
            ><ObsidianIcon name={syncIcon} size={17} /></button>
            <ToolButton
              icon="type"
              title={translate(plugin.settings.renderAlias ? "app.displayAliasesOn" : "app.displayAliasesOff")}
              on={plugin.settings.renderAlias}
              onClick={() => runAction("view.aliases.toggle")}
            />
            <span className="kplex-toolbar-divider" />
            <ToolButton icon={plugin.settings.graphDepth === 2 ? "list-chevrons-down-up" : "list-chevrons-up-down"} title={translate(plugin.settings.graphDepth === 2 ? "app.singleLevelView" : "app.expandedView")} on={plugin.settings.graphDepth === 2} onClick={() => runAction("view.depth.toggle")} />
            {isGraphTabCommandAvailable(environment) && <ToolButton icon="plus" title={translate("actions.surface.new-tab")} onClick={() => runAction("surface.new-tab")} />}
            <ToolButton icon="settings" title={translate("app.settingsMenu")} on={areaSettingsMode} onClick={showSettingsMenu} />
          </div>
        </header>

        {pinnedPages.length > 0 && <div className="kplex-pinned-bar" aria-label={translate("app.pinnedNodes")}>
          {pinnedPages.map((pinned) => {
            const { label: title, icon } = nodeListPresentation(pinned, plugin.index.titleFor(pinned));
            return <div key={pinned.path} className={`kplex-pinned-chip${pinned.path === page.path ? " is-active" : ""}`}>
              <button className="kplex-pinned-open" data-kplex-pinned-path={pinned.path} aria-label={`${title}\n${pinned.path}`} onClick={() => actions.dispatch({ id: "node.activate", source: "toolbar", target: { kind: "explicit", node: actionNodeRef(pinned) } })}><ObsidianIcon name={icon} size={12} /><span>{title}</span></button>
              <button className="kplex-pinned-remove" aria-label={translate("app.unpinNode", { title })} onClick={() => actions.dispatch({ id: "pin.remove", source: "toolbar", target: { kind: "explicit", node: actionNodeRef(pinned) } })}><ObsidianIcon name="x" size={11} /></button>
            </div>;
          })}
        </div>}
      </div>

      <main className="kplex-workspace">
        <section className="kplex-graph-area" data-kplex-tooltip-boundary>
          <div className="kplex-zone-label zone-parent">{translate("app.zoneParents")}</div>
          <div className="kplex-zone-label zone-left">{translate("app.zoneFriendsPrevious")}</div>
          <div className="kplex-zone-label zone-right">{translate("app.zoneChallengersNext")}</div>
          <div className="kplex-zone-label zone-child">{translate("app.zoneChildren")}</div>
          <PlexGraph plugin={plugin} index={plugin.index} settings={viewSettings} paintSettings={paintSettings} paintLenses={paintLenses} surface={profileSurface} hostLeaf={hostLeaf} predicate={plexFilterPredicate} lenses={compiledGraphLenses} filterLayoutMode={filterLayoutMode} predicateRevision={predicateRevision} showCrossLinks={plugin.settings.showCrossLinks} activePath={page.path} renderRevision={renderRevision} findFocusRequest={findFocusRequest}
            footprintsControl={<PlexFootprintsPanel trail={documentSession.footprints} translate={translate}
              readRow={/** Resolve visible references only; unavailable nodes never trigger acquisition or creation. */ visit => {
                const target = resolveActionPage(plugin.index, visit.node);
                return target ? {...nodeListPresentation(target, plugin.index.titleFor(target)), available: true}
                  : {label: visit.node.identity, icon: "circle-help", available: false};
              }} formatLink={/** Explicit clipboard projection uses current cached facets or the captured link; never acquire sources. */ visit => nodeMarkdownLink(visit.node, resolveActionPage(plugin.index, visit.node))}
              navigate={/** Normal activation preserves global history and records this repeated visit once. */ visit => {
                const target = resolveActionPage(plugin.index, visit.node);if (target && target.path !== activePathRef.current) activate(target);
              }} />}
          actionPorts={graphActionPorts} actionSurfaceId={actions.surfaceId} displayState={displayState} fullscreenAvailable={displayModes.fullscreenAvailable && environment.device === "desktop"}
          semanticRevision={plugin.index.getSemanticRevision()} navigationOrigin={navigationOrigin} onSemanticDemandAcquired={acknowledgeDocumentDemandHandover} onActivate={/** Manual graph navigation keeps the existing history and sync path. */ target => activate(target)} onWanderActivate={/** Explicit Wander origin survives asynchronous scene publications. */ target => activate(target, true, true, "wander")} onOpen={open} onOpenInSidecar={centerAndOpenSidecar} onCentralNodeEditorChange={setCentralNodeEditorEnabled} onCentralNodeModeChange={rememberCentralNodeMarkdownMode} areaSettingsMode={areaSettingsMode} onAreaSettingsModeChange={setAreaSettingsMode}
          onApplyFindFilter={applyFindFilter} appliedFindFilterQuery={findFilterOwner?.query ?? null} onClearFindFilter={clearFindFilter} />
          {wanderState.phase !== "stopped" && <WanderControls state={wanderState} translate={translate}
            stopIcon={<ObsidianIcon name="x" size={17} />} playbackIcon={<ObsidianIcon name={wanderState.phase === "paused" ? "play" : "pause"} size={17} />} paceIcon={<ObsidianIcon name="timer" size={11} />}
            onStop={/** Stop is the same catalog operation as Escape/native actions. */ () => runAction("view.wander.stop")}
            onToggle={/** Playback controls never feed the auto-pause input path. */ () => wanderState.phase === "paused" ? wander.play() : wander.pause()}
            onSeconds={/** Pace affects the next cycle, not global animation speed. */ seconds => wander.setSeconds(seconds)} />}
        </section>
      </main>

      {sidecarAvailable && <div className={`kplex-sidecar-controls is-${sidecarEdgePosition}${sidecarOpen ? " is-open" : " is-closed"}`} aria-label={translate("app.sidecarControls")}>
        <button type="button" className="kplex-sidecar-primary" aria-pressed={sidecarOpen} aria-label={sidecarOpen ? translate("app.closeSidecar") : translate("app.openSidecarAt", { position: physicalPositionLabel(sidecarEdgePosition, translate) })} onClick={() => runAction("view.sidecar.toggle")}><ObsidianIcon name={sidecarOpen ? closeSidecarIcon : openSidecarIcon} size={16} /></button>
        {adjacentSidecar && <SidecarAttachControls position={sidecarEdgePosition}
          toLeaf={Boolean(page?.file || page?.url)} toPlex={plugin.getAdjacentSidecarTarget(hostLeaf) !== null}
          toLeafLabel={translate("actions.view.sidecar.attach-from-center")} toPlexLabel={translate("actions.view.sidecar.attach-from-pane")}
          icon={/** Host supplies the installed Lucide icon renderer. */ name => <ObsidianIcon name={name} size={16} />}
          onToLeaf={/** All entry points share typed action availability and ownership. */ () => runAction("view.sidecar.attach-from-center")}
          onToPlex={/** Reverse flow keeps the exact initiating surface. */ () => runAction("view.sidecar.attach-from-pane")} />}
        {sidecarOpen && <>
          <button type="button" aria-label={translate("app.foldForSidecar")} onClick={/** Explicit surface dispatch reaches the graph-independent host fold owner. */ () => runAction("view.sidecar.collapse-plex")}><ObsidianIcon name={foldPlexIcon} size={15} /></button>
          <button ref={sidecarMoveButtonRef} type="button" aria-haspopup="menu" data-kplex-menu-trigger="sidecar-position" aria-label={translate("app.moveSidecar")} onClick={() => runAction("view.sidecar.position")}><ObsidianIcon name="move" size={15} /></button>
          <button aria-label={translate("app.detachSidecar")} onClick={() => runAction("view.sidecar.detach")}><ObsidianIcon name="unlink" size={15} /></button>
        </>}
      </div>}

      {historyBar}
    </div>
  </div>;
}
