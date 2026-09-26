import { FileView, MarkdownView, Menu, Notice, Platform, Plugin, TFile, normalizePath, setIcon, type Editor, type EventRef, type HoverParent, type WorkspaceLeaf } from "obsidian";
import { GraphIndex } from "./index/GraphIndex";
import { DEFAULT_SETTINGS, ExcaliBrainSettingTab, migrateAndMergeSettings, type DocumentSyncMode, type ExcaliBrainSettings, type KplexLayoutProfile, type KplexViewSurface, type SidecarPosition } from "./settings";
import { EXCALIBRAIN_VIEW_TYPE, KPLEX_SIDEPANEL_VIEW_TYPE, ExcaliBrainView, KplexSidepanelView } from "./ui/ExcaliBrainView";
import { RelationModal, type RelationModalOptions } from "./ui/RelationModal";
import { NewRelatedNoteModal } from "./ui/NewRelatedNoteModal";
import { CreateFolderNoteModal } from "./ui/CreateFolderNoteModal";
import { MaterializeGhostModal, type GhostMaterializationKind, type GhostMaterializationLocation } from "./ui/MaterializeGhostModal";
import { DeleteNodeConfirmationModal, RemainingNodeReferencesModal, type RemainingNodeReference } from "./ui/DeleteNodeModal";
import { LinkDirection, type GateRole, type GraphPage, type RelationshipRole } from "./types";
import { OntologySuggester } from "./editor/OntologySuggester";
import { extractLinksFromValue, normalizeFieldName, parseBodyMetadata } from "./index/fieldParser";
import type { RelationEvidence } from "./index/RelationEvidence";
import { AddToOntologyModal, type OntologyAssignmentRole } from "./ui/AddToOntologyModal";
import { NoteTypeModal } from "./ui/NoteTypeModal";
import { activeLayoutProfile, effectiveViewSettings, layoutProfileKey } from "./ui/viewProfile";
import { readObsidianPresentationEnvironment } from "./adapters/obsidian/presentationEnvironment";
import { createObsidianTranslator } from "./adapters/obsidian/localization";
import { createTranslator, type Translator } from "./lang";
import { isGraphTabCommandAvailable, isPopoutCommandAvailable, primaryOpenSurface } from "./core/plex/viewPresentation";
import { perfNow } from "./util/perf";

type LoadAwareView = FileView & { _loaded?: boolean };

type SidecarFootprint = {
  width: number;
  height: number;
  hostShare: number;
  ownerDocument: Document;
};

export type RelationshipSourceSection = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  label: string;
  text: string;
  sourceKind: RelationEvidence["sourceKind"];
};

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const MANAGED_CREATED_PATH_TTL_MS = 4_000;

export default class ExcaliBrainPlugin extends Plugin {
  settings: ExcaliBrainSettings = DEFAULT_SETTINGS;
  index!: GraphIndex;
  translator: Translator = createTranslator("en");
  private rebuildTimer: number | null = null;
  private indexDirty = true;
  private linkedDocumentLeaf: WorkspaceLeaf | null = null;
  private lastDocumentLeaf: WorkspaceLeaf | null = null;
  private readonly hoverParent: HoverParent = { hoverPopover: null };
  private reactiveIndexListenersRegistered = false;
  private openKplexViews = 0;
  private layoutReady = false;
  private metadataStabilized = false;
  private metadataStabilityPromise: Promise<number> | null = null;
  private readonly indexBacklogReasons = new Set<string>();
  private indexDirtyRevision = 0;
  private rebuildTask: Promise<void> | null = null;
  private unloading = false;
  private initialIndexTask: Promise<void> | null = null;
  private initialIndexComplete = false;
  private snapshotRestoreTask: Promise<{ restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean }> | null = null;
  private readonly sidecarLeaves = new Map<WorkspaceLeaf, WorkspaceLeaf>();
  private sidecarRestoreTask: Promise<void> | null = null;
  private readonly sidecarMovingHosts = new Set<WorkspaceLeaf>();
  private readonly sidecarRestoreAttemptedHosts = new Set<WorkspaceLeaf>();
  /**
   * Obsidian restores workspace leaves asynchronously. During that short window its
   * "most recent" leaf can be the first serialized tab rather than the tab the user
   * actually had linked to K-Plex. Suppress normal recent-tab following until the
   * persisted sidecar/link ownership has had time to reconnect.
   */
  private startupInitializing = true;
  private startupInitializationTimer: number | null = null;
  private readonly linkedLeafHighlightTimers = new Map<HTMLElement, { viewWindow: Window; timer: number }>();
  private readonly collapsedPlexHosts = new Map<WorkspaceLeaf, { sidecarLeaf: WorkspaceLeaf; position: SidecarPosition; hostGroup: HTMLElement; unfoldButton: HTMLButtonElement }>();
  private readonly sidecarListeners = new Set<() => void>();
  private transientDocumentFollowSuppression: { path: string; until: number } | null = null;
  private readonly navigationListeners = new Set<(path: string) => void>();
  private readonly searchFocusListeners = new Map<WorkspaceLeaf, () => void>();
  private readonly relationshipFlairListeners = new Set<(path: string) => void>();
  private readonly indexStatusListeners = new Set<() => void>();
  private readonly kplexVisibilityListeners = new Set<() => void>();
  private visibleKplexLeaves = new Set<WorkspaceLeaf>();
  private lastIndexStatusKey = "";
  private readonly graphLensListeners = new Set<(lenses: ExcaliBrainSettings["graphLenses"]) => void>();
  private readonly managedMetadataWrites = new Map<string, number>();
  /** Paths suppress the synchronous vault:create rebuild; object identity protects optimistic UI. */
  private readonly managedCreatedPaths = new Map<string, number>();
  private readonly managedCreatedFiles = new WeakSet<TFile>();
  /** Markdown files whose metadata/body changed since the last published graph. */
  private readonly dirtyMarkdownPaths = new Set<string>();
  /** Rename-only metadata notifications are semantic no-ops when mtime/size are unchanged. */
  private readonly renameMetadataSuppressions = new Map<string, { mtime: number; size: number; until: number }>();
  private activeKplexMenu: Menu | null = null;
  private activeKplexMenuDocument: Document | null = null;
  private readonly kplexMenuOutsidePointerDown = (event: PointerEvent): void => {
    const target = event.target && typeof event.target === "object" && "closest" in event.target
      ? event.target as Element
      : null;
    if (target?.closest(".menu")) return;
    this.dismissKplexMenu();
  };

  private runningExcaliBrainSettings(): unknown {
    // Obsidian does not currently expose the community-plugin registry as public API. The
    // legacy ExcaliBrain plugin does expose its loaded settings on the plugin instance, so keep
    // this guarded bridge isolated here. K-Plex has its own manifest id (k-plex), allowing both
    // plugins to run side by side during migration.
    type RuntimePlugin = Plugin & { settings?: unknown };
    type PluginManagerBridge = { plugins?: Record<string, RuntimePlugin> };
    const manager = (this.app as unknown as { plugins?: PluginManagerBridge }).plugins;
    const legacy = manager?.plugins?.excalibrain;
    if (!legacy || legacy === (this as unknown as RuntimePlugin)) return null;
    return legacy.settings ?? null;
  }

  async onload(): Promise<void> {
    this.translator = createObsidianTranslator();
    const ownData: unknown = await this.loadData();
    const ownRecord = ownData && typeof ownData === "object" ? ownData as Record<string, unknown> : null;
    const alreadyKplex = Boolean(
      ownRecord?.kplexInitialized ||
      ownRecord?.connectorStyle ||
      ownRecord?.graphDepth ||
      ownRecord?.parentColumns ||
      ownRecord?.childColumns ||
      ownRecord?.noteTypeField
    );
    this.settings = migrateAndMergeSettings(ownData);
    if (alreadyKplex && !ownRecord?.kplexInitialized) {
      this.settings.kplexInitialized = true;
      await this.saveData(this.settings);
    }

    this.index = new GraphIndex(this);

    this.registerView(EXCALIBRAIN_VIEW_TYPE, (leaf: WorkspaceLeaf) => new ExcaliBrainView(leaf, this));
    this.registerView(KPLEX_SIDEPANEL_VIEW_TYPE, (leaf: WorkspaceLeaf) => new KplexSidepanelView(leaf, this));
    this.registerHoverLinkSource(EXCALIBRAIN_VIEW_TYPE, { display: "K-Plex", defaultMod: false });
    this.registerHoverLinkSource(KPLEX_SIDEPANEL_VIEW_TYPE, { display: "K-Plex", defaultMod: false });
    this.addSettingTab(new ExcaliBrainSettingTab(this.app, this));
    this.registerEditorSuggest(new OntologySuggester(this));
    this.addRibbonIcon("brain-circuit", "Open K-Plex", () => void this.activateView());

    // Keep legacy command IDs so existing hotkeys continue to work, but expose only actions that
    // make sense for the current form factor. Phones use the sidepanel as their primary K-Plex
    // surface; tablets can choose between a normal tab and the sidepanel; pop-out windows are
    // desktop-only. Obsidian evaluates checkCallback while building the command palette, so a
    // false result keeps unavailable actions out of the list instead of merely disabling them.
    this.addCommand({
      id: "excalibrain-start",
      name: this.translator("command.openGraph"),
      checkCallback: (checking) => {
        if (!isGraphTabCommandAvailable(readObsidianPresentationEnvironment())) return false;
        if (!checking) void this.activateView();
        return true;
      },
    });
    this.addCommand({ id: "excalibrain-rebuild-index", name: "Rebuild index", callback: () => void this.rebuildIndex(true) });
    this.addCommand({
      id: "kplex-open-popout",
      name: "Open in pop-out window",
      checkCallback: (checking) => {
        if (!isPopoutCommandAvailable(readObsidianPresentationEnvironment())) return false;
        if (!checking) void this.activateViewInPopout();
        return true;
      },
    });
    this.addCommand({ id: "kplex-open-sidepanel", name: "Open in side panel", callback: () => void this.activateSidepanel() });
    this.addCommand({
      id: "kplex-search",
      name: "Search",
      checkCallback: (checking) => {
        const leaf = this.searchTargetLeaf();
        if (!leaf) return false;
        if (!checking) this.requestSearchFocus(leaf);
        return true;
      },
    });
    const addRelationshipCommand = (id: string, name: string, role: GateRole) => this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const origin = this.commandCentralPage();
        if (!origin) return false;
        if (!checking) new NewRelatedNoteModal(this, origin, role).open();
        return true;
      },
    });
    addRelationshipCommand("kplex-add-child", "Add child", "child");
    addRelationshipCommand("kplex-add-parent", "Add parent", "parent");
    addRelationshipCommand("kplex-add-friend", "Add friend", "left");
    addRelationshipCommand("kplex-add-challenger", "Add challenger", "right");
    this.addCommand({
      id: "kplex-sync-tab-from-plex",
      name: "Sync most recent note tab with current node",
      callback: () => {
        const page = this.index.get(this.settings.lastActivePath);
        if (page) void this.syncMostRecentTabWithKplex(page);
      },
    });
    this.addCommand({
      id: "kplex-sync-plex-from-tab",
      name: "Sync current node with most recent note tab",
      callback: () => void this.syncKplexWithMostRecentTab(),
    });
    this.registerOntologyCommands();
    this.addCommand({
      id: "excalibrain-focus-active-note",
      name: "Focus active note",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.focusInBrain(file.path);
        return true;
      }
    });

    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      // During workspace hydration Obsidian can report the first serialized tab as the most
      // recent leaf. Do not let that transient ordering replace the persisted K-Plex/sidecar
      // relationship before startup re-association has completed.
      if (!this.startupInitializing) this.rememberDocumentLeaf(leaf);
      this.validateLinkedDocumentLeaf();
      this.onKplexVisibilityMayHaveChanged();
    }));
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      let changed = false;
      for (const [host, collapsed] of [...this.collapsedPlexHosts.entries()]) {
        if (this.leafIsAttached(host) && this.leafIsAttached(collapsed.sidecarLeaf)) continue;
        this.restoreCollapsedPlex(host);
        changed = true;
      }
      for (const [host, sidecar] of [...this.sidecarLeaves.entries()]) {
        const hostAttached = this.leafIsAttached(host);
        const sidecarAttached = this.leafIsAttached(sidecar);
        if (!hostAttached || !sidecarAttached) {
          this.restoreCollapsedPlex(host);
          this.sidecarLeaves.delete(host);
          if (this.linkedDocumentLeaf === sidecar) {
            this.linkedDocumentLeaf = null;
            this.settings.documentSyncMode = "off";
          }
          // A closing K-Plex view is not the same action as closing its sidecar. Keep the persisted
          // restore intent when only the host disappears, but clear it when the user closes the
          // managed companion leaf itself.
          if (hostAttached && !sidecarAttached && this.settings.sidecarOpen) {
            this.settings.sidecarOpen = false;
          }
          changed = true;
          continue;
        }

        // A managed companion that the user drags away becomes an ordinary document tab. Release
        // ownership and synchronization, but never move or close that user-positioned tab.
        if (!this.collapsedPlexHosts.has(host) && this.adjacentPosition(host, sidecar) === null) {
          // createLeafBySplit/openFile can emit layout-change before the replacement split has a
          // settled DOMRect. During an explicit move, ownership is authoritative until the move
          // completes; otherwise a transient zero-width rect would make K-Plex orphan its own new
          // companion before Obsidian finishes laying it out.
          if (this.sidecarMovingHosts.has(host) || this.startupInitializing) continue;
          this.sidecarLeaves.delete(host);
          if (this.linkedDocumentLeaf === sidecar) {
            this.linkedDocumentLeaf = null;
            this.settings.documentSyncMode = "off";
          }
          this.lastDocumentLeaf = sidecar;
          if (this.settings.sidecarOpen) this.settings.sidecarOpen = false;
          changed = true;
        }
      }
      this.validateLinkedDocumentLeaf();
      if (changed) void this.saveSettings(false, false);
      // Sidecar controls belong only to leaves K-Plex explicitly manages. A separately pinned or
      // adjacent document tab remains ordinary Obsidian content and is never promoted to sidecar UI.
      if (changed || this.sidecarLeaves.size > 0) this.notifySidecar();
      this.onKplexVisibilityMayHaveChanged();
    }));

    if (this.settings.indexUpdateInterval > 0) {
      const interval = Math.max(5000, this.settings.indexUpdateInterval);
      this.registerInterval(window.setInterval(() => {
        // Event-driven dirty tracking is authoritative. The legacy interval may flush a pending
        // backlog while a Plex is open, but it must never make a closed/clean index dirty merely
        // because a minute passed.
        if (this.hasVisibleKplexSurface() && this.indexDirty) void this.rebuildIndex(false, false, "interval");
      }, interval));
    }


    this.app.workspace.onLayoutReady(() => {
      void (async () => {
        if (this.unloading) return;
        if (!alreadyKplex) {
          const legacySettings = this.runningExcaliBrainSettings();
          if (legacySettings) {
            this.settings = migrateAndMergeSettings(legacySettings);
            new Notice(this.translator("notice.excaliBrainSettingsImported"), 2600);
          }
          this.settings.kplexInitialized = true;
          await this.saveData(this.settings);
        }

        if (this.unloading) return;
        this.layoutReady = true;

        // Re-associate a persisted sidecar before normal recent-tab synchronization is allowed to
        // run. This uses only Obsidian's restored workspace geometry/view state; it must not wait
        // for the semantic graph or create a new split.
        if (this.settings.sidecarOpen) {
          const restoredHost = this.app.workspace.getLeavesOfType(EXCALIBRAIN_VIEW_TYPE)[0];
          if (restoredHost) {
            try {
              await this.restorePersistedSidecar(restoredHost);
            } catch (error) {
              console.error("K-Plex sidecar restore failed", error);
            }
          }
        }
        if (this.unloading) return;

        // Keep the startup guard alive for a little longer than the sidecar polling window so
        // trailing file-open/active-leaf events from Obsidian cannot immediately undo the restored
        // relationship. This is intentionally session-only state, never a persisted setting.
        if (this.startupInitializationTimer !== null) window.clearTimeout(this.startupInitializationTimer);
        this.startupInitializationTimer = window.setTimeout(() => {
          this.startupInitializing = false;
          this.startupInitializationTimer = null;
          this.rememberDocumentLeaf(this.linkedDocumentLeaf ?? this.app.workspace.getMostRecentLeaf());
          this.notifySidecar();
        }, 3000);

        // Restore only after Obsidian's workspace/vault layout is ready. Restoring earlier can
        // temporarily hydrate real files as virtual nodes on mobile while the vault tree is still
        // settling, producing the misleading "ghost then real" startup scene.
        const startupSeedPaths = this.startupGraphSeedPaths();
        this.snapshotRestoreTask ??= this.index.restorePersistedSnapshot(startupSeedPaths);
        const restored = await this.snapshotRestoreTask;
        if (this.unloading) return;
        if (restored.restored) {
          await this.refreshBookmarkedEntryPoints();
        }
        if (this.unloading) return;
        this.indexDirty = !restored.fresh;
        if (!restored.fresh) {
          this.indexDirtyRevision += 1;
          this.indexBacklogReasons.add(restored.restored ? "startup:stale-snapshot" : "startup:no-snapshot");
        }

        this.registerReactiveIndexListeners();
        this.registerOntologyContextMenu();
        // Prewarm exactly once per Obsidian session when it is safe to do so. A fresh persisted
        // semantic snapshot makes this effectively free. On iOS, a first-ever large-vault cold
        // scan is deferred until K-Plex is actually opened: repeatedly rebuilding 20k notes in a
        // hidden WebView was responsible for a restart loop on iPad. The per-file IndexedDB body
        // checkpoints still let an interrupted first scan resume instead of starting at file zero.
        const noteCount = this.app.vault.getMarkdownFiles().length;
        const largeIosExpensiveRebuild = Platform.isIosApp && !restored.fresh && !this.index.hasPendingSnapshotHydration() &&
          (!restored.restored || !this.index.hasIncrementalRestorePatch()) && noteCount > 5000;
        if (!largeIosExpensiveRebuild) void this.ensureInitialIndex();
      })();
    });
  }

  private startupGraphSeedPaths(): string[] {
    const paths: string[] = [];
    const active = this.app.workspace.getActiveFile();
    if (active) paths.push(active.path);
    const recentLeaf = this.findRecentDocumentLeaf();
    const recentFile = this.fileForLeaf(recentLeaf);
    if (recentFile) paths.push(recentFile.path);
    if (this.settings.lastActivePath) paths.push(this.settings.lastActivePath);
    // Seed recent graph history too. If the last active node disappeared while Obsidian was
    // closed, the preview can immediately recover the previous valid center instead of waiting
    // for the complete snapshot before discovering a usable fallback.
    paths.push(...this.settings.navigationHistory.slice(-12).reverse());
    paths.push(...this.settings.pinnedNodes);
    return [...new Set(paths.filter(Boolean))];
  }

  /** Resolve a missing center through persisted navigation history before using the vault root. */
  resolveNavigationFallbackPath(preferredPath?: string | null): string | null {
    const seen = new Set<string>();
    const candidates: string[] = [];
    const add = (path?: string | null): void => {
      const candidate = path?.trim();
      if (!candidate || seen.has(candidate)) return;
      seen.add(candidate);
      candidates.push(candidate);
    };

    add(preferredPath);
    add(this.settings.lastActivePath);
    for (let index = this.settings.navigationHistory.length - 1; index >= 0; index -= 1) {
      add(this.settings.navigationHistory[index]);
    }

    for (const path of candidates) {
      if (this.index.get(path)) return path;
    }
    return this.index.get("folder:/")?.path ?? null;
  }

  isNavigationFallbackReady(): boolean {
    return this.initialIndexComplete;
  }

  onunload(): void {
    this.unloading = true;
    this.dismissKplexMenu();
    if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
    if (this.startupInitializationTimer !== null) window.clearTimeout(this.startupInitializationTimer);
    for (const element of [...this.linkedLeafHighlightTimers.keys()]) this.clearLinkedLeafHighlight(element);
    for (const host of [...this.collapsedPlexHosts.keys()]) this.restoreCollapsedPlex(host);
    // A managed sidecar is still an ordinary Obsidian content tab. Plugin unload/disable must not
    // close the user's note; simply release K-Plex ownership and leave workspace leaves intact.
    this.sidecarLeaves.clear();
    this.relationshipFlairListeners.clear();
    this.indexStatusListeners.clear();
    this.kplexVisibilityListeners.clear();
    this.visibleKplexLeaves.clear();
    this.graphLensListeners.clear();
    this.linkedDocumentLeaf = null;
    this.index?.destroy();
  }

  private pruneManagedMetadataWrites(now = Date.now()): void {
    for (const [path, until] of this.managedMetadataWrites) {
      if (until > now) continue;
      this.managedMetadataWrites.delete(path);
    }
    for (const [path, until] of this.managedCreatedPaths) {
      if (until > now) continue;
      this.managedCreatedPaths.delete(path);
    }
    for (const [path, suppression] of this.renameMetadataSuppressions) {
      if (suppression.until > now) continue;
      this.renameMetadataSuppressions.delete(path);
    }
  }

  isManagedCreatedFile(file: TFile): boolean {
    return this.managedCreatedFiles.has(file);
  }

  private rememberManagedCreatedFile(file: TFile): TFile {
    this.managedCreatedFiles.add(file);
    this.managedCreatedPaths.set(file.path, Date.now() + MANAGED_CREATED_PATH_TTL_MS);
    if (this.rebuildTask) {
      // The in-flight builder may have captured the vault before this file existed. Mark a single
      // catch-up rebuild now; the optimistic page keeps the UI usable until that authoritative pass.
      this.scheduleRebuild("kplex:create-during-rebuild");
    }
    return file;
  }

  private pruneMissingDirtyMarkdownPaths(): void {
    const vault = this.app?.vault;
    if (!vault) return;
    for (const path of [...this.dirtyMarkdownPaths]) {
      if (vault.getFileByPath(path)) continue;
      this.dirtyMarkdownPaths.delete(path);
    }
  }

  private settlePatchOnlyBacklogIfIdle(): void {
    this.pruneMissingDirtyMarkdownPaths();
    if (this.dirtyMarkdownPaths.size > 0) return;
    const patchOnly = [...this.indexBacklogReasons].every((reason) =>
      reason === "metadata:changed" || reason === "coalesced-backlog" || reason === "interval",
    );
    if (!patchOnly) return;
    this.indexDirty = false;
    this.indexBacklogReasons.clear();
    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
      this.rebuildTimer = null;
    }
    this.notifyIndexStatus();
  }

  private registerReactiveIndexListeners(): void {
    if (this.reactiveIndexListenersRegistered) return;
    this.reactiveIndexListenersRegistered = true;

    this.registerEvent(this.app.vault.on("create", (created) => {
      this.pruneManagedMetadataWrites();
      if (created instanceof TFile && (this.managedCreatedPaths.get(created.path) ?? 0) > Date.now()) return;
      this.scheduleRebuild("vault:create");
    }));
    this.registerEvent(this.app.vault.on("delete", (deleted) => {
      if (deleted instanceof TFile && deleted.extension === "md") {
        // Deleting Markdown changes materialization, not the identity of the graph endpoint. Keep
        // the same GraphPage alive as a ghost so an active central note does not fall back to the
        // vault root. Only declarations owned by the deleted file are removed locally.
        this.dirtyMarkdownPaths.delete(deleted.path);
        this.managedMetadataWrites.delete(deleted.path);
        this.managedCreatedPaths.delete(deleted.path);
        this.managedCreatedFiles.delete(deleted);
        this.renameMetadataSuppressions.delete(deleted.path);
        this.index?.dematerializeFile(deleted.path);
        // A metadata event may already have queued an incremental patch for this file. Once the
        // file is gone that patch is meaningless; do not let an empty patch backlog escalate into
        // an authoritative full-vault rebuild a moment after dematerialization.
        this.settlePatchOnlyBacklogIfIdle();
        return;
      }
      // Folder and non-Markdown deletions can affect topology/attachment visibility more broadly.
      this.scheduleRebuild("vault:delete");
    }));
    this.registerEvent(this.app.vault.on("rename", (renamed, oldPath) => {
      if (!(renamed instanceof TFile)) {
        // Folder renames can rewrite many canonical file paths at once and remain structural.
        this.scheduleRebuild("vault:rename-folder");
        return;
      }

      const newPath = renamed.path;
      let changed = false;
      if (this.settings.lastActivePath === oldPath) {
        this.settings.lastActivePath = newPath;
        changed = true;
      }
      if (this.settings.sidecarLastFilePath === oldPath) {
        this.settings.sidecarLastFilePath = newPath;
        changed = true;
      }
      const history = this.settings.navigationHistory.map((path) => path === oldPath ? newPath : path);
      if (history.some((path, index) => path !== this.settings.navigationHistory[index])) {
        this.settings.navigationHistory = [...new Set(history)];
        changed = true;
      }
      const pinned = this.settings.pinnedNodes.map((path) => path === oldPath ? newPath : path);
      if (pinned.some((path, index) => path !== this.settings.pinnedNodes[index])) {
        this.settings.pinnedNodes = [...new Set(pinned)];
        changed = true;
      }

      // Preserve a genuinely dirty file across the path change, but a clean rename is not itself a
      // re-index trigger. GraphIndex remaps path-keyed graph/evidence/search state in O(degree).
      if (this.dirtyMarkdownPaths.delete(oldPath)) this.dirtyMarkdownPaths.add(newPath);
      this.index?.renameFile(oldPath, renamed);
      this.renameMetadataSuppressions.set(newPath, {
        mtime: renamed.stat.mtime,
        size: renamed.stat.size,
        until: Date.now() + 5000,
      });
      if (changed) void this.saveSettings(false, false);
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      this.pruneManagedMetadataWrites();
      // MetadataCache can emit one final `changed` notification for a TFile that Vault has already
      // deleted. Treat that event as stale. Re-queuing the vanished path would make the incremental
      // patch report `needs-rebuild` and unnecessarily rebuild the whole graph after deletion.
      if (file.extension === "md" && this.app.vault.getFileByPath(file.path) !== file) {
        this.dirtyMarkdownPaths.delete(file.path);
        this.settlePatchOnlyBacklogIfIdle();
        return;
      }
      const until = this.managedMetadataWrites.get(file.path) ?? 0;
      if (until > Date.now()) return;
      this.managedMetadataWrites.delete(file.path);
      const renameSuppression = this.renameMetadataSuppressions.get(file.path);
      if (renameSuppression && renameSuppression.until > Date.now() &&
          renameSuppression.mtime === file.stat.mtime && renameSuppression.size === file.stat.size) {
        // Obsidian commonly emits metadataCache.changed after a pure rename. The TFile and contents
        // are unchanged, and GraphIndex already remapped the path synchronously above.
        return;
      }
      if (renameSuppression) this.renameMetadataSuppressions.delete(file.path);
      if (file.extension === "md") {
        this.dirtyMarkdownPaths.add(file.path);
      }
      // A file created by K-Plex is already present optimistically, but normal metadata changes are
      // still allowed through the incremental patch path. This reconciles aliases/body fields and
      // plugin-generated content without waiting for, or triggering, a whole-vault rebuild.
      this.scheduleRebuild("metadata:changed");
    }));
    // metadataCache.resolved fires in large waves during startup and after a single link edit.
    // `changed`, vault create/delete/rename and explicit K-Plex edits already cover semantic
    // invalidation without turning one relationship move into a whole-vault rebuild storm.
  }

  private async waitForMetadataCacheStability(): Promise<number> {
    const started = perfNow();
    const markdownFiles = this.app.vault.getMarkdownFiles().length;
    if (markdownFiles === 0) {
      return 0;
    }

    // `resolvedLinks` is public API and, after the initial metadata pass, normally contains an
    // entry for essentially every Markdown source. Do not require exactly 100% because plugins,
    // ignored files, and timing differences can make the counts differ slightly. We additionally
    // require the count to stay unchanged for a short quiet window.
    const maxWaitMs = 4000;
    const quietWindowMs = 350;
    const pollMs = 100;
    const minimumCoverage = 0.95;
    let lastCount = Object.keys(this.app.metadataCache.resolvedLinks).length;
    let stableSince = perfNow();

    while (perfNow() - started < maxWaitMs) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, pollMs));
      const now = perfNow();
      const count = Object.keys(this.app.metadataCache.resolvedLinks).length;
      if (count !== lastCount) {
        lastCount = count;
        stableSince = now;
      }
      const coverage = markdownFiles > 0 ? count / markdownFiles : 1;
      if (coverage >= minimumCoverage && now - stableSince >= quietWindowMs) {
        break;
      }
    }

    return lastCount;
  }

  private runtimePatchDelayMs(reason: string): number {
    if (reason !== "metadata:changed" && reason !== "coalesced-backlog" && reason !== "interval") return 1100;
    let maxDirtyBytes = 0;
    for (const path of this.dirtyMarkdownPaths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) maxDirtyBytes = Math.max(maxDirtyBytes, file.stat.size ?? 0);
    }
    // Large Excalidraw Markdown files can be megabytes even when only a tiny semantic fragment is
    // relevant to K-Plex. Give bursts of autosaves a slightly longer quiet window so we parse the
    // final state once instead of repeatedly cloning/scanning a large drawing payload.
    const delayMs = maxDirtyBytes >= 1024 * 1024 ? 2400
      : maxDirtyBytes >= 512 * 1024 ? 1800
        : maxDirtyBytes >= 128 * 1024 ? 1400
          : 1100;
    return delayMs;
  }

  private scheduleRebuild(reason = "unknown"): void {
    this.indexDirty = true;
    this.indexDirtyRevision += 1;
    this.indexBacklogReasons.add(reason);
    this.notifyIndexStatus();
    if (!this.hasVisibleKplexSurface() || !this.initialIndexComplete || this.rebuildTask) return;
    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
    }
    const delayMs = this.runtimePatchDelayMs(reason);
    this.rebuildTimer = window.setTimeout(() => {
      this.rebuildTimer = null;
      void this.rebuildIndex(false, false, reason);
    }, delayMs);
  }

  async onKplexViewOpened(hostLeaf?: WorkspaceLeaf): Promise<void> {
    this.openKplexViews += 1;
    if (!this.layoutReady) return;
    await this.ensureIndexReady("view-open");
    if (hostLeaf) await this.restorePersistedSidecar(hostLeaf);
  }

  onKplexViewClosed(hostLeaf?: WorkspaceLeaf): void {
    if (hostLeaf) void this.releaseSidecar(hostLeaf, true, true);
    this.openKplexViews = Math.max(0, this.openKplexViews - 1);
    if (this.openKplexViews > 0) return;
    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
      this.rebuildTimer = null;
    }
    // Desktop/Android may finish the once-per-session prewarm in the background. On iOS a large
    // first-ever build is intentionally demand-driven: if the user closes the last Plex, cancel
    // the in-memory graph build immediately. Parsed-body IndexedDB checkpoints already completed
    // remain useful, so reopening resumes with less work instead of keeping a hidden iPad WebView
    // under memory pressure.
    if (this.initialIndexComplete || Platform.isIosApp) this.index.cancelRebuild();
    this.index.cancelPendingPersistence();
  }

  private async ensureInitialIndex(): Promise<void> {
    if (this.unloading) return;
    if (this.initialIndexTask) {
      return this.initialIndexTask;
    }
    this.initialIndexTask = (async () => {
      if (!this.layoutReady) {
        return;
      }

      // A preview neighborhood can already be on screen while the complete persisted graph is
      // still hydrating. Keep the UI usable, but do not declare the authoritative index ready
      // (or allow persistence/reconciliation against the preview) until that background restore
      // finishes. View rendering itself does not await this task.
      if (this.index.hasPendingSnapshotHydration()) {
        const hydrated = await this.index.waitForSnapshotHydration();
        if (this.unloading) return;
        if (!hydrated.restored) {
          this.indexDirty = true;
          this.indexDirtyRevision += 1;
          this.indexBacklogReasons.add("startup:partial-restore-incomplete");
        } else {
          await this.refreshBookmarkedEntryPoints();
          if (this.unloading) return;
          if (!hydrated.fresh) {
            this.indexDirty = true;
            this.indexBacklogReasons.add("startup:stale-snapshot");
          }
        }
      } else if (this.index.size > 0 && !this.index.isFullSnapshotHydrated()) {
        // The preview task failed after it had already returned a usable partial scene. Fall back
        // to a normal rebuild instead of ever treating that partial scene as the complete index.
        this.indexDirty = true;
        this.indexDirtyRevision += 1;
        this.indexBacklogReasons.add("startup:partial-restore-incomplete");
      }

      // A fresh, fully hydrated semantic snapshot is already the initial index. Do not make mobile
      // users wait for MetadataCache's startup quiet window when there is literally nothing to
      // reconcile. Reactive listeners will mark the snapshot dirty if a real change arrives.
      if (!this.indexDirty && this.index.size > 0 && this.index.isFullSnapshotHydrated()) {
        this.initialIndexComplete = true;
        this.notifyIndexStatus();
        return;
      }
      if (!this.metadataStabilized) {
        this.metadataStabilityPromise ??= this.waitForMetadataCacheStability();
        await this.metadataStabilityPromise;
        if (this.unloading) return;
        this.metadataStabilized = true;
      }

      // Warm startup: a semantic IndexedDB snapshot already contains the entire graph. When the
      // physical vault structure is unchanged, patch only Markdown files whose mtimes differ from
      // the snapshot instead of reparsing/re-resolving every note. This is the common case after
      // editing a few notes between Obsidian sessions and is especially important for 20k+ vaults.
      if (this.indexDirty && this.index.size > 0 && this.index.hasIncrementalRestorePatch()) {
        const patchRevision = this.indexDirtyRevision;
        const patched = await this.index.reconcileRestoredSnapshot();
        if (this.unloading) return;
        if (patched.reconciled && patchRevision === this.indexDirtyRevision) {
          this.indexDirty = false;
          this.indexBacklogReasons.clear();
          this.initialIndexComplete = true;
          this.notifyIndexStatus();
          return;
        }
      }
      // Give iOS one paint/GC opportunity after Obsidian's own startup metadata wave before
      // allocating a second graph snapshot. This is deliberately small; it is not a polling loop.
      if (Platform.isIosApp) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
      }

      if (this.unloading) return;

      // Large iOS cold start: prime parsed Markdown bodies in small transactional IndexedDB
      // checkpoints before allocating the complete semantic graph. The previous architecture read
      // ~12k files while retaining the growing graph and could push WebKit over its memory limit
      // near the end of the pass. Prewarming keeps that phase low-memory, survives interruption,
      // and makes the subsequent authoritative GraphBuilder run almost entirely durable-cache hits.
      const noteCount = this.app.vault.getMarkdownFiles().length;
      const needsIosBodyPrewarm = Platform.isIosApp && this.index.size === 0 && noteCount > 5000;
      if (needsIosBodyPrewarm) {
        const warmed = await this.index.prewarmBodyCache(() => !this.unloading && this.hasVisibleKplexSurface());
        if (this.unloading) return;
        if (!warmed && !this.hasVisibleKplexSurface()) {
          return;
        }
      }

      if (this.indexDirty || this.index.size === 0) {
        await this.performRebuild(false, this.index.size === 0, "startup:initial-index", true);
      }
      if (this.unloading) return;
      this.initialIndexComplete = this.index.size > 0;
      this.notifyIndexStatus();

      // Changes that arrived while the initial build was running are coalesced. Only reconcile
      // them immediately when the user currently has a Plex open; otherwise keep the backlog.
      if (this.indexDirty && this.hasVisibleKplexSurface()) this.scheduleRebuild("startup:post-initial-backlog");
    })().finally(() => {
      // Keep the resolved promise only after a complete initial index. If iOS work was cancelled
      // because the last K-Plex view closed, reopening must be able to resume the durable prewarm.
      if (!this.initialIndexComplete) this.initialIndexTask = null;
    });
    return this.initialIndexTask;
  }

  async ensureIndexReady(reason = "view-open"): Promise<void> {
    if (!this.layoutReady) return;
    await this.ensureInitialIndex();
    if (this.unloading) return;
    await this.rebuildIndex(false, this.index.size === 0, reason);
  }

  async rebuildIndex(showNotice = false, force = false, reason = "direct"): Promise<void> {
    await this.performRebuild(showNotice, force, reason, false);
  }

  private async performRebuild(showNotice: boolean, force: boolean, reason: string, allowClosed: boolean): Promise<void> {
    if (this.unloading) return;
    const explicitlyRequested = showNotice;
    if (!this.hasVisibleKplexSurface() && !allowClosed && !explicitlyRequested) {
      return;
    }

    if (this.rebuildTask) {
      // Do not invalidate an in-flight graph. Metadata events already mark indexDirty and will be
      // folded into one follow-up rebuild when the current snapshot has published.
      await this.rebuildTask;
      return;
    }

    const shouldSkip = !force && !showNotice && !this.indexDirty && this.index.size > 0;
    if (shouldSkip) {
      return;
    }

    if (force || showNotice) {
      this.indexDirty = true;
      this.indexDirtyRevision += 1;
      this.indexBacklogReasons.add(reason);
      this.notifyIndexStatus();
    }
    const startRevision = this.indexDirtyRevision;

    const task = (async () => {
      // Ordinary edits are file-owned evidence changes. Patch those files directly rather than
      // rebuilding the vault. A path may disappear after its metadata notification was queued;
      // prune such paths before deciding whether an incremental patch must escalate.
      this.pruneMissingDirtyMarkdownPaths();
      const structuralDirty = [...this.indexBacklogReasons].some((item) => item !== "metadata:changed" && item !== "coalesced-backlog" && item !== "interval");
      if (!force && !showNotice && !structuralDirty && this.dirtyMarkdownPaths.size === 0) {
        this.indexDirty = false;
        this.indexBacklogReasons.clear();
        this.notifyIndexStatus();
        return;
      }
      const canIncrementalPatch = !force && !showNotice && this.index.size > 0 && !structuralDirty &&
        this.dirtyMarkdownPaths.size > 0;
      if (canIncrementalPatch) {
        const paths = [...this.dirtyMarkdownPaths];
        const result = await this.index.patchMarkdownPaths(paths);
        if (this.unloading) return;
        if (result.outcome === "patched") {
          if (this.indexDirtyRevision === startRevision) {
            for (const path of paths) this.dirtyMarkdownPaths.delete(path);
          } else {
            // A metadata event arrived while the patch was running. Keep the original paths in the
            // backlog too: the same file may have changed again. Deleting them here previously left
            // indexDirty=true with zero paths, which forced an unnecessary full-vault rebuild.
          }
          if (this.indexDirtyRevision === startRevision && this.dirtyMarkdownPaths.size === 0) {
            this.indexDirty = false;
            this.indexBacklogReasons.clear();
          }
          await this.refreshBookmarkedEntryPoints();
          return;
        }
        if (result.outcome === "cancelled") {
          // Cancellation/supersession is not evidence that the semantic graph needs a full scan.
          // If no newer metadata event arrived, retain only files that did not reach the per-file
          // commit boundary; already-published files need not be reparsed when the view reopens.
          // A concurrent metadata event wins: keep the conservative backlog because a committed
          // file may already have changed again.
          if (this.indexDirtyRevision === startRevision) {
            for (const path of paths) this.dirtyMarkdownPaths.delete(path);
            for (const path of result.pendingPaths) this.dirtyMarkdownPaths.add(path);
            if (result.pendingPaths.length === 0) {
              this.indexDirty = false;
              this.indexBacklogReasons.clear();
            } else {
              this.indexDirty = true;
            }
          } else {
            this.indexDirty = true;
          }
          return;
        }
        // Only a structural/unsupported patch result may fall through to the authoritative builder.
      }
      // Awaited patch/read work may have outlived the last visible Plex. Never turn that cancellation
      // into a hidden full-vault rebuild. Explicit user rebuilds and startup allowClosed work remain
      // separate from this demand-driven guard.
      if (!this.hasVisibleKplexSurface() && !allowClosed && !explicitlyRequested) {
        this.indexDirty = true;
        return;
      }
      if (showNotice) new Notice("Rebuilding K-Plex index…", 1200);
      const published = await this.index.rebuild();
      if (this.unloading) return;
      if (!published) {
        this.indexDirty = true;
        this.indexBacklogReasons.add(reason);
        return;
      }

      // Only clear the backlog that this build actually covered. If a vault/metadata event fired
      // while GraphBuilder was working, keep the index dirty and coalesce one follow-up pass.
      if (this.indexDirtyRevision === startRevision) {
        this.indexDirty = false;
        this.indexBacklogReasons.clear();
        this.dirtyMarkdownPaths.clear();
      } else {
        this.indexDirty = true;
      }
      await this.refreshBookmarkedEntryPoints();
      if (showNotice) new Notice(this.translator("notice.indexedNodes", { count: this.index.size }), 1800);
    })();
    this.rebuildTask = task;
    this.notifyIndexStatus();
    try {
      await task;
    } finally {
      if (this.rebuildTask === task) this.rebuildTask = null;
      this.notifyIndexStatus();
    }


    if (!this.unloading && this.indexDirty && this.initialIndexComplete && this.hasVisibleKplexSurface() && this.rebuildTimer === null) {
      this.rebuildTimer = window.setTimeout(() => {
        this.rebuildTimer = null;
        void this.rebuildIndex(false, false, "coalesced-backlog");
      }, 1100);
    }
  }

  private commandCentralPage(): GraphPage | null {
    if (this.openKplexViews <= 0) return null;
    const page = this.index.get(this.settings.lastActivePath);
    if (!page || page.isFolder || page.isTag) return null;
    return page;
  }

  async saveSettings(reindex = false, notifyIndex = true): Promise<void> {
    this.settings.primaryTagFieldLowerCase = this.settings.primaryTagField.toLowerCase().replaceAll(" ", "-");
    await this.saveData(this.settings);
    if (reindex) this.scheduleRebuild("settings");
    else if (notifyIndex) this.index.notify();
  }

  private isDocumentLeafCandidate(leaf: WorkspaceLeaf | null): leaf is WorkspaceLeaf {
    if (!leaf || this.isManagedSidecarLeaf(leaf)) return false;
    const viewState = leaf.getViewState();
    if (viewState.type === EXCALIBRAIN_VIEW_TYPE || viewState.type === KPLEX_SIDEPANEL_VIEW_TYPE) return false;
    if (viewState.type === "empty" || leaf.view instanceof FileView) return true;

    // Background tabs can be DeferredView instances. Inspect serialized view state instead
    // of assuming leaf.view is already a FileView (Obsidian 1.7.2+ deferred views).
    const state = viewState.state as { file?: unknown } | undefined;
    return typeof state?.file === "string";
  }

  private leafIsAttached(leaf: WorkspaceLeaf): boolean {
    let attached = false;
    this.app.workspace.iterateAllLeaves((candidate) => {
      if (candidate === leaf) attached = true;
    });
    return attached;
  }

  private leafGroupElement(leaf: WorkspaceLeaf | null): HTMLElement | null {
    if (!leaf) return null;
    const workspaceLeaf = leaf as WorkspaceLeaf & {
      containerEl?: HTMLElement;
      parent?: { containerEl?: HTMLElement } | null;
    };
    return workspaceLeaf.parent?.containerEl ?? workspaceLeaf.containerEl ?? leaf.view?.containerEl ?? null;
  }

  /** Capture the exact workspace rectangle currently owned by K-Plex plus its managed sidecar.
   * The individual host/sidecar ratio is retained so a left/right pair can move above/below (or
   * vice versa) without donating part of its combined footprint to an unrelated third pane. */
  private sidecarFootprint(hostLeaf: WorkspaceLeaf, sidecarLeaf: WorkspaceLeaf): SidecarFootprint | null {
    const hostGroup = this.leafGroupElement(hostLeaf);
    const sidecarGroup = this.leafGroupElement(sidecarLeaf);
    if (!hostGroup || !sidecarGroup || hostGroup.ownerDocument !== sidecarGroup.ownerDocument) return null;
    const host = hostGroup.getBoundingClientRect();
    const sidecar = sidecarGroup.getBoundingClientRect();
    if (host.width <= 8 || host.height <= 8 || sidecar.width <= 8 || sidecar.height <= 8) return null;
    const position = this.adjacentPosition(hostLeaf, sidecarLeaf);
    if (!position) return null;
    const horizontalPair = position === "left" || position === "right";
    const hostExtent = horizontalPair ? host.width : host.height;
    const sidecarExtent = horizontalPair ? sidecar.width : sidecar.height;
    const totalExtent = hostExtent + sidecarExtent;
    return {
      width: Math.max(host.right, sidecar.right) - Math.min(host.left, sidecar.left),
      height: Math.max(host.bottom, sidecar.bottom) - Math.min(host.top, sidecar.top),
      hostShare: totalExtent > 0 ? Math.max(0.1, Math.min(0.9, hostExtent / totalExtent)) : 0.5,
      ownerDocument: hostGroup.ownerDocument,
    };
  }

  private commonElementAncestor(a: HTMLElement, b: HTMLElement): HTMLElement | null {
    const ancestors = new Set<HTMLElement>();
    for (let current: HTMLElement | null = a; current; current = current.parentElement) ancestors.add(current);
    for (let current: HTMLElement | null = b; current; current = current.parentElement) {
      if (ancestors.has(current)) return current;
    }
    return null;
  }

  private splitAxis(element: HTMLElement): "width" | "height" | null {
    if (!element.classList.contains("workspace-split")) return null;
    const view = element.ownerDocument.defaultView ?? window;
    const direction = view.getComputedStyle(element).flexDirection;
    if (direction === "row" || direction === "row-reverse") return "width";
    if (direction === "column" || direction === "column-reverse") return "height";
    return null;
  }

  private visibleWorkspaceChildren(parent: HTMLElement): HTMLElement[] {
    const view = parent.ownerDocument.defaultView ?? window;
    return Array.from(parent.children)
      .map((child) => child as HTMLElement)
      .filter((child) => {
        if (!child.classList.contains("workspace-tabs") && !child.classList.contains("workspace-split")) return false;
        const style = view.getComputedStyle(child);
        const rect = child.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 8 && rect.height > 8;
      });
  }

  private directChildContaining(parent: HTMLElement, descendant: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = descendant;
    while (current && current.parentElement && current.parentElement !== parent) current = current.parentElement;
    return current?.parentElement === parent ? current : null;
  }

  private setWorkspaceBasis(element: HTMLElement, pixels: number): void {
    if (!Number.isFinite(pixels) || pixels <= 8) return;
    // Dynamic split geometry is still expressed through Obsidian's DOM helper rather than direct
    // style mutation so this remains CodeScanner-friendly.
    element.setCssStyles({ flexBasis: `${Math.max(8, Math.round(pixels))}px` });
  }

  private rebalanceWorkspaceSplit(
    split: HTMLElement,
    primary: Array<{ element: HTMLElement; pixels: number }>,
  ): void {
    const axis = this.splitAxis(split);
    if (!axis) return;
    const children = this.visibleWorkspaceChildren(split);
    const primaryElements = new Set(primary.map(({ element }) => element));
    if (primary.some(({ element }) => !children.includes(element))) return;
    const size = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return axis === "width" ? rect.width : rect.height;
    };
    const total = children.reduce((sum, child) => sum + size(child), 0);
    if (total <= 16) return;
    const peers = children.filter((child) => !primaryElements.has(child));
    const minimumPeerTotal = peers.length * 48;
    const requestedPrimary = primary.reduce((sum, item) => sum + item.pixels, 0);
    const primaryTotal = Math.max(48 * primary.length, Math.min(requestedPrimary, total - minimumPeerTotal));
    const requestScale = requestedPrimary > 0 ? primaryTotal / requestedPrimary : 1;
    for (const item of primary) this.setWorkspaceBasis(item.element, item.pixels * requestScale);

    if (!peers.length) return;
    const remaining = Math.max(minimumPeerTotal, total - primaryTotal);
    const currentPeerTotal = peers.reduce((sum, peer) => sum + size(peer), 0);
    for (const peer of peers) {
      const share = currentPeerTotal > 0 ? size(peer) / currentPeerTotal : 1 / peers.length;
      this.setWorkspaceBasis(peer, remaining * share);
    }
  }

  /** Re-establish the pre-move K-Plex+sidecar bounding rectangle using only the workspace branches
   * that participate in the move. Unlike the earlier workaround, this does not repeatedly rebalance
   * arbitrary ancestors: it freezes current peer sizes once and restores the pair's own allocation. */
  private applySidecarFootprint(hostLeaf: WorkspaceLeaf, sidecarLeaf: WorkspaceLeaf, footprint: SidecarFootprint): void {
    const hostGroup = this.leafGroupElement(hostLeaf);
    const sidecarGroup = this.leafGroupElement(sidecarLeaf);
    if (!hostGroup || !sidecarGroup || hostGroup.ownerDocument !== footprint.ownerDocument || sidecarGroup.ownerDocument !== footprint.ownerDocument) return;

    let common = this.commonElementAncestor(hostGroup, sidecarGroup);
    while (common && !common.classList.contains("workspace-split")) common = common.parentElement;
    if (!common) return;

    const hostBranch = this.directChildContaining(common, hostGroup);
    const sidecarBranch = this.directChildContaining(common, sidecarGroup);
    const axis = this.splitAxis(common);
    if (!hostBranch || !sidecarBranch || hostBranch === sidecarBranch || !axis) return;

    const children = this.visibleWorkspaceChildren(common);
    const pairIsWholeSplit = children.length === 2 && children.includes(hostBranch) && children.includes(sidecarBranch);
    const targetPairExtent = axis === "width" ? footprint.width : footprint.height;
    const currentPairExtent = (() => {
      const a = hostBranch.getBoundingClientRect();
      const b = sidecarBranch.getBoundingClientRect();
      return axis === "width" ? a.width + b.width : a.height + b.height;
    })();

    // Keep the host/sidecar split ratio stable. If the pair shares this split with unrelated panes,
    // restore the exact old pair extent and give the remaining pixels back to those peers in their
    // current proportions. Making all flex bases sum to the settled split extent avoids flex-grow
    // immediately undoing the correction.
    const ratioExtent = pairIsWholeSplit ? currentPairExtent : targetPairExtent;
    this.rebalanceWorkspaceSplit(common, [
      { element: hostBranch, pixels: ratioExtent * footprint.hostShare },
      { element: sidecarBranch, pixels: ratioExtent * (1 - footprint.hostShare) },
    ]);
    if (!pairIsWholeSplit) return;

    // A dedicated pair split may itself compete with an unrelated third pane higher in the tree.
    // Restore the pair branch against each outer split axis, which preserves the old bounding box
    // even when the sidecar changes from left/right to above/below.
    let branch: HTMLElement = common;
    for (let parent = branch.parentElement; parent; branch = parent, parent = parent.parentElement) {
      if (!parent.classList.contains("workspace-split")) continue;
      const parentAxis = this.splitAxis(parent);
      if (!parentAxis) continue;
      const directBranch = this.directChildContaining(parent, branch);
      if (!directBranch) continue;
      const peers = this.visibleWorkspaceChildren(parent);
      if (!peers.includes(directBranch) || peers.length < 2) continue;
      const desired = parentAxis === "width" ? footprint.width : footprint.height;
      this.rebalanceWorkspaceSplit(parent, [{ element: directBranch, pixels: desired }]);
      break;
    }
  }

  private async waitForWorkspaceLayout(hostLeaf: WorkspaceLeaf, frames = 2): Promise<void> {
    const hostGroup = this.leafGroupElement(hostLeaf);
    const viewWindow = hostGroup?.ownerDocument.defaultView ?? window;
    for (let i = 0; i < frames; i += 1) {
      await new Promise<void>((resolve) => viewWindow.requestAnimationFrame(() => resolve()));
    }
  }

  private async restoreSidecarFootprint(hostLeaf: WorkspaceLeaf, sidecarLeaf: WorkspaceLeaf, footprint: SidecarFootprint): Promise<void> {
    // Obsidian may collapse/reparent a now-single-child split one frame after detach. Re-apply after
    // each of two settle points, but do not create a resize loop or touch the workspace afterward.
    await this.waitForWorkspaceLayout(hostLeaf, 2);
    this.applySidecarFootprint(hostLeaf, sidecarLeaf, footprint);
    await this.waitForWorkspaceLayout(hostLeaf, 2);
    this.applySidecarFootprint(hostLeaf, sidecarLeaf, footprint);
  }

  private restoreCollapsedPlex(hostLeaf: WorkspaceLeaf): void {
    const collapsed = this.collapsedPlexHosts.get(hostLeaf);
    if (!collapsed) return;
    collapsed.unfoldButton.remove();
    if (collapsed.hostGroup.isConnected) {
      collapsed.hostGroup.setCssStyles({ display: "" });
    }
    this.collapsedPlexHosts.delete(hostLeaf);
  }

  isPlexFoldedForSidecar(hostLeaf: WorkspaceLeaf): boolean {
    return this.collapsedPlexHosts.has(hostLeaf);
  }

  async collapsePlexForSidecar(hostLeaf: WorkspaceLeaf): Promise<void> {
    if (this.collapsedPlexHosts.has(hostLeaf)) return;
    const position = this.getSidecarPosition(hostLeaf);
    const sidecarLeaf = this.validateSidecarLeaf(hostLeaf);
    if (!position || !sidecarLeaf) return;
    const hostGroup = this.leafGroupElement(hostLeaf);
    const sidecarGroup = this.leafGroupElement(sidecarLeaf);
    if (!hostGroup || !sidecarGroup || hostGroup === sidecarGroup) return;

    const button = sidecarGroup.createEl("button");
    button.type = "button";
    const unfoldSide = position === "right" ? "left" : position === "left" ? "right" : position === "above" ? "bottom" : "top";
    const unfoldIcon = unfoldSide === "left" ? "panel-left-open"
      : unfoldSide === "right" ? "panel-right-open"
        : unfoldSide === "top" ? "panel-top-open"
          : "panel-bottom-open";
    button.className = `kplex-sidecar-unfold-plex is-${unfoldSide}`;
    button.setAttribute("aria-label", "Unfold K-Plex");
    setIcon(button, unfoldIcon);
    button.addEventListener("click", () => void this.expandPlexFromSidecar(hostLeaf));
    sidecarGroup.appendChild(button);

    this.collapsedPlexHosts.set(hostLeaf, {
      sidecarLeaf,
      position,
      hostGroup,
      unfoldButton: button,
    });
    // Hiding the WorkspaceTabs group removes it from the split's flex layout completely; the
    // native content sidecar expands into the released space while remaining an ordinary tab.
    hostGroup.setCssStyles({ display: "none" });
    this.notifySidecar();
  }

  async expandPlexFromSidecar(hostLeaf: WorkspaceLeaf): Promise<void> {
    if (!this.collapsedPlexHosts.has(hostLeaf)) return;
    const hostGroup = this.leafGroupElement(hostLeaf);
    const viewWindow = hostGroup?.ownerDocument.defaultView ?? window;
    this.restoreCollapsedPlex(hostLeaf);
    // Let Obsidian's split layout settle before recalculating sidecar geometry.
    await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, 0));
    this.notifySidecar();
  }

  private leafRect(leaf: WorkspaceLeaf | null): DOMRect | null {
    if (!leaf) return null;
    // ItemView.containerEl excludes the tab header. That is harmless for left/right splits, but
    // for an above/below split it creates a ~tab-height gap between the two measured rectangles,
    // so a genuinely adjacent pane was misclassified as non-adjacent and its sidecar controls
    // disappeared. Prefer the containing workspace tab-group chrome when available; fall back to
    // the leaf/view containers for compatibility with non-standard views and older Obsidian builds.
    const workspaceLeaf = leaf as WorkspaceLeaf & {
      containerEl?: HTMLElement;
      parent?: { containerEl?: HTMLElement } | null;
    };
    const candidates = [workspaceLeaf.parent?.containerEl, workspaceLeaf.containerEl, leaf.view?.containerEl];
    for (const element of candidates) {
      if (!element?.isConnected) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width > 8 && rect.height > 8) return rect;
    }
    return null;
  }

  private leafIsVisible(leaf: WorkspaceLeaf | null): boolean {
    if (!leaf) return false;
    // Do not use leafRect() here: that helper intentionally falls back to the containing tab-group
    // chrome for sidecar geometry, but a hidden tab shares the same visible tab-group rectangle.
    // Demand gating must inspect the leaf/view surface itself so background tabs remain dormant.
    const workspaceLeaf = leaf as WorkspaceLeaf & { containerEl?: HTMLElement };
    for (const element of [workspaceLeaf.containerEl, leaf.view?.containerEl]) {
      if (!element?.isConnected) continue;
      const view = element.ownerDocument.defaultView ?? window;
      const style = view.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = element.getBoundingClientRect();
      if (rect.width > 8 && rect.height > 8) return true;
    }
    return false;
  }

  isKplexLeafVisible(leaf: WorkspaceLeaf | null): boolean {
    return this.isKplexLeaf(leaf) && this.leafIsVisible(leaf);
  }

  private hasVisibleKplexSurface(): boolean {
    return this.currentVisibleKplexLeaves().size > 0;
  }

  private currentVisibleKplexLeaves(): Set<WorkspaceLeaf> {
    return new Set([
      ...this.app.workspace.getLeavesOfType(EXCALIBRAIN_VIEW_TYPE),
      ...this.app.workspace.getLeavesOfType(KPLEX_SIDEPANEL_VIEW_TYPE),
    ].filter((leaf) => this.leafIsVisible(leaf)));
  }

  subscribeKplexVisibility(listener: () => void): () => void {
    this.kplexVisibilityListeners.add(listener);
    return () => this.kplexVisibilityListeners.delete(listener);
  }

  private onKplexVisibilityMayHaveChanged(): void {
    if (!this.layoutReady) return;
    const nextVisible = this.currentVisibleKplexLeaves();
    const visibilityChanged = nextVisible.size !== this.visibleKplexLeaves.size ||
      [...nextVisible].some((leaf) => !this.visibleKplexLeaves.has(leaf));
    this.visibleKplexLeaves = nextVisible;
    if (visibilityChanged) {
      for (const listener of this.kplexVisibilityListeners) listener();
    }
    if (nextVisible.size > 0) {
      if (this.indexDirty || !this.initialIndexComplete) void this.ensureIndexReady("view-visible");
      return;
    }
    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
      this.rebuildTimer = null;
      this.notifyIndexStatus();
    }
    // Preserve the once-per-session desktop/Android startup policy, but once an authoritative
    // index exists there is no reason to keep an automatic edit patch running for a hidden tab.
    if (this.initialIndexComplete || Platform.isIosApp) this.index.cancelRebuild();
    this.index.cancelPendingPersistence();
  }

  private leafViewIsLoaded(leaf: WorkspaceLeaf | null): boolean {
    if (!leaf) return false;
    const view = leaf.view as LoadAwareView;
    if (typeof view?._loaded === "boolean") return view._loaded;
    // `_loaded` is an intentionally isolated compatibility hint for Deferred/FileView startup.
    // Public signals remain the primary criteria, so views without that private property work too.
    return leaf.view instanceof FileView ? Boolean(leaf.view.file) : this.leafIsVisible(leaf);
  }

  private adjacentPosition(hostLeaf: WorkspaceLeaf, otherLeaf: WorkspaceLeaf): SidecarPosition | null {
    if (hostLeaf === otherLeaf) return null;
    // DOMRect coordinates are local to a window. A pinned tab moved to a pop-out must therefore
    // never be considered geometrically adjacent just because its separate window happens to use
    // similar viewport coordinates.
    const hostDocument = hostLeaf.view?.containerEl?.ownerDocument;
    const otherDocument = otherLeaf.view?.containerEl?.ownerDocument;
    if (hostDocument && otherDocument && hostDocument !== otherDocument) return null;
    const host = this.leafRect(hostLeaf);
    const other = this.leafRect(otherLeaf);
    if (!host || !other) return null;
    const tolerance = 24;
    const minOverlap = 32;
    const verticalOverlap = Math.min(host.bottom, other.bottom) - Math.max(host.top, other.top);
    const horizontalOverlap = Math.min(host.right, other.right) - Math.max(host.left, other.left);
    if (verticalOverlap >= minOverlap) {
      if (Math.abs(other.right - host.left) <= tolerance) return "left";
      if (Math.abs(other.left - host.right) <= tolerance) return "right";
    }
    if (horizontalOverlap >= minOverlap) {
      if (Math.abs(other.bottom - host.top) <= tolerance) return "above";
      if (Math.abs(other.top - host.bottom) <= tolerance) return "below";
    }
    return null;
  }

  private rememberDocumentLeaf(leaf: WorkspaceLeaf | null): void {
    if (this.isDocumentLeafCandidate(leaf) && this.leafIsVisible(leaf)) this.lastDocumentLeaf = leaf;
  }

  private validateLinkedDocumentLeaf(): void {
    if (this.linkedDocumentLeaf && !this.leafIsAttached(this.linkedDocumentLeaf)) this.linkedDocumentLeaf = null;
    if (this.lastDocumentLeaf && !this.leafIsAttached(this.lastDocumentLeaf)) this.lastDocumentLeaf = null;
  }

  private findRecentDocumentLeaf(): WorkspaceLeaf | null {
    this.validateLinkedDocumentLeaf();
    if (this.isDocumentLeafCandidate(this.lastDocumentLeaf) && this.leafIsVisible(this.lastDocumentLeaf)) return this.lastDocumentLeaf;

    const recent = this.app.workspace.getMostRecentLeaf();
    if (this.isDocumentLeafCandidate(recent) && this.leafIsVisible(recent) && this.leafViewIsLoaded(recent)) {
      this.lastDocumentLeaf = recent;
      return recent;
    }

    // At workspace startup Obsidian can report the first serialized tab as "most recent" while it
    // is still a deferred, hidden view. Prefer a visible/materialized document tab instead.
    let candidate: WorkspaceLeaf | null = null;
    let bestScore = -1;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!this.isDocumentLeafCandidate(leaf) || !this.leafIsVisible(leaf)) return;
      const score = (this.leafViewIsLoaded(leaf) ? 10 : 0) + (leaf === recent ? 2 : 0);
      if (score > bestScore) { candidate = leaf; bestScore = score; }
    });
    if (candidate) {
      this.lastDocumentLeaf = candidate;
      return candidate;
    }

    // Last-resort fallback for workspaces with no currently visible document tab.
    if (this.isDocumentLeafCandidate(recent)) return recent;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!candidate && this.isDocumentLeafCandidate(leaf)) candidate = leaf;
    });
    if (candidate) this.lastDocumentLeaf = candidate;
    return candidate;
  }

  private fileForLeaf(leaf: WorkspaceLeaf | null): TFile | null {
    if (!leaf) return null;
    if (leaf.view instanceof FileView && leaf.view.file) return leaf.view.file;

    const state = leaf.getViewState().state as { file?: unknown } | undefined;
    if (typeof state?.file !== "string") return null;
    const abstractFile = this.app.vault.getAbstractFileByPath(state.file);
    return abstractFile instanceof TFile ? abstractFile : null;
  }

  isDocumentLeafLinked(): boolean {
    this.validateLinkedDocumentLeaf();
    return this.linkedDocumentLeaf !== null;
  }

  getLinkedDocumentFile(): TFile | null {
    this.validateLinkedDocumentLeaf();
    return this.fileForLeaf(this.linkedDocumentLeaf);
  }

  getLinkedDocumentLeafLabel(): string | null {
    this.validateLinkedDocumentLeaf();
    if (!this.linkedDocumentLeaf) return null;
    const file = this.getLinkedDocumentFile();
    return file?.basename ?? this.linkedDocumentLeaf.getDisplayText();
  }

  getDocumentSyncMode(): DocumentSyncMode { return this.settings.documentSyncMode; }

  isStartupInitializing(): boolean { return this.startupInitializing; }

  private documentSyncTargetLeaf(): WorkspaceLeaf | null {
    this.validateLinkedDocumentLeaf();
    if (this.settings.documentSyncMode === "pinned") return this.linkedDocumentLeaf;
    if (this.settings.documentSyncMode === "recent") return this.findRecentDocumentLeaf();
    return null;
  }

  hasDocumentSyncTarget(): boolean {
    return this.documentSyncTargetLeaf() !== null;
  }

  private leafContainerElement(leaf: WorkspaceLeaf): HTMLElement | null {
    // WorkspaceLeaf.containerEl is not part of the stable public type surface. Keep the compatibility
    // bridge isolated and fall back to the view container on older/non-standard leaves.
    const bridged = leaf as WorkspaceLeaf & { containerEl?: HTMLElement };
    return bridged.containerEl?.isConnected ? bridged.containerEl : leaf.view?.containerEl ?? null;
  }

  private clearLinkedLeafHighlight(element: HTMLElement): void {
    const pending = this.linkedLeafHighlightTimers.get(element);
    if (pending) pending.viewWindow.clearTimeout(pending.timer);
    this.linkedLeafHighlightTimers.delete(element);
    element.classList.remove("kplex-linked-leaf-alert");
  }

  private flashDocumentLeaf(leaf: WorkspaceLeaf): void {
    const element = this.leafContainerElement(leaf);
    if (!element) return;
    const viewWindow = element.ownerDocument.defaultView ?? window;
    this.clearLinkedLeafHighlight(element);

    // Appearance stays entirely in styles.css and therefore inherits the active Obsidian theme.
    element.classList.add("kplex-linked-leaf-alert");
    const timer = viewWindow.setTimeout(() => this.clearLinkedLeafHighlight(element), 2000);
    this.linkedLeafHighlightTimers.set(element, { viewWindow, timer });
  }

  async showLinkedDocumentLeaf(): Promise<boolean> {
    const leaf = this.documentSyncTargetLeaf();
    if (!leaf || !this.leafIsAttached(leaf)) return false;
    await this.app.workspace.revealLeaf(leaf);
    this.flashDocumentLeaf(leaf);
    return true;
  }

  private syncKplexToLeafEnabled(): boolean { return this.settings.documentSyncMode !== "off"; }
  private syncLeafToKplexEnabled(): boolean { return this.settings.documentSyncMode !== "off"; }

  shouldFollowDocumentFile(file: TFile): boolean {
    if (this.startupInitializing) return false;
    const suppression = this.transientDocumentFollowSuppression;
    if (suppression && Date.now() >= suppression.until) this.transientDocumentFollowSuppression = null;
    else if (suppression?.path === file.path) return false;

    if (!this.syncLeafToKplexEnabled()) return false;
    this.validateLinkedDocumentLeaf();
    const leaf = this.settings.documentSyncMode === "pinned" ? this.linkedDocumentLeaf : this.findRecentDocumentLeaf();
    return this.fileForLeaf(leaf)?.path === file.path;
  }

  private targetNoteLeaf(createIfMissing = true): WorkspaceLeaf | null {
    this.validateLinkedDocumentLeaf();
    if (this.settings.documentSyncMode === "pinned" && this.linkedDocumentLeaf) return this.linkedDocumentLeaf;
    const recent = this.findRecentDocumentLeaf();
    if (recent) return recent;
    return createIfMissing ? this.app.workspace.getLeaf("split") : null;
  }

  async relinkDocumentLeafToMostRecent(page?: GraphPage): Promise<void> {
    const candidate = this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.linkedDocumentLeaf = candidate;
    this.lastDocumentLeaf = candidate;
    this.settings.documentSyncMode = "pinned";
    if (page?.file) await candidate.openFile(page.file, { active: false });
    this.settings.sidecarOpen = false;
    await this.saveSettings(false, false);
    this.notifySidecar();
  }

  async setDocumentSyncMode(mode: DocumentSyncMode, page?: GraphPage): Promise<TFile | null> {
    this.settings.documentSyncMode = mode;
    this.settings.autoOpenCentralDocument = mode !== "off";
    this.settings.followActiveFile = mode !== "off";

    if (mode === "off") {
      const released = this.linkedDocumentLeaf;
      this.linkedDocumentLeaf = null;
      if (released) {
        for (const [host, managed] of [...this.sidecarLeaves.entries()]) if (managed === released) this.sidecarLeaves.delete(host);
      }
      this.settings.sidecarOpen = false;
      await this.saveSettings(false, false);
      this.notifySidecar();
      return null;
    }

    if (mode === "recent") {
      const released = this.linkedDocumentLeaf;
      this.linkedDocumentLeaf = null;
      if (released) {
        for (const [host, managed] of [...this.sidecarLeaves.entries()]) if (managed === released) this.sidecarLeaves.delete(host);
      }
      this.settings.sidecarOpen = false;
      await this.saveSettings(false, false);
      this.notifySidecar();
      return null;
    }

    // Pinned means one fixed note tab. If a sidecar is open it is already the obvious fixed tab;
    // otherwise pin the most recently used note tab.
    const candidate = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.linkedDocumentLeaf = candidate;
    this.lastDocumentLeaf = candidate;
    if (page?.file) await candidate.openFile(page.file, { active: false });
    this.settings.sidecarOpen = this.isManagedSidecarLeaf(candidate);
    await this.saveSettings(false, false);
    this.notifySidecar();
    return null;
  }

  async setDocumentLeafLinked(linked: boolean, page?: GraphPage): Promise<void> {
    await this.setDocumentSyncMode(linked ? "recent" : "off", page);
  }

  async syncMostRecentTabWithKplex(page: GraphPage): Promise<void> {
    if (!page.file) return;
    const leaf = this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(page.file, { active: false });
  }

  async syncKplexWithMostRecentTab(): Promise<TFile | null> {
    const leaf = this.findRecentDocumentLeaf();
    const file = this.fileForLeaf(leaf);
    if (!file || !this.index.get(file.path)) return null;
    this.settings.lastActivePath = file.path;
    const history = [...this.settings.navigationHistory.filter((path) => path !== file.path), file.path].slice(-40);
    this.settings.navigationHistory = history;
    await this.saveSettings(false, false);
    this.notifyNavigation(file.path);
    this.index.notify();
    return file;
  }

  async showPageInDocumentLeaf(page: GraphPage): Promise<void> {
    await this.syncMostRecentTabWithKplex(page);
  }

  async syncPageToDocumentLeaf(page: GraphPage): Promise<void> {
    if (!this.syncKplexToLeafEnabled() || !page.file) return;
    const leaf = this.targetNoteLeaf(true);
    if (!leaf) return;
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(page.file, { active: false });
  }

  subscribeNavigation(listener: (path: string) => void): () => void {
    this.navigationListeners.add(listener);
    return () => this.navigationListeners.delete(listener);
  }

  private notifyNavigation(path: string): void {
    for (const listener of this.navigationListeners) listener(path);
  }

  subscribeSearchFocus(hostLeaf: WorkspaceLeaf, listener: () => void): () => void {
    this.searchFocusListeners.set(hostLeaf, listener);
    return () => {
      if (this.searchFocusListeners.get(hostLeaf) === listener) this.searchFocusListeners.delete(hostLeaf);
    };
  }

  private isKplexLeaf(leaf: WorkspaceLeaf | null | undefined): leaf is WorkspaceLeaf {
    if (!leaf) return false;
    const type = leaf.getViewState().type;
    return type === EXCALIBRAIN_VIEW_TYPE || type === KPLEX_SIDEPANEL_VIEW_TYPE;
  }

  private searchTargetLeaf(): WorkspaceLeaf | null {
    const recent = this.app.workspace.getMostRecentLeaf();
    if (this.isKplexLeaf(recent) && this.searchFocusListeners.has(recent)) return recent;

    const mounted = [...this.searchFocusListeners.keys()].filter((leaf) => this.leafIsAttached(leaf));
    return mounted.find((leaf) => this.leafIsVisible(leaf)) ?? mounted[0] ?? null;
  }

  requestSearchFocus(hostLeaf?: WorkspaceLeaf): boolean {
    const target = hostLeaf && this.searchFocusListeners.has(hostLeaf) ? hostLeaf : this.searchTargetLeaf();
    if (!target) return false;
    const listener = this.searchFocusListeners.get(target);
    if (!listener) return false;
    listener();
    return true;
  }

  getIndexStatus(): { upToDate: boolean; label: string } {
    const upToDate = this.initialIndexComplete
      && !this.indexDirty
      && this.rebuildTask === null
      && this.rebuildTimer === null
      && !this.index.hasPendingSnapshotHydration();
    return {
      upToDate,
      label: upToDate
        ? "Index status: up to date"
        : "Index status: updating — the graph may be temporarily incomplete",
    };
  }

  subscribeIndexStatus(listener: () => void): () => void {
    this.indexStatusListeners.add(listener);
    return () => this.indexStatusListeners.delete(listener);
  }

  private notifyIndexStatus(): void {
    const status = this.getIndexStatus();
    const key = `${status.upToDate ? "1" : "0"}:${status.label}`;
    if (key === this.lastIndexStatusKey) return;
    this.lastIndexStatusKey = key;
    for (const listener of this.indexStatusListeners) listener();
  }

  subscribeGraphLenses(listener: (lenses: ExcaliBrainSettings["graphLenses"]) => void): () => void {
    this.graphLensListeners.add(listener);
    return () => this.graphLensListeners.delete(listener);
  }

  async setGraphLenses(lenses: ExcaliBrainSettings["graphLenses"]): Promise<void> {
    this.settings.graphLenses = lenses;
    await this.saveSettings(false, false);
    for (const listener of this.graphLensListeners) listener(lenses);
  }

  subscribeRelationshipFlair(listener: (path: string) => void): () => void {
    this.relationshipFlairListeners.add(listener);
    return () => this.relationshipFlairListeners.delete(listener);
  }

  requestRelationshipFlair(path: string): void {
    for (const listener of this.relationshipFlairListeners) listener(path);
  }

  subscribeSidecar(listener: () => void): () => void {
    this.sidecarListeners.add(listener);
    return () => this.sidecarListeners.delete(listener);
  }

  private notifySidecar(): void {
    for (const listener of this.sidecarListeners) listener();
  }

  private isManagedSidecarLeaf(leaf: WorkspaceLeaf | null | undefined): boolean {
    if (!leaf) return false;
    for (const managed of this.sidecarLeaves.values()) if (managed === leaf) return true;
    return false;
  }

  private validateSidecarLeaf(hostLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
    const leaf = this.sidecarLeaves.get(hostLeaf) ?? null;
    if (!leaf) return null;
    if (!this.leafIsAttached(leaf)) {
      this.sidecarLeaves.delete(hostLeaf);
      return null;
    }
    return leaf;
  }

  private availableSidecarLeaf(hostLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
    if (hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE) return null;
    const collapsed = this.collapsedPlexHosts.get(hostLeaf);
    if (collapsed && this.leafIsAttached(collapsed.sidecarLeaf)) return collapsed.sidecarLeaf;

    const managed = this.validateSidecarLeaf(hostLeaf);
    return managed && this.adjacentPosition(hostLeaf, managed) ? managed : null;
  }

  getSidecarPosition(hostLeaf: WorkspaceLeaf): SidecarPosition | null {
    if (hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE) return null;
    const collapsed = this.collapsedPlexHosts.get(hostLeaf);
    if (collapsed && this.leafIsAttached(collapsed.sidecarLeaf)) return collapsed.position;
    const managed = this.validateSidecarLeaf(hostLeaf);
    return managed ? this.adjacentPosition(hostLeaf, managed) : null;
  }

  isSidecarOpen(hostLeaf: WorkspaceLeaf): boolean {
    return this.getSidecarPosition(hostLeaf) !== null;
  }

  private createSidecarLeaf(hostLeaf: WorkspaceLeaf, position: SidecarPosition): WorkspaceLeaf {
    const direction = position === "left" || position === "right" ? "vertical" : "horizontal";
    const before = position === "left" || position === "above";
    return this.app.workspace.createLeafBySplit(hostLeaf, direction, before);
  }

  private leafMatchesPersistedSidecarTarget(leaf: WorkspaceLeaf): boolean {
    const state = leaf.getViewState();
    if (this.settings.sidecarLastFilePath) {
      const fileState = state.state as { file?: unknown } | undefined;
      return this.fileForLeaf(leaf)?.path === this.settings.sidecarLastFilePath
        || fileState?.file === this.settings.sidecarLastFilePath;
    }
    if (this.settings.sidecarLastUrl) {
      const urlState = state.state as { url?: unknown } | undefined;
      return state.type === "webviewer" && urlState?.url === this.settings.sidecarLastUrl;
    }
    return false;
  }

  private navigationHistoryScoreForLeaf(leaf: WorkspaceLeaf): number {
    const file = this.fileForLeaf(leaf);
    if (!file) return -1;
    return this.settings.navigationHistory.lastIndexOf(file.path);
  }

  private leafTabIsActive(leaf: WorkspaceLeaf): boolean {
    const bridged = leaf as WorkspaceLeaf & { tabHeaderEl?: HTMLElement };
    if (bridged.tabHeaderEl?.isConnected) return bridged.tabHeaderEl.classList.contains("is-active");
    return (leaf.getViewState() as { active?: boolean }).active === true;
  }

  private restoredSidecarCandidate(hostLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
    // Startup restore is spatial first. Persisted sidecarPosition records which *tab group* K-Plex
    // owned before shutdown, while Obsidian itself restores that group. Do not jump to a matching
    // document on another side: in a layout with panes left/right/below that would reconnect K-Plex
    // to the wrong user tab simply because it happens to show the same note.
    const rememberedGroups = new Map<HTMLElement, WorkspaceLeaf[]>();
    const ungroupedRemembered: WorkspaceLeaf[] = [];

    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf === hostLeaf || this.isManagedSidecarLeaf(leaf) || !this.isDocumentLeafCandidate(leaf)) return;
      if (this.adjacentPosition(hostLeaf, leaf) !== this.settings.sidecarPosition) return;
      const group = this.leafGroupElement(leaf);
      if (!group) {
        ungroupedRemembered.push(leaf);
        return;
      }
      const members = rememberedGroups.get(group) ?? [];
      members.push(leaf);
      rememberedGroups.set(group, members);
    });

    // There must be exactly one adjacent document tab-group on the remembered side. If the host
    // edge is split into two independent groups, ownership is genuinely ambiguous and K-Plex must
    // not adopt either one automatically (issue #17).
    if (rememberedGroups.size === 1) {
      const candidates = [...rememberedGroups.values()][0] ?? [];

      // Strongest identity: remember the actual document/URL the managed sidecar displayed. The
      // graph center can legitimately be different from the sidecar content, so lastActivePath is
      // not a valid substitute for sidecar identity.
      const exact = candidates.filter((leaf) => this.leafMatchesPersistedSidecarTarget(leaf));
      if (exact.length === 1) return exact[0];

      // Obsidian normally restores one selected tab per group. Prefer its active/visible tab before
      // consulting global "most recent" state, which is unreliable during startup hydration.
      const activeState = candidates.filter((leaf) => this.leafTabIsActive(leaf));
      if (activeState.length === 1) return activeState[0];
      const visible = candidates.filter((leaf) => this.leafIsVisible(leaf));
      if (visible.length === 1) return visible[0];

      // Backward-compatible heuristic for settings written before sidecarLastFilePath existed:
      // if exactly one candidate is present in K-Plex navigation history, or one is clearly the
      // most recent K-Plex page among the candidates, prefer it. This is intentionally scoped to
      // the remembered-side group and can never select a left/bottom pane when the sidecar was right.
      const scored = candidates
        .map((leaf) => ({ leaf, score: this.navigationHistoryScoreForLeaf(leaf) }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score);
      if (scored.length === 1 || (scored.length > 1 && scored[0].score > scored[1].score)) return scored[0].leaf;

      if (candidates.length === 1) return candidates[0];
      return null;
    }

    // Very early in workspace hydration parent tab-group DOM may not yet be available. A single
    // geometrically adjacent document leaf is still safe; multiple leaves remain ambiguous.
    if (rememberedGroups.size === 0 && ungroupedRemembered.length === 1) return ungroupedRemembered[0];
    return null;
  }

  private async waitForRestoredSidecarCandidate(hostLeaf: WorkspaceLeaf): Promise<WorkspaceLeaf | null> {
    // onLayoutReady can precede DeferredView/tab-group geometry settling. Poll briefly rather than
    // creating a new split. The operation is asynchronous and never blocks Obsidian's UI thread.
    const hostGroup = this.leafGroupElement(hostLeaf);
    const viewWindow = hostGroup?.ownerDocument.defaultView ?? window;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const candidate = this.restoredSidecarCandidate(hostLeaf);
      if (candidate) return candidate;
      await new Promise<void>((resolve) => viewWindow.setTimeout(resolve, attempt < 4 ? 0 : 75));
    }
    return null;
  }

  private async restorePersistedSidecar(hostLeaf: WorkspaceLeaf): Promise<void> {
    if (!this.settings.sidecarOpen || hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE) return;
    if (!this.leafIsAttached(hostLeaf) || this.isSidecarOpen(hostLeaf)) return;
    if (this.sidecarRestoreAttemptedHosts.has(hostLeaf)) return;
    if (this.sidecarRestoreTask) {
      await this.sidecarRestoreTask;
      return;
    }

    const task = (async () => {
      if (!this.settings.sidecarOpen || !this.leafIsAttached(hostLeaf) || this.isSidecarOpen(hostLeaf)) return;
      this.sidecarRestoreAttemptedHosts.add(hostLeaf);

      // Give Obsidian's restored split tree and DeferredViews time to hydrate before matching the
      // remembered adjacent tab-group. Startup restoration must never create an extra pane merely
      // because a legitimate restored sidecar has not produced a usable DOMRect yet.
      await this.waitForWorkspaceLayout(hostLeaf, 3);
      const restored = await this.waitForRestoredSidecarCandidate(hostLeaf);
      if (!restored) {
        // Preserve the user's restored workspace exactly as Obsidian opened it. A later explicit
        // sidecar action may create a managed companion, but startup itself is non-greedy.
        this.notifySidecar();
        return;
      }

      this.sidecarLeaves.set(hostLeaf, restored);
      this.linkedDocumentLeaf = restored;
      this.lastDocumentLeaf = restored;
      this.settings.documentSyncMode = "pinned";
      const actualPosition = this.adjacentPosition(hostLeaf, restored);
      if (actualPosition) this.settings.sidecarPosition = actualPosition;
      const restoredFile = this.fileForLeaf(restored);
      const restoredState = restored.getViewState();
      if (restoredFile) {
        this.settings.sidecarLastFilePath = restoredFile.path;
        this.settings.sidecarLastUrl = "";
      } else if (restoredState.type === "webviewer") {
        const url = (restoredState.state as { url?: unknown } | undefined)?.url;
        if (typeof url === "string") {
          this.settings.sidecarLastUrl = url;
          this.settings.sidecarLastFilePath = "";
        }
      }
      await this.saveSettings(false, false);
      this.notifySidecar();
    })();
    this.sidecarRestoreTask = task;
    try {
      await task;
    } finally {
      if (this.sidecarRestoreTask === task) this.sidecarRestoreTask = null;
    }
  }

  private ensureSidecarLeaf(hostLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
    if (hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE) return null;
    let leaf = this.validateSidecarLeaf(hostLeaf);

    // A managed sidecar that the user manually moved away becomes an ordinary document tab. Keep
    // it open, release ownership, and create a fresh companion split rather than dragging that tab
    // back or later detaching it as collateral damage.
    if (leaf && !this.adjacentPosition(hostLeaf, leaf)) {
      this.sidecarLeaves.delete(hostLeaf);
      if (this.linkedDocumentLeaf === leaf) this.linkedDocumentLeaf = null;
      this.lastDocumentLeaf = leaf;
      leaf = null;
    }

    // Never adopt an arbitrary adjacent or pinned note tab. Sidecar actions may detach/move the
    // managed leaf, so ownership must start with a leaf K-Plex created specifically for that role.
    if (!leaf) leaf = this.createSidecarLeaf(hostLeaf, this.settings.sidecarPosition);
    this.sidecarLeaves.set(hostLeaf, leaf);
    this.settings.sidecarOpen = true;
    this.settings.documentSyncMode = "pinned";
    this.linkedDocumentLeaf = leaf;
    this.lastDocumentLeaf = leaf;
    const actualPosition = this.adjacentPosition(hostLeaf, leaf);
    if (actualPosition) this.settings.sidecarPosition = actualPosition;
    return leaf;
  }

  async openMarkdownInSidecar(hostLeaf: WorkspaceLeaf, file: TFile, line = 0, sourceMode = true): Promise<void> {
    const leaf = this.ensureSidecarLeaf(hostLeaf);
    if (!leaf) {
      await this.openInDocumentLeaf(file);
      return;
    }
    this.transientDocumentFollowSuppression = { path: file.path, until: Date.now() + 1800 };
    this.settings.sidecarLastFilePath = file.path;
    this.settings.sidecarLastUrl = "";
    await leaf.openFile(file, { active: false });
    const state = leaf.getViewState();
    if (state.type === "markdown") {
      await leaf.setViewState({
        ...state,
        active: false,
        state: { ...state.state, mode: sourceMode ? "source" : (this.settings.sidecarMarkdownMode === "preview" ? "preview" : "source") },
      }, { line: Math.max(0, Math.floor(line)) });
    }
    await this.saveSettings(false, false);
    this.notifySidecar();
  }

  private async openPageInSidecarLeaf(leaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    if (page.url) {
      this.settings.sidecarLastUrl = page.url;
      this.settings.sidecarLastFilePath = "";
      try {
        await leaf.setViewState({ type: "webviewer", state: { url: page.url, navigate: true }, active: false });
      } catch {
        new Notice("Obsidian's Web viewer is not available. Open the link from the node instead.", 2600);
      }
      return;
    }
    if (!page.file) {
      this.settings.sidecarLastFilePath = "";
      this.settings.sidecarLastUrl = "";
      await leaf.setViewState({ type: "empty", active: false });
      return;
    }
    this.settings.sidecarLastFilePath = page.file.path;
    this.settings.sidecarLastUrl = "";
    await leaf.openFile(page.file, { active: false });
    const state = leaf.getViewState();
    if (state.type === "markdown") {
      await leaf.setViewState({
        ...state,
        active: false,
        state: { ...state.state, mode: this.settings.sidecarMarkdownMode === "preview" ? "preview" : "source" },
      });
    }
  }

  async openSidecar(hostLeaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    const leaf = this.ensureSidecarLeaf(hostLeaf);
    if (!leaf) return;
    await this.openPageInSidecarLeaf(leaf, page);
    await this.saveSettings(false, false);
    this.notifySidecar();
  }

  async closeSidecar(hostLeaf: WorkspaceLeaf, persist = true): Promise<void> {
    const collapsed = this.collapsedPlexHosts.get(hostLeaf);
    const leaf = this.sidecarLeaves.get(hostLeaf) ?? collapsed?.sidecarLeaf ?? null;
    this.restoreCollapsedPlex(hostLeaf);
    this.sidecarLeaves.delete(hostLeaf);
    if (leaf) {
      try { leaf.detach(); } catch { /* already detached */ }
    }
    if (this.linkedDocumentLeaf === leaf) {
      this.linkedDocumentLeaf = null;
      this.settings.documentSyncMode = "off";
    }
    if (persist) {
      this.settings.sidecarOpen = false;
      await this.saveSettings(false, false);
    }
    this.notifySidecar();
  }

  /**
   * Stop managing/synchronizing the companion leaf but leave that native Obsidian leaf open.
   * This path is also used when K-Plex itself closes: the user's document is content, not disposable
   * plugin chrome, so closing the graph must never close the note that happened to be beside it.
   */
  private async releaseSidecar(hostLeaf: WorkspaceLeaf, persist = true, preserveOpenIntent = false): Promise<void> {
    const collapsed = this.collapsedPlexHosts.get(hostLeaf);
    const leaf = this.sidecarLeaves.get(hostLeaf) ?? collapsed?.sidecarLeaf ?? null;
    this.restoreCollapsedPlex(hostLeaf);
    this.sidecarLeaves.delete(hostLeaf);
    if (!leaf) return;

    // Releasing a K-Plex view must not disturb a separately pinned/recent note-tab link. Only the
    // document leaf owned by this sidecar is allowed to change synchronization state.
    if (this.linkedDocumentLeaf === leaf) {
      this.linkedDocumentLeaf = null;
      this.settings.documentSyncMode = "off";
    }
    if (!preserveOpenIntent) this.settings.sidecarOpen = false;
    this.lastDocumentLeaf = leaf;
    if (persist) await this.saveSettings(false, false);
    this.notifySidecar();
  }

  async detachSidecar(hostLeaf: WorkspaceLeaf): Promise<void> {
    await this.releaseSidecar(hostLeaf, true);
  }

  async toggleSidecar(hostLeaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    if (this.isSidecarOpen(hostLeaf)) await this.closeSidecar(hostLeaf);
    else await this.openSidecar(hostLeaf, page);
  }

  async moveSidecar(hostLeaf: WorkspaceLeaf, position: SidecarPosition, page: GraphPage): Promise<void> {
    if (hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE || this.sidecarMovingHosts.has(hostLeaf)) return;
    this.sidecarMovingHosts.add(hostLeaf);
    try {
      if (this.isPlexFoldedForSidecar(hostLeaf)) await this.expandPlexFromSidecar(hostLeaf);

      const previousSidecar = this.validateSidecarLeaf(hostLeaf);
      const wasOpen = previousSidecar !== null && this.adjacentPosition(hostLeaf, previousSidecar) !== null;
      this.settings.sidecarPosition = position;

      if (!wasOpen || !previousSidecar) {
        await this.saveSettings(false, false);
        this.notifySidecar();
        return;
      }

      const currentPosition = this.adjacentPosition(hostLeaf, previousSidecar);
      if (currentPosition === position) {
        await this.saveSettings(false, false);
        this.notifySidecar();
        return;
      }

      // Measure the exact K-Plex + companion workspace footprint before changing the split tree.
      // Creating the replacement first prevents a zero-width intermediate pane; restoring the saved
      // rectangle after the old leaf detaches prevents repeated moves from donating space to a third
      // workspace group.
      const preservedFootprint = this.sidecarFootprint(hostLeaf, previousSidecar);
      const replacement = this.createSidecarLeaf(hostLeaf, position);
      this.sidecarLeaves.set(hostLeaf, replacement);
      this.settings.sidecarOpen = true;
      this.settings.documentSyncMode = "pinned";
      this.linkedDocumentLeaf = replacement;
      this.lastDocumentLeaf = replacement;

      try {
        await this.openPageInSidecarLeaf(replacement, page);
        const actualPosition = this.adjacentPosition(hostLeaf, replacement);
        if (actualPosition) this.settings.sidecarPosition = actualPosition;
        if (this.leafIsAttached(previousSidecar)) previousSidecar.detach();
        if (preservedFootprint) await this.restoreSidecarFootprint(hostLeaf, replacement, preservedFootprint);
        await this.saveSettings(false, false);
      } catch (error) {
        try { if (this.leafIsAttached(replacement)) replacement.detach(); } catch { /* best effort */ }
        if (this.leafIsAttached(previousSidecar)) {
          this.sidecarLeaves.set(hostLeaf, previousSidecar);
          this.linkedDocumentLeaf = previousSidecar;
          this.lastDocumentLeaf = previousSidecar;
          const previousPosition = this.adjacentPosition(hostLeaf, previousSidecar);
          if (previousPosition) this.settings.sidecarPosition = previousPosition;
          this.settings.sidecarOpen = true;
          this.settings.documentSyncMode = "pinned";
        } else {
          this.sidecarLeaves.delete(hostLeaf);
          this.linkedDocumentLeaf = null;
          this.settings.sidecarOpen = false;
          this.settings.documentSyncMode = "off";
        }
        await this.saveSettings(false, false);
        this.notifySidecar();
        throw error;
      }

      this.notifySidecar();
    } finally {
      this.sidecarMovingHosts.delete(hostLeaf);
    }
  }

  async syncSidecarToPage(hostLeaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    const leaf = this.validateSidecarLeaf(hostLeaf);
    if (!leaf || !this.adjacentPosition(hostLeaf, leaf)) return;
    await this.openPageInSidecarLeaf(leaf, page);
    // Persist the sidecar's actual content identity, not merely the graph center. This is what lets
    // startup reconnect to the correct restored tab inside the remembered adjacent tab group.
    await this.saveSettings(false, false);
  }


  async activateView(): Promise<void> {
    // Phones intentionally route the generic/open-ribbon action to the sidepanel. Tablets retain
    // the normal graph tab because there is enough screen real-estate to make that useful.
    const environment = readObsidianPresentationEnvironment();
    const target = primaryOpenSurface(environment, this.settings.startInPopout);
    if (target === "sidepanel") {
      await this.activateSidepanel();
      return;
    }
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    let leaf = this.app.workspace.getLeavesOfType(EXCALIBRAIN_VIEW_TYPE)[0];
    if (!leaf) {
      if (target === "popout") {
        try { leaf = this.app.workspace.getLeaf("window"); }
        catch { leaf = this.app.workspace.getLeaf(true); }
      } else {
        leaf = this.app.workspace.getLeaf(true);
      }
      await leaf.setViewState({ type: EXCALIBRAIN_VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  async activateSidepanel(): Promise<void> {
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(KPLEX_SIDEPANEL_VIEW_TYPE)[0] ?? null;
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) {
        new Notice("The Obsidian sidepanel is not available in this workspace.", 2200);
        return;
      }
      await leaf.setViewState({ type: KPLEX_SIDEPANEL_VIEW_TYPE, active: true });
    }

    // Match Excalidraw's proven mobile sidepanel lifecycle. During Obsidian startup a leaf can
    // already have the right serialized type while leaf.view is still a generic ItemView. A
    // second active setViewState materializes the registered view constructor on that first tap.
    let view = leaf.view;
    if (!(view instanceof KplexSidepanelView)) {
      await leaf.setViewState({ type: KPLEX_SIDEPANEL_VIEW_TYPE, active: true });
      view = leaf.view;
    }
    await this.app.workspace.revealLeaf(leaf);
    if (Platform.isMobile) {
      // Mobile sidebars sometimes commit their expanded/collapsed state one frame after the view
      // state changes. Revealing again on the next frame makes the first command invocation
      // deterministic instead of requiring a second tap.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      await this.app.workspace.revealLeaf(leaf);
    }
    if (!(view instanceof KplexSidepanelView)) {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      await leaf.setViewState({ type: KPLEX_SIDEPANEL_VIEW_TYPE, active: true });
      view = leaf.view;
      await this.app.workspace.revealLeaf(leaf);
    }
    if (view instanceof KplexSidepanelView) await view.waitUntilReady();
  }

  async activateViewInPopout(): Promise<void> {
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    try {
      const leaf = this.app.workspace.getLeaf("window");
      await leaf.setViewState({ type: EXCALIBRAIN_VIEW_TYPE, active: true });
      await this.app.workspace.revealLeaf(leaf);
    } catch {
      new Notice("Pop-out windows are not available on this platform.", 2200);
    }
  }

  async focusInBrain(path: string): Promise<void> {
    await this.activateView();
    await this.ensureIndexReady("focus-active-note");
    if (!this.index.get(path)) return;
    const history = [...this.settings.navigationHistory.filter((p) => p !== path), path].slice(-40);
    this.settings.navigationHistory = history;
    this.settings.lastActivePath = path;
    await this.saveSettings(false, false);
  }

  async openInDocumentLeaf(file: TFile): Promise<void> {
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(file, { active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  async openSection(page: GraphPage): Promise<void> {
    const sourcePath = page.transient?.sourcePath;
    const subpath = page.transient?.subpath;
    if (!sourcePath || !subpath) return;
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(file, { active: true, eState: { subpath } });
    await this.app.workspace.revealLeaf(leaf);
  }

  async openPage(page: GraphPage): Promise<void> {
    if (page.url) {
      window.open(page.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (page.file) {
      await this.openInDocumentLeaf(page.file);
      return;
    }
    if (page.isFolder || page.isTag) {
      new Notice(page.isFolder ? `Folder: ${page.name}` : `Tag: #${page.name}`, 1600);
      return;
    }
    await this.createGhostNote(page);
  }

  getViewSettings(surface: KplexViewSurface): ExcaliBrainSettings {
    return effectiveViewSettings(this.settings, surface, readObsidianPresentationEnvironment());
  }

  getActiveLayoutProfile(surface: KplexViewSurface): KplexLayoutProfile {
    return activeLayoutProfile(this.settings, surface, readObsidianPresentationEnvironment());
  }

  async updateLayoutProfile(surface: KplexViewSurface, patch: Partial<KplexLayoutProfile>): Promise<void> {
    const environment = readObsidianPresentationEnvironment();
    const key = layoutProfileKey(surface, environment);
    const current = activeLayoutProfile(this.settings, surface, environment);
    this.settings.layoutProfiles[key] = { ...current, ...patch };
    await this.saveSettings(false, false);
    this.index.notify();
  }

  isPinned(path: string): boolean { return this.settings.pinnedNodes.includes(path); }

  async togglePinned(path: string): Promise<void> {
    this.settings.pinnedNodes = this.isPinned(path)
      ? this.settings.pinnedNodes.filter((item) => item !== path)
      : [...this.settings.pinnedNodes.filter((item) => item !== path), path];
    await this.saveSettings(false, false);
    this.index.notify();
  }

  openNoteTypeModal(page: GraphPage): void {
    if (!page.file || page.file.extension !== "md") return;
    new NoteTypeModal(this, page.file, page.noteType).open();
  }

  openAddToOntologyModal(field: string, onSaved?: () => void): void {
    if (!field.trim()) return;
    new AddToOntologyModal(this, field.trim(), onSaved).open();
  }

  async assignFieldToOntology(field: string, role: OntologyAssignmentRole): Promise<void> {
    const normalized = normalizeFieldName(field);
    const h = this.settings.hierarchy;
    const remove = (items: string[]) => items.filter((item) => normalizeFieldName(item) !== normalized);
    h.hidden = remove(h.hidden);
    h.parents = remove(h.parents);
    h.children = remove(h.children);
    h.leftFriends = remove(h.leftFriends);
    h.rightFriends = remove(h.rightFriends);
    h.previous = remove(h.previous);
    h.next = remove(h.next);
    h.exclusions = remove(h.exclusions);
    const target = role === "parent" ? h.parents
      : role === "child" ? h.children
      : role === "left" ? h.leftFriends
      : role === "right" ? h.rightFriends
      : role === "previous" ? h.previous
      : role === "next" ? h.next
      : role === "hidden" ? h.hidden : h.exclusions;
    target.push(field.trim());
    target.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    await this.saveSettings(true);
  }

  private fieldAtEditorCursor(editor: Editor): string | null {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    // Match classic ExcaliBrain's supported Dataview wrappers, but prefer the actual field whose
    // source span contains the cursor when K-Plex's parser can identify it.
    const parsed = parseBodyMetadata(line);
    const occurrence = parsed.inlineFieldOccurrences.find((item) => cursor.ch >= item.start && cursor.ch <= item.end)
      ?? parsed.inlineFieldOccurrences[parsed.inlineFieldOccurrences.length - 1];
    if (occurrence?.name) return occurrence.name;
    const re = /(?:^|[([])(?:==|\*\*|~~|\*|_|__)?([^:\]()]*?)(?:==|\*\*|~~|\*|_|__)?::/g;
    let match: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    while ((match = re.exec(line)) !== null) last = match;
    if (last?.[1]?.trim()) return last[1].trim();
    // YAML property under the cursor is also eligible for ontology management.
    const yaml = line.match(/^\s*([^:#][^:]{0,120}):(?:\s|$)/);
    return yaml?.[1]?.trim() ?? null;
  }

  private registerOntologyContextMenu(): void {
    this.registerEvent(this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
      if (!(view instanceof MarkdownView)) return;
      const field = this.fieldAtEditorCursor(editor);
      if (!field) return;
      menu.addItem((item) => item
        .setTitle(`Add/change “${field}” in K-Plex ontology`)
        .setIcon("network")
        .onClick(() => this.openAddToOntologyModal(field)));
    }));
  }

  private registerOntologyCommands(): void {
    const roles: Array<[string, string, OntologyAssignmentRole | "select"]> = [
      ["kplex-ontology-select", "Assign field to K-Plex ontology…", "select"],
      ["kplex-ontology-parent", "Assign field as Parent ontology", "parent"],
      ["kplex-ontology-child", "Assign field as Child ontology", "child"],
      ["kplex-ontology-left", "Assign field as Friend / left ontology", "left"],
      ["kplex-ontology-right", "Assign field as Challenger / right ontology", "right"],
      ["kplex-ontology-previous", "Assign field as Previous ontology", "previous"],
      ["kplex-ontology-next", "Assign field as Next ontology", "next"],
      ["kplex-ontology-hidden", "Assign field as Hidden ontology", "hidden"],
      ["kplex-ontology-excluded", "Assign field as Excluded / metadata-only ontology", "excluded"],
    ];
    for (const [id, name, role] of roles) {
      this.addCommand({
        id,
        name,
        editorCheckCallback: (checking: boolean, editor: Editor) => {
          const field = this.fieldAtEditorCursor(editor);
          if (!field) return false;
          if (!checking) {
            if (role === "select") this.openAddToOntologyModal(field);
            else void this.assignFieldToOntology(field, role);
          }
          return true;
        },
      });
    }
  }

  private async refreshBookmarkedEntryPoints(): Promise<void> {
    const paths: string[] = [];
    type BookmarkItem = { type?: string; path?: string; items?: BookmarkItem[] };
    type InternalPlugin = {
      enabled?: boolean;
      _loaded?: boolean;
      instance?: { items?: BookmarkItem[] };
      loadData?: () => Promise<{ items?: BookmarkItem[] }>;
    };
    type Registry = { getPluginById?: (id: string) => InternalPlugin | undefined; plugins?: Record<string, InternalPlugin> };
    const registry = (this.app as unknown as { internalPlugins?: Registry }).internalPlugins;

    const collect = (items: BookmarkItem[] | undefined): void => {
      for (const item of items ?? []) {
        if (item.type === "file" && item.path && item.path !== this.settings.excalibrainFilepath && this.app.vault.getAbstractFileByPath(item.path)) {
          // Keep entry-point paths even while startup is displaying only a partial graph. search()
          // resolves them against the current index later, after full hydration has completed.
          paths.push(item.path);
        } else if (item.type === "folder" && item.path && this.app.vault.getAbstractFileByPath(item.path)) {
          paths.push(`folder:${item.path}`);
        }
        if (item.type === "group" || item.items) collect(item.items);
      }
    };

    try {
      const bookmarks = registry?.getPluginById?.("bookmarks") ?? registry?.plugins?.bookmarks;
      if (bookmarks && bookmarks.enabled !== false) {
        // Obsidian lazily loads the internal Bookmarks plugin. Match classic ExcaliBrain: load
        // its persisted data before inspecting nested groups rather than assuming instance.items
        // is already populated.
        if (!bookmarks._loaded && bookmarks.loadData) await bookmarks.loadData();
        collect(bookmarks.instance?.items);
      } else {
        // Older Obsidian releases used the Starred internal plugin. Its persisted format only
        // supplied file entry points in classic ExcaliBrain, but `collect` safely accepts groups
        // and folders too if they are present.
        const starred = registry?.getPluginById?.("starred") ?? registry?.plugins?.starred;
        if (starred?.loadData) collect((await starred.loadData())?.items);
      }
    } catch (error) {
      console.warn("K-Plex: unable to load Obsidian bookmarks", error);
    }

    if (this.index.setSearchEntryPoints([...new Set(paths)])) this.index.notify();
  }

  dismissKplexMenu(): void {
    this.activeKplexMenuDocument?.removeEventListener("pointerdown", this.kplexMenuOutsidePointerDown, true);
    this.activeKplexMenuDocument = null;
    this.activeKplexMenu?.hide();
    this.activeKplexMenu = null;
  }

  private trackKplexMenu(menu: Menu, ownerDocument: Document): void {
    this.dismissKplexMenu();
    this.activeKplexMenu = menu;
    this.activeKplexMenuDocument = ownerDocument;
    ownerDocument.addEventListener("pointerdown", this.kplexMenuOutsidePointerDown, true);
  }

  showKplexMenuAtMouseEvent(menu: Menu, event: MouseEvent): void {
    const ownerDocument = event.view?.document ?? document;
    this.trackKplexMenu(menu, ownerDocument);
    menu.showAtMouseEvent(event);
  }

  showKplexMenuAtPosition(menu: Menu, position: { x: number; y: number }, ownerDocument: Document): void {
    this.trackKplexMenu(menu, ownerDocument);
    menu.showAtPosition(position, ownerDocument);
  }

  openSettings(): void {
    // Obsidian currently has no public Plugin API method for programmatically opening a
    // specific settings tab. Keep the internal bridge isolated and guarded so the rest of
    // K-Plex only relies on the public API surface.
    type SettingsController = { open?: () => void; openTabById?: (id: string) => void };
    const controller = (this.app as unknown as { setting?: SettingsController }).setting;
    if (controller?.open && controller.openTabById) {
      controller.open();
      controller.openTabById(this.manifest.id);
      return;
    }
    new Notice("Open Settings → Community plugins → K-Plex.", 3000);
  }

  openRelationModal(options: RelationModalOptions): void {
    if (options.mode === "create" && !options.fixedTarget) {
      new NewRelatedNoteModal(this, options.origin, options.semanticRole, options.onCommitted, options.hostLeaf).open();
      return;
    }
    new RelationModal(this, options).open();
  }

  triggerHoverPreview(page: GraphPage, targetEl: HTMLElement, event: MouseEvent | PointerEvent, sourcePath = ""): void {
    if (!page.file) return;
    this.app.workspace.trigger("hover-link", {
      event,
      source: EXCALIBRAIN_VIEW_TYPE,
      hoverParent: this.hoverParent,
      targetEl,
      linktext: page.file.path,
      sourcePath,
    });
  }

  ontologyFieldsForRole(role: RelationshipRole): string[] {
    const h = this.settings.hierarchy;
    switch (role) {
      case "parent": return [...h.parents];
      case "child": return [...h.children];
      case "left": return [...h.leftFriends];
      case "right": return [...h.rightFriends];
      case "previous": return [...h.previous];
      case "next": return [...h.next];
    }
  }

  inverseRelationshipRole(role: RelationshipRole): RelationshipRole {
    if (role === "parent") return "child";
    if (role === "child") return "parent";
    if (role === "previous") return "next";
    if (role === "next") return "previous";
    return role;
  }

  inverseGateRole(role: GateRole): GateRole {
    if (role === "parent") return "child";
    if (role === "child") return "parent";
    return role;
  }

  ontologyRoleForField(field: string): OntologyAssignmentRole | null {
    const normalized = normalizeFieldName(field);
    const h = this.settings.hierarchy;
    const has = (items: string[]) => items.some((item) => normalizeFieldName(item) === normalized);
    if (has(h.hidden)) return "hidden";
    if (has(h.parents)) return "parent";
    if (has(h.children)) return "child";
    if (has(h.leftFriends)) return "left";
    if (has(h.rightFriends)) return "right";
    if (has(h.previous)) return "previous";
    if (has(h.next)) return "next";
    if (has(h.exclusions)) return "excluded";
    return null;
  }

  inverseOntologyField(field: string, semanticRole: RelationshipRole): string {
    const group = this.ontologyRoleForField(field);
    const h = this.settings.hierarchy;
    switch (group) {
      case "parent": return this.defaultOntologyField("child");
      case "child": return this.defaultOntologyField("parent");
      case "previous": return h.next[0] ?? "Next";
      case "next": return h.previous[0] ?? "Previous";
      // Friend/challenger ontologies are symmetric in classic ExcaliBrain. Keep the same
      // property name when the relationship has to be stored on the opposite Markdown note.
      case "left":
      case "right": return field;
      default: return this.defaultOntologyField(this.inverseRelationshipRole(semanticRole));
    }
  }

  defaultOntologyField(role: RelationshipRole): string {
    const fields = this.ontologyFieldsForRole(role);
    const remembered = this.settings.relationDefaultFields?.[role]?.trim();
    if (remembered) {
      const canonical = fields.find((field) => normalizeFieldName(field) === normalizeFieldName(remembered));
      if (canonical) return canonical;
    }
    const preferred: Record<RelationshipRole, string[]> = {
      parent: ["parent", "parents"],
      child: ["child", "children"],
      left: ["friend", "friends", "jump", "jumps"],
      right: ["challenger", "opposes"],
      previous: ["previous", "prev"],
      next: ["next"],
    };
    for (const candidate of preferred[role]) {
      const found = fields.find((field) => normalizeFieldName(field) === candidate);
      if (found) return found;
    }
    return fields[0] ?? (role === "parent" ? "Parent" : role === "child" ? "Child" : role === "left" ? "Friend" : role === "right" ? "Challenger" : role === "previous" ? "Previous" : "Next");
  }

  async rememberRelationshipOntology(role: RelationshipRole, rawField: string): Promise<string> {
    const trimmed = rawField.trim();
    if (!trimmed) return this.defaultOntologyField(role);
    const normalized = normalizeFieldName(trimmed);
    const existing = this.ontologyFieldsForRole(role).find((field) => normalizeFieldName(field) === normalized);
    let canonical = existing ?? trimmed;
    let hierarchyChanged = false;

    if (!existing) {
      // A field typed into a relationship role is an explicit ontology assignment. Keep ontology
      // membership unambiguous by moving an identically named field out of another hierarchy list
      // before assigning it to this role. Previous/next are already offered by the matching lateral
      // role suggester, so they are preserved when selected from that role's own result list.
      const h = this.settings.hierarchy;
      const lists = [h.hidden, h.parents, h.children, h.leftFriends, h.rightFriends, h.previous, h.next, h.exclusions];
      for (const list of lists) {
        const match = list.find((field) => normalizeFieldName(field) === normalized);
        if (match) canonical = match;
      }
      for (const list of lists) {
        const next = list.filter((field) => normalizeFieldName(field) !== normalized);
        if (next.length !== list.length) { list.splice(0, list.length, ...next); hierarchyChanged = true; }
      }
      const target = role === "parent" ? h.parents : role === "child" ? h.children : role === "left" ? h.leftFriends : role === "right" ? h.rightFriends : role === "previous" ? h.previous : h.next;
      target.push(canonical);
      hierarchyChanged = true;
    }

    if (this.settings.relationDefaultFields[role] !== canonical) {
      this.settings.relationDefaultFields[role] = canonical;
      await this.saveSettings(hierarchyChanged, false);
    } else if (hierarchyChanged) {
      await this.saveSettings(true, false);
    }
    return canonical;
  }

  private allOntologyFields(): string[] {
    const h = this.settings.hierarchy;
    return [...h.parents, ...h.children, ...h.leftFriends, ...h.rightFriends, ...h.previous, ...h.next];
  }

  private referenceForPage(page: GraphPage, storageFile: TFile): string {
    if (page.file) return this.app.fileManager.generateMarkdownLink(page.file, storageFile.path);
    if (page.url) return page.url;
    return `[[${page.path}]]`;
  }

  private normalizedNoteReferenceMatches(rawPath: string, targetPath: string): boolean {
    const reference = normalizePath(rawPath.split("#", 1)[0].trim()).replace(/\.md$/i, "").toLocaleLowerCase();
    const target = normalizePath(targetPath).replace(/\.md$/i, "").toLocaleLowerCase();
    if (!reference || !target) return false;
    if (reference === target) return true;
    return !reference.includes("/") && reference === (target.split("/").pop() ?? target);
  }

  private valueContainsTarget(value: unknown, storageFile: TFile, target: GraphPage): boolean {
    const references = extractLinksFromValue(this.app, value, storageFile);
    if (target.url !== null) return references.some((path) => path === target.url);
    return references.some((path) => this.normalizedNoteReferenceMatches(path, target.path));
  }

  private stripTargetFromScalar(value: string, storageFile: TFile, target: GraphPage): string | null {
    if (!this.valueContainsTarget(value, storageFile, target)) return value;
    const tokens = /(\[\[[^\]]+\]\]|\[[^\]]*\]\([^)]+\)|https?:\/\/[^\s,;]+)/gi;
    const stripped = value.replace(tokens, (token) => this.valueContainsTarget(token, storageFile, target) ? "" : token)
      .replace(/\s*[,;]\s*[,;]+/g, ", ")
      .replace(/^\s*[,;]\s*|\s*[,;]\s*$/g, "")
      .trim();
    return stripped || null;
  }

  private removeTargetFromValue(value: unknown, storageFile: TFile, target: GraphPage): unknown {
    if (Array.isArray(value)) {
      const kept: unknown[] = [];
      for (const item of value) {
        const next = this.removeTargetFromValue(item, storageFile, target);
        if (next !== undefined) kept.push(next);
      }
      return kept.length ? kept : undefined;
    }
    if (typeof value === "string") return this.stripTargetFromScalar(value, storageFile, target) ?? undefined;
    if (isUnknownRecord(value)) {
      const kept: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) {
        const next = this.removeTargetFromValue(item, storageFile, target);
        if (next !== undefined) kept[key] = next;
      }
      return Object.keys(kept).length ? kept : undefined;
    }
    return value;
  }

  private async waitForMetadataChange(file: TFile, timeoutMs = 1200): Promise<void> {
    await new Promise<void>((resolve) => {
      let ref: EventRef | null = null;
      let timer = 0;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        if (ref) this.app.metadataCache.offref(ref);
        resolve();
      };
      ref = this.app.metadataCache.on("changed", (changedFile) => {
        if (changedFile.path === file.path) finish();
      });
      timer = window.setTimeout(finish, timeoutMs);
    });
  }

  private async writeRelationship(storageFile: TFile, target: GraphPage, field: string, referenceOverride?: string): Promise<void> {
    // Mark before processFrontMatter so our own metadataCache.changed event is not interpreted as
    // an external vault edit that requires a 20k-note rebuild.
    // Large vaults can deliver metadataCache.changed several seconds after processFrontMatter.
    // Keep our own write suppressed long enough that it cannot accidentally trigger a full-vault
    // backlog rebuild after the live semantic pair has already been patched in memory.
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
    const ontologyFields = new Set(this.allOntologyFields().map(normalizeFieldName));
    const desiredNormalized = normalizeFieldName(field);
    const reference = referenceOverride ?? this.referenceForPage(target, storageFile);

    await this.app.fileManager.processFrontMatter(storageFile, (frontmatter: Record<string, unknown>) => {
      let desiredKey = field;
      for (const key of Object.keys(frontmatter)) {
        const normalizedKey = normalizeFieldName(key);
        if (!ontologyFields.has(normalizedKey)) continue;
        if (normalizedKey === desiredNormalized) desiredKey = key;
        const next = this.removeTargetFromValue(frontmatter[key], storageFile, target);
        if (next === undefined) delete frontmatter[key];
        else frontmatter[key] = next;
      }

      const current = frontmatter[desiredKey];
      if (current === undefined || current === null || current === "") {
        frontmatter[desiredKey] = [reference];
        return;
      }
      if (this.valueContainsTarget(current, storageFile, target)) return;
      if (Array.isArray(current)) frontmatter[desiredKey] = [...(current as unknown[]), reference];
      else frontmatter[desiredKey] = [current, reference];
    });
  }

  private async addRelationshipOntology(storageFile: TFile, target: GraphPage, field: string): Promise<void> {
    // Connection details adds an additional ontology; it must not remove the same target from
    // other ontology properties or rewrite Markdown-body evidence.
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
    const desiredNormalized = normalizeFieldName(field);
    const reference = this.referenceForPage(target, storageFile);

    await this.app.fileManager.processFrontMatter(storageFile, (frontmatter: Record<string, unknown>) => {
      let desiredKey = field;
      for (const key of Object.keys(frontmatter)) {
        if (normalizeFieldName(key) === desiredNormalized) {
          desiredKey = key;
          break;
        }
      }

      const current = frontmatter[desiredKey];
      if (current === undefined || current === null || current === "") {
        frontmatter[desiredKey] = [reference];
        return;
      }
      if (this.valueContainsTarget(current, storageFile, target)) return;
      if (Array.isArray(current)) frontmatter[desiredKey] = [...(current as unknown[]), reference];
      else frontmatter[desiredKey] = [current, reference];
    });
  }

  private async clearFrontmatterRelationship(storageFile: TFile, target: GraphPage): Promise<void> {
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
    const ontologyFields = new Set(this.allOntologyFields().map(normalizeFieldName));
    await this.app.fileManager.processFrontMatter(storageFile, (frontmatter: Record<string, unknown>) => {
      for (const key of Object.keys(frontmatter)) {
        if (!ontologyFields.has(normalizeFieldName(key))) continue;
        const next = this.removeTargetFromValue(frontmatter[key], storageFile, target);
        if (next === undefined) delete frontmatter[key];
        else frontmatter[key] = next;
      }
    });
  }

  async createRelationFromGate(origin: GraphPage, semanticRole: GateRole, selectedFile: TFile, selectedField: string): Promise<void> {
    const selectedPage = this.index.get(selectedFile.path);
    if (!selectedPage) {
      new Notice("The selected note is not in the K-Plex index yet.", 2200);
      return;
    }
    await this.createRelationToPage(origin, semanticRole, selectedPage, selectedField);
  }

  async createRelationToPage(origin: GraphPage, semanticRole: RelationshipRole, target: GraphPage, selectedField: string): Promise<void> {
    if (origin.path === target.path) return;
    const gate = semanticRole === "parent" ? "top" : semanticRole === "child" ? "bottom" : semanticRole === "left" || semanticRole === "previous" ? "left" : "right";
    if (this.index.gateNeighbourPaths(origin, gate).has(target.path)) {
      new Notice("These nodes are already connected through this gate.", 1800);
      return;
    }

    // A target connected through another gate remains a valid drag target. Treat that gesture
    // as a relink so the new YAML relationship becomes authoritative over any stale body link.
    if (this.index.isConnected(origin, target.path)) {
      await this.relinkCentralNeighbour(origin, target, semanticRole, selectedField, origin.neighbours.get(target.path)?.direction ?? null);
      return;
    }

    if (origin.file?.extension === "md") {
      await this.writeRelationship(origin.file, target, selectedField);
      this.index.applyRelationshipEdit(origin.path, target.path, semanticRole, selectedField);
    } else if (target.file?.extension === "md") {
      const inverseRole = this.inverseRelationshipRole(semanticRole);
      const inverseField = this.inverseOntologyField(selectedField, semanticRole);
      await this.writeRelationship(target.file, origin, inverseField);
      this.index.applyRelationshipEdit(target.path, origin.path, inverseRole, inverseField);
    } else {
      new Notice("When the drag origin is not a Markdown note, the target must be a Markdown note.", 2800);
      return;
    }
  }

  async addOntologyToConnection(
    center: GraphPage,
    neighbour: GraphPage,
    semanticRole: RelationshipRole,
    selectedField: string,
    storagePathOverride: string | null = null,
  ): Promise<void> {
    const centerFile = center.file?.extension === "md" ? center.file : null;
    const neighbourFile = neighbour.file?.extension === "md" ? neighbour.file : null;
    if (!centerFile && !neighbourFile) {
      new Notice("At least one side of the relationship must be a Markdown note.", 2600);
      return;
    }

    const candidates = this.index.relationshipStorageCandidates(center.path, neighbour.path);
    let storagePath: string | null = storagePathOverride && candidates.includes(storagePathOverride)
      ? storagePathOverride
      : (candidates.length > 0 ? candidates[0] : null);
    if (!storagePath) storagePath = centerFile?.path ?? neighbourFile?.path ?? null;

    if (storagePath === centerFile?.path && centerFile) {
      await this.addRelationshipOntology(centerFile, neighbour, selectedField);
      this.index.applyAdditionalRelationshipEdit(center.path, neighbour.path, semanticRole, selectedField);
    } else if (storagePath === neighbourFile?.path && neighbourFile) {
      const inverseRole = this.inverseRelationshipRole(semanticRole);
      const inverseField = this.inverseOntologyField(selectedField, semanticRole);
      await this.addRelationshipOntology(neighbourFile, center, inverseField);
      this.index.applyAdditionalRelationshipEdit(neighbour.path, center.path, inverseRole, inverseField);
    } else if (centerFile) {
      await this.addRelationshipOntology(centerFile, neighbour, selectedField);
      this.index.applyAdditionalRelationshipEdit(center.path, neighbour.path, semanticRole, selectedField);
    } else if (neighbourFile) {
      const inverseRole = this.inverseRelationshipRole(semanticRole);
      const inverseField = this.inverseOntologyField(selectedField, semanticRole);
      await this.addRelationshipOntology(neighbourFile, center, inverseField);
      this.index.applyAdditionalRelationshipEdit(neighbour.path, center.path, inverseRole, inverseField);
    }
  }

  async relinkCentralNeighbour(
    center: GraphPage,
    neighbour: GraphPage,
    semanticRole: RelationshipRole,
    selectedField: string,
    existingDirection: LinkDirection | null = null,
    storagePathOverride: string | null = null,
  ): Promise<void> {
    const centerFile = center.file?.extension === "md" ? center.file : null;
    const neighbourFile = neighbour.file?.extension === "md" ? neighbour.file : null;
    if (!centerFile && !neighbourFile) {
      new Notice("At least one side of the relationship must be a Markdown note.", 2600);
      return;
    }

    const inverseField = this.inverseOntologyField(selectedField, semanticRole);
    const candidates = this.index.relationshipStorageCandidates(center.path, neighbour.path);
    let storagePath: string | null = storagePathOverride && candidates.includes(storagePathOverride)
      ? storagePathOverride
      : (candidates.length > 0 ? candidates[0] : null);
    if (!storagePath) storagePath = centerFile?.path ?? neighbourFile?.path ?? null;

    // Prefer the note that already owns the defining relationship evidence. If both Markdown
    // notes are valid declarers, RelationModal exposes a small "Store relationship in" chooser
    // with this intelligent choice preselected. We update one canonical frontmatter declaration,
    // rather than duplicating metadata in both notes. If the relationship previously had YAML on
    // the opposite note, remove that stale declaration first; body ontology is retained and the
    // resolver records it as overridden evidence when it conflicts with the new YAML authority.
    const existingFrontmatterOwners = new Set(
      this.index.evidenceBetween(center.path, neighbour.path)
        .filter((item) => item.sourceKind === "frontmatter-ontology")
        .map((item) => item.declaredByPath),
    );
    const cleanup: Promise<void>[] = [];
    if (centerFile && storagePath !== centerFile.path && existingFrontmatterOwners.has(centerFile.path)) {
      cleanup.push(this.clearFrontmatterRelationship(centerFile, neighbour));
    }
    if (neighbourFile && storagePath !== neighbourFile.path && existingFrontmatterOwners.has(neighbourFile.path)) {
      cleanup.push(this.clearFrontmatterRelationship(neighbourFile, center));
    }
    if (cleanup.length) await Promise.all(cleanup);
    if (storagePath === centerFile?.path && centerFile) {
      await this.writeRelationship(centerFile, neighbour, selectedField);
      this.index.applyRelationshipEdit(center.path, neighbour.path, semanticRole, selectedField);
    } else if (storagePath === neighbourFile?.path && neighbourFile) {
      const inverseRole = this.inverseRelationshipRole(semanticRole);
      await this.writeRelationship(neighbourFile, center, inverseField);
      this.index.applyRelationshipEdit(neighbour.path, center.path, inverseRole, inverseField);
    } else if (centerFile) {
      await this.writeRelationship(centerFile, neighbour, selectedField);
      this.index.applyRelationshipEdit(center.path, neighbour.path, semanticRole, selectedField);
    } else if (neighbourFile) {
      const inverseRole = this.inverseRelationshipRole(semanticRole);
      await this.writeRelationship(neighbourFile, center, inverseField);
      this.index.applyRelationshipEdit(neighbour.path, center.path, inverseRole, inverseField);
    }
  }

  validateRelatedNoteName(rawName: string): { stem: string; valid: boolean; error: string | null; existing: TFile | null } {
    let stem = rawName.trim();
    stem = stem.replace(/\.excalidraw(?:\.md)?$/i, "").replace(/\.md$/i, "").trim();
    if (!stem) return { stem: "", valid: false, error: "Type a note name.", existing: null };

    // Keep creation portable across desktop/mobile vaults and synced filesystems. These are the
    // characters Windows/macOS/Obsidian users most commonly cannot safely use in a filename.
    const hasProhibitedCharacter = [...stem].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 0x20 || '<>:"/\\|?*'.includes(character);
    });
    if (hasProhibitedCharacter) {
      return { stem, valid: false, error: 'The note name contains a prohibited filename character: < > : " / \\ | ? *', existing: null };
    }
    if (/[. ]$/.test(stem)) {
      return { stem, valid: false, error: "A note name cannot end with a period or space.", existing: null };
    }
    if (stem === "." || stem === "..") {
      return { stem, valid: false, error: "Choose a different note name.", existing: null };
    }
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(stem)) {
      return { stem, valid: false, error: "That note name is reserved by the filesystem.", existing: null };
    }

    const normalized = stem.toLocaleLowerCase();
    const existing = this.app.vault.getMarkdownFiles().find((file) => {
      const name = file.name.toLocaleLowerCase();
      const candidate = name.endsWith(".excalidraw.md")
        ? file.name.slice(0, -".excalidraw.md".length)
        : file.name.replace(/\.md$/i, "");
      return candidate.toLocaleLowerCase() === normalized;
    }) ?? null;

    return { stem, valid: true, error: null, existing };
  }

  isExcalidrawAvailable(): boolean {
    type RuntimePlugin = Plugin & { createDrawing?: (filename: string, foldername?: string) => Promise<TFile | string> };
    type PluginManagerBridge = { plugins?: Record<string, RuntimePlugin> };
    const manager = (this.app as unknown as { plugins?: PluginManagerBridge }).plugins;
    const automate = (window as unknown as { ExcalidrawAutomate?: { create?: unknown; getAPI?: unknown } }).ExcalidrawAutomate;
    return typeof automate?.create === "function" || typeof automate?.getAPI === "function" ||
      typeof manager?.plugins?.["obsidian-excalidraw-plugin"]?.createDrawing === "function";
  }

  async rememberNewNodeDefaultType(kind: "markdown" | "excalidraw"): Promise<void> {
    if (this.settings.newNodeDefaultType === kind) return;
    this.settings.newNodeDefaultType = kind;
    await this.saveSettings(false, false);
  }

  private async frontmatterDocumentLineRange(file: TFile): Promise<{ start: number; end: number } | null> {
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split(/\r?\n/);
    if (lines[0]?.trim() !== "---") return null;
    for (let line = 1; line < lines.length; line += 1) {
      const trimmed = lines[line].trim();
      if (trimmed === "---" || trimmed === "...") return { start: 0, end: line };
    }
    return null;
  }

  private linkCacheMatchesTarget(rawLink: string, hostPath: string, targetPath: string): boolean {
    const resolved = this.app.metadataCache.getFirstLinkpathDest(rawLink, hostPath);
    return resolved?.path === targetPath || this.normalizedNoteReferenceMatches(rawLink, targetPath);
  }

  private async markdownBodyReferenceLines(file: TFile, targetPath: string): Promise<number[]> {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];
    const frontmatter = await this.frontmatterDocumentLineRange(file);
    const lines = new Set<number>();
    for (const link of [...(cache.links ?? []), ...(cache.embeds ?? [])]) {
      if (!this.linkCacheMatchesTarget(link.link, file.path, targetPath)) continue;
      const line = link.position.start.line;
      if (frontmatter && line >= frontmatter.start && line <= frontmatter.end) continue;
      lines.add(line);
    }
    return [...lines].sort((a, b) => a - b);
  }

  private remainingBodyReferences(file: TFile, target: GraphPage, markdownLinkLines: readonly number[]): RemainingNodeReference[] {
    const references = new Map<number, RemainingNodeReference>();

    // Keep explicit parser provenance for inline ontology declarations rather than relying only on
    // Obsidian's generic link cache. This guarantees that deletion review can navigate to the exact
    // inline relationship occurrence even when the generic cache representation is incomplete.
    for (const evidence of this.index.evidenceBetween(file.path, target.path)) {
      if (evidence.declaredByPath !== file.path || evidence.declaredTargetPath !== target.path) continue;
      if (evidence.sourceKind !== "inline-ontology" || !evidence.line) continue;
      const line = Math.max(0, evidence.line - 1);
      references.set(line, {
        path: file.path,
        line,
        label: evidence.fieldName ? `${evidence.fieldName} at line ${line + 1}` : `Inline relationship at line ${line + 1}`,
        sourceKind: evidence.sourceKind,
      });
    }

    // Generic resolved/unresolved link evidence is pair-level and has no source position. Use
    // Obsidian's link cache for the actual Markdown-body occurrences, but do not duplicate a line
    // that is already represented by a more specific inline-ontology declaration above.
    for (const line of markdownLinkLines) {
      if (references.has(line)) continue;
      references.set(line, {
        path: file.path,
        line,
        label: `Link at line ${line + 1}`,
        sourceKind: "obsidian-link",
      });
    }

    return [...references.values()].sort((a, b) => a.line - b.line);
  }

  private referencingMarkdownFiles(target: GraphPage): TFile[] {
    const paths = new Set<string>();
    for (const relation of this.index.evidenceFrom(target.path)) {
      for (const evidence of relation.evidence) {
        if (evidence.declaredTargetPath !== target.path || evidence.declaredByPath === target.path) continue;
        paths.add(evidence.declaredByPath);
      }
    }
    const files: TFile[] = [];
    for (const path of paths) {
      const file = this.app.vault.getFileByPath(path);
      if (file?.extension === "md") files.push(file);
    }
    return files;
  }

  private frontmatterContainsTarget(file: TFile, target: GraphPage): boolean {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!frontmatter) return false;
    return Object.values(frontmatter).some((value) => this.valueContainsTarget(value, file, target));
  }

  private async removePropertyReferencesToNode(target: GraphPage): Promise<{
    hosts: string[];
    remaining: RemainingNodeReference[];
  }> {
    const hosts = this.referencingMarkdownFiles(target);
    const remaining = new Map<string, RemainingNodeReference>();

    for (const file of hosts) {
      if (this.frontmatterContainsTarget(file, target)) {
        this.pruneManagedMetadataWrites();
        this.managedMetadataWrites.set(file.path, Date.now() + 15000);
        const metadataChanged = this.waitForMetadataChange(file);
        let changed = false;
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
          for (const key of Object.keys(frontmatter)) {
            if (!this.valueContainsTarget(frontmatter[key], file, target)) continue;
            const next = this.removeTargetFromValue(frontmatter[key], file, target);
            if (next === undefined) delete frontmatter[key];
            else frontmatter[key] = next;
            changed = true;
          }
        });
        if (changed) await metadataChanged;
      }

      const bodyLines = await this.markdownBodyReferenceLines(file, target.path);
      this.index.removePropertyReferenceEvidence(file.path, target.path, bodyLines.length === 0);
      for (const reference of this.remainingBodyReferences(file, target, bodyLines)) {
        remaining.set(`${reference.path}\u0000${reference.line}`, reference);
      }
    }

    return { hosts: hosts.map((file) => file.path), remaining: [...remaining.values()] };
  }

  private async confirmDeleteNode(page: GraphPage): Promise<boolean> {
    const hasFile = Boolean(page.file);
    const firstUse = !this.settings.deletePromptInitialized;
    if (!firstUse && (!hasFile || !this.settings.confirmFileDelete)) return true;

    return new Promise<boolean>((resolve) => {
      new DeleteNodeConfirmationModal(this.app, {
        nodeName: page.name,
        hasFile,
        firstUse,
        confirmFileDelete: this.settings.confirmFileDelete,
        onConfirm: async (confirmFileDelete) => {
          const preferenceChanged = this.settings.confirmFileDelete !== confirmFileDelete;
          if (firstUse || preferenceChanged) {
            this.settings.deletePromptInitialized = true;
            this.settings.confirmFileDelete = confirmFileDelete;
            await this.saveSettings(false, false);
          }
          resolve(true);
        },
        onCancel: () => resolve(false),
      }).open();
    });
  }

  private deletionFallbackPath(deletedPath: string): string | null {
    for (let index = this.settings.navigationHistory.length - 1; index >= 0; index -= 1) {
      const path = this.settings.navigationHistory[index];
      if (path !== deletedPath && this.index.get(path)) return path;
    }
    return this.index.get("folder:/")?.path ?? null;
  }

  private removeFromNavigationHistory(path: string): void {
    this.settings.navigationHistory = this.settings.navigationHistory.filter((candidate) => candidate !== path);
  }

  async deleteNode(page: GraphPage, hostLeaf?: WorkspaceLeaf, wasCenter = false): Promise<void> {
    const target = this.index.get(page.path);
    if (!target || target.isFolder || target.isTag || target.url || (target.file && target.file.extension !== "md")) return;
    if (!(await this.confirmDeleteNode(target))) return;

    const path = target.path;
    if (target.file) {
      const file = target.file;
      await this.app.fileManager.trashFile(file);
      // Vault.delete normally dematerializes synchronously. Keep this idempotent fallback so the
      // workflow is correct even if an Obsidian version delivers the event on a later turn.
      this.index.dematerializeFile(path);
    }

    // Navigation is part of the delete command, not a side effect of the later metadata cleanup.
    // Remove the deleted path immediately and move a deleted center to the newest still-valid
    // history entry (walking farther back when necessary), or to the vault root when history is
    // exhausted. This happens before relationship-reference cleanup/index reconciliation.
    this.settings.pinnedNodes = this.settings.pinnedNodes.filter((candidate) => candidate !== path);
    this.removeFromNavigationHistory(path);
    if (wasCenter) {
      const fallback = this.deletionFallbackPath(path);
      if (fallback) {
        this.settings.lastActivePath = fallback;
        this.notifyNavigation(fallback);
      }
    }
    await this.saveSettings(false, false);

    const ghost = this.index.get(path);
    if (!ghost) return;
    const { remaining } = await this.removePropertyReferencesToNode(ghost);

    if (remaining.length) {
      new RemainingNodeReferencesModal(
        this.app,
        ghost.name,
        remaining,
        (reference) => this.openRelationshipEvidenceLocation({ path: reference.path, line: reference.line }, hostLeaf),
      ).open();
      return;
    }

    // Remaining references are handled above. Once they are gone, remove the dematerialized graph
    // endpoint when nothing else still references it; focus/history have already moved away.
    if (!this.index.removeVirtualPageIfUnreferenced(path)) return;
  }

  private async frontmatterPropertyLineRange(file: TFile, fieldName: string): Promise<{ start: number; end: number } | null> {
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split(/\r?\n/);
    if (lines[0]?.trim() !== "---") return null;

    const wanted = normalizeFieldName(fieldName);
    const keyPattern = /^(\s*)(?:"([^"]+)"|'([^']+)'|([^:#][^:]*?))\s*:/;
    for (let line = 1; line < lines.length; line += 1) {
      const text = lines[line];
      const trimmed = text.trim();
      if (trimmed === "---" || trimmed === "...") break;
      const match = text.match(keyPattern);
      if (!match) continue;
      const key = (match[2] ?? match[3] ?? match[4] ?? "").trim();
      if (!key || normalizeFieldName(key) !== wanted) continue;

      const indentation = match[1].length;
      let end = line;
      for (let nextLine = line + 1; nextLine < lines.length; nextLine += 1) {
        const nextText = lines[nextLine];
        const nextTrimmed = nextText.trim();
        if (nextTrimmed === "---" || nextTrimmed === "...") break;
        const nextKey = nextText.match(keyPattern);
        if (nextKey && nextKey[1].length <= indentation) break;
        end = nextLine;
      }
      return { start: line, end };
    }
    return null;
  }

  private async frontmatterPropertyContainsTarget(
    file: TFile,
    propertyRange: { start: number; end: number },
    targetPath: string,
  ): Promise<boolean> {
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split(/\r?\n/);
    const propertyText = lines.slice(propertyRange.start, propertyRange.end + 1).join("\n");
    return extractLinksFromValue(this.app, propertyText, file).some((path) => path === targetPath);
  }

  async directFrontmatterUnlinkCandidate(evidenceItems: readonly RelationEvidence[]): Promise<RelationEvidence | null> {
    const frontmatter = evidenceItems.filter((item) => item.sourceKind === "frontmatter-ontology");
    if (frontmatter.length !== 1) return null;
    const candidate = frontmatter[0];
    if (!candidate.fieldName) return null;

    const storage = this.app.vault.getAbstractFileByPath(candidate.declaredByPath);
    if (!(storage instanceof TFile) || storage.extension !== "md") return null;
    const propertyRange = await this.frontmatterPropertyLineRange(storage, candidate.fieldName);
    if (!propertyRange) return null;

    for (const evidence of evidenceItems) {
      if (evidence === candidate) continue;
      if (evidence.sourceKind !== "obsidian-link" && evidence.sourceKind !== "unresolved-link") return null;
      if (evidence.declaredByPath !== candidate.declaredByPath || evidence.declaredTargetPath !== candidate.declaredTargetPath) return null;
      const locations = await this.relationshipEvidenceLocations(evidence);
      // Obsidian's resolvedLinks table also counts links declared in YAML, while CachedMetadata.links
      // may omit their source positions. A positioned occurrence must live inside this one property
      // block. If no source position exists, verify the property block itself resolves to the same
      // target before treating the generic link evidence as a mirrored cache view. A body occurrence
      // still appears through CachedMetadata.links and therefore makes direct unlinking ambiguous.
      if (locations.length) {
        if (locations.some((location) =>
          location.path !== storage.path ||
          location.line < propertyRange.start ||
          location.line > propertyRange.end
        )) return null;
        continue;
      }
      if (!(await this.frontmatterPropertyContainsTarget(storage, propertyRange, candidate.declaredTargetPath))) return null;
    }
    return candidate;
  }

  async unlinkFrontmatterEvidence(evidence: RelationEvidence): Promise<boolean> {
    if (evidence.sourceKind !== "frontmatter-ontology" || !evidence.fieldName) return false;
    const storage = this.app.vault.getFileByPath(evidence.declaredByPath);
    const target = this.index.get(evidence.declaredTargetPath);
    if (!storage || storage.extension !== "md" || !target) return false;

    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storage.path, Date.now() + 15000);
    let changed = false;
    const wanted = normalizeFieldName(evidence.fieldName);
    await this.app.fileManager.processFrontMatter(storage, (frontmatter: Record<string, unknown>) => {
      for (const key of Object.keys(frontmatter)) {
        if (normalizeFieldName(key) !== wanted) continue;
        if (!this.valueContainsTarget(frontmatter[key], storage, target)) continue;
        const next = this.removeTargetFromValue(frontmatter[key], storage, target);
        if (next === undefined) delete frontmatter[key];
        else frontmatter[key] = next;
        changed = true;
        break;
      }
    });

    if (!changed) return false;
    this.index.applyFrontmatterRelationshipRemoval(storage.path, target.path, evidence.fieldName);
    return true;
  }

  async relationshipEvidenceLocations(evidence: RelationEvidence): Promise<Array<{ path: string; line: number; label: string }>> {
    const file = this.app.vault.getFileByPath(evidence.declaredByPath);
    if (!file || file.extension !== "md") return [];

    const positions: Array<{ path: string; line: number; label: string }> = [];
    const add = (line: number, label: string) => {
      const safeLine = Math.max(0, Math.floor(line));
      if (positions.some((item) => item.line === safeLine && item.label === label)) return;
      positions.push({ path: file.path, line: safeLine, label });
    };

    if (evidence.sourceKind === "inline-ontology" || evidence.sourceKind === "body-url") {
      if (evidence.line) add(evidence.line - 1, `Navigate to line ${evidence.line}`);
      return positions;
    }

    if (evidence.sourceKind === "obsidian-link" || evidence.sourceKind === "unresolved-link") {
      const cache = this.app.metadataCache.getFileCache(file);
      const linkCaches = [...(cache?.links ?? []), ...(cache?.embeds ?? [])];
      const targetLower = evidence.declaredTargetPath.replace(/\.md$/i, "").toLocaleLowerCase();
      const targetBase = targetLower.split("/").pop() ?? targetLower;
      const matchingLines: number[] = [];
      for (const link of linkCaches) {
        const resolved = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
        let matches = resolved?.path === evidence.declaredTargetPath;
        if (!matches && !resolved && evidence.sourceKind === "unresolved-link") {
          const raw = link.link.split("#", 1)[0].trim().replace(/\.md$/i, "").toLocaleLowerCase();
          matches = raw === targetLower || raw === targetBase || raw.split("/").pop() === targetBase;
        }
        if (matches) matchingLines.push(link.position.start.line);
      }
      matchingLines.forEach((line, index) => add(
        line,
        matchingLines.length > 1 ? `Navigate to link ${index + 1}` : "Navigate to link",
      ));
      return positions;
    }

    if (evidence.sourceKind === "frontmatter-ontology" || evidence.sourceKind === "date-property") {
      const fieldName = evidence.fieldName;
      if (!fieldName) return positions;
      const propertyRange = await this.frontmatterPropertyLineRange(file, fieldName);
      if (propertyRange) add(propertyRange.start, `Navigate to property “${fieldName}”`);
    }

    return positions;
  }

  async relationshipEvidenceSectionsBatch(evidences: readonly RelationEvidence[]): Promise<Map<string, RelationshipSourceSection[]>> {
    const result = new Map<string, RelationshipSourceSection[]>();
    for (const evidence of evidences) result.set(evidence.id, []);

    const groups = new Map<string, { file: TFile; evidences: RelationEvidence[] }>();
    for (const evidence of evidences) {
      const file = this.app.vault.getFileByPath(evidence.declaredByPath);
      if (!file || file.extension !== "md") continue;
      const group = groups.get(file.path) ?? { file, evidences: [] };
      group.evidences.push(evidence);
      groups.set(file.path, group);
    }

    await Promise.all([...groups.values()].map(async ({ file, evidences: fileEvidences }) => {
      // One source read/split per document, even if a connection has dozens of evidence records in
      // the same long note. Edge Properties is on-demand, but it should still stay cheap to skim.
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split(/\r?\n/);
      const keyPattern = /^(\s*)(?:"([^"]+)"|'([^']+)'|([^:#][^:]*?))\s*:/;
      const frontmatterPropertyRanges = (): Array<{ start: number; end: number; key: string }> => {
        if (lines[0]?.trim() !== "---") return [];
        const ranges: Array<{ start: number; end: number; key: string }> = [];
        for (let line = 1; line < lines.length; line += 1) {
          const text = lines[line];
          const trimmed = text.trim();
          if (trimmed === "---" || trimmed === "...") break;
          const match = text.match(keyPattern);
          if (!match || match[1].length !== 0) continue;
          const key = (match[2] ?? match[3] ?? match[4] ?? "").trim();
          if (!key) continue;
          let rangeEnd = line;
          for (let nextLine = line + 1; nextLine < lines.length; nextLine += 1) {
            const nextText = lines[nextLine];
            const nextTrimmed = nextText.trim();
            if (nextTrimmed === "---" || nextTrimmed === "...") break;
            const nextKey = nextText.match(keyPattern);
            if (nextKey && nextKey[1].length === 0) break;
            rangeEnd = nextLine;
          }
          ranges.push({ start: line, end: rangeEnd, key });
          line = rangeEnd;
        }
        return ranges;
      };
      const propertyRanges = frontmatterPropertyRanges();
      const paragraphRange = (line: number): { start: number; end: number } => {
        const clamped = Math.max(0, Math.min(lines.length - 1, line));
        const frontmatterRange = propertyRanges.find((range) => range.start <= clamped && clamped <= range.end);
        if (frontmatterRange) return { start: frontmatterRange.start, end: frontmatterRange.end };
        let start = clamped;
        let end = clamped;
        const isBoundary = (text: string): boolean => {
          const trimmed = text.trim();
          return trimmed === "" || trimmed === "---" || trimmed === "..." || /^#{1,6}\s+/.test(trimmed);
        };
        while (start > 0 && !isBoundary(lines[start - 1])) start -= 1;
        while (end + 1 < lines.length && !isBoundary(lines[end + 1])) end += 1;
        return { start, end };
      };
      const propertyRange = (fieldName: string): { start: number; end: number } | null => {
        const wanted = normalizeFieldName(fieldName);
        const range = propertyRanges.find((candidate) => normalizeFieldName(candidate.key) === wanted);
        return range ? { start: range.start, end: range.end } : null;
      };

      for (const evidence of fileEvidences) {
        const make = (startLine: number, endLine: number, label: string): RelationshipSourceSection => ({
          id: `${file.path}:${startLine}:${endLine}:${evidence.id}`,
          path: file.path, startLine, endLine, label,
          text: lines.slice(startLine, endLine + 1).join("\n"),
          sourceKind: evidence.sourceKind,
        });
        let sections: RelationshipSourceSection[] = [];
        if ((evidence.sourceKind === "frontmatter-ontology" || evidence.sourceKind === "date-property") && evidence.fieldName) {
          const range = propertyRange(evidence.fieldName);
          sections = range ? [make(range.start, range.end, `Property “${evidence.fieldName}”`)] : [];
        } else if ((evidence.sourceKind === "inline-ontology" || evidence.sourceKind === "body-url") && evidence.line) {
          const range = paragraphRange(evidence.line - 1);
          sections = [make(range.start, range.end, `Paragraph around line ${evidence.line}`)];
        } else if (evidence.sourceKind === "obsidian-link" || evidence.sourceKind === "unresolved-link") {
          const locations = await this.relationshipEvidenceLocations(evidence);
          const seen = new Set<string>();
          for (const location of locations) {
            const range = paragraphRange(location.line);
            const key = `${range.start}:${range.end}`;
            if (seen.has(key)) continue;
            seen.add(key);
            sections.push(make(range.start, range.end, locations.length > 1 ? `Link occurrence · line ${location.line + 1}` : `Link · line ${location.line + 1}`));
          }
        }
        result.set(evidence.id, sections);
      }
    }));
    return result;
  }

  async relationshipEvidenceSections(evidence: RelationEvidence): Promise<RelationshipSourceSection[]> {
    return (await this.relationshipEvidenceSectionsBatch([evidence])).get(evidence.id) ?? [];
  }

  async openRelationshipEvidenceLocation(
    location: { path: string; line: number },
    hostLeaf?: WorkspaceLeaf,
  ): Promise<void> {
    const file = this.app.vault.getFileByPath(location.path);
    if (!file || file.extension !== "md") return;

    const sidecarLeaf = hostLeaf ? this.availableSidecarLeaf(hostLeaf) : null;
    const leaf = sidecarLeaf ?? this.app.workspace.getLeaf("tab");
    this.lastDocumentLeaf = leaf;

    // Provenance navigation is a temporary inspection action. When an adjacent companion sidecar
    // exists, reuse that pane instead of spawning an unrelated tab, but do not make the evidence
    // note the new K-Plex center merely because the pinned sidecar emitted a file-open event.
    if (sidecarLeaf) {
      this.transientDocumentFollowSuppression = { path: file.path, until: Date.now() + 1500 };
    }

    // Force a native Markdown view even for .excalidraw.md so the provenance location is visible
    // as editable source text. The second argument is ephemeral view state; it scrolls to the
    // evidence line without persisting that transient navigation position in the workspace state.
    await leaf.setViewState(
      { type: "markdown", state: { file: file.path }, active: !sidecarLeaf },
      { line: location.line },
    );
    if (!sidecarLeaf) await this.app.workspace.revealLeaf(leaf);
  }

  private async ensureFolderPath(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    if (!normalized || normalized === "/") return;
    let current = "";
    for (const part of normalized.split("/").filter(Boolean)) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        try { await this.app.vault.createFolder(current); } catch { /* concurrent creation */ }
      }
    }
  }

  private async createNewFileInFolder(leafName: string, kind: GhostMaterializationKind, configuredFolder: string): Promise<TFile | null> {
    const normalizedFolder = configuredFolder ? normalizePath(configuredFolder) : "";
    await this.ensureFolderPath(normalizedFolder);

    const proposedName = kind === "excalidraw" ? `${leafName}.excalidraw.md` : `${leafName}.md`;
    const destination = normalizePath(normalizedFolder ? `${normalizedFolder}/${proposedName}` : proposedName);
    if (this.app.vault.getAbstractFileByPath(destination)) {
      new Notice(`A file already exists at ${destination}.`, 3000);
      return null;
    }

    // Mark the predicted path before creation because Obsidian may emit vault:create synchronously
    // inside create()/the Excalidraw API. K-Plex materializes the page itself as soon as the
    // returned TFile is available, so that event must not schedule a redundant whole-vault build.
    this.managedCreatedPaths.set(destination, Date.now() + MANAGED_CREATED_PATH_TTL_MS);
    const alternateExcalidrawPath = kind === "excalidraw"
      ? normalizePath(normalizedFolder ? `${normalizedFolder}/${leafName}.md` : `${leafName}.md`)
      : null;
    if (alternateExcalidrawPath) this.managedCreatedPaths.set(alternateExcalidrawPath, Date.now() + MANAGED_CREATED_PATH_TTL_MS);

    if (kind === "excalidraw") {
      type Automate = {
        reset?: () => void;
        getAPI?: () => Automate;
        create?: (params?: { filename?: string; foldername?: string; onNewPane?: boolean; silent?: boolean }) => Promise<string>;
      };
      const globalEA = (window as unknown as { ExcalidrawAutomate?: Automate }).ExcalidrawAutomate;
      const ea = typeof globalEA?.getAPI === "function" ? globalEA.getAPI() : globalEA;
      if (ea?.create) {
        try {
          ea.reset?.();
          const createdPath = normalizePath(await ea.create({
            filename: leafName,
            foldername: normalizedFolder || undefined,
            onNewPane: false,
            silent: true,
          }));
          const created = this.app.vault.getAbstractFileByPath(createdPath);
          if (!(created instanceof TFile)) throw new Error("Excalidraw did not return a created file.");
          this.managedCreatedPaths.set(created.path, Date.now() + MANAGED_CREATED_PATH_TTL_MS);
          if (created.extension !== "md") {
            this.managedCreatedPaths.delete(destination);
            if (alternateExcalidrawPath) this.managedCreatedPaths.delete(alternateExcalidrawPath);
            new Notice("Excalidraw created a legacy non-Markdown drawing. Enable Markdown Excalidraw files in Excalidraw settings to use it as a K-Plex note.", 5000);
            return null;
          }
          return this.rememberManagedCreatedFile(created);
        } catch (error) {
          this.managedCreatedPaths.delete(destination);
          if (alternateExcalidrawPath) this.managedCreatedPaths.delete(alternateExcalidrawPath);
          throw error;
        }
      }

      type RuntimePlugin = Plugin & { createDrawing?: (filename: string, foldername?: string) => Promise<TFile | string> };
      type PluginManagerBridge = { plugins?: Record<string, RuntimePlugin> };
      const manager = (this.app as unknown as { plugins?: PluginManagerBridge }).plugins;
      const excalidraw = manager?.plugins?.["obsidian-excalidraw-plugin"];
      if (!excalidraw?.createDrawing) {
        this.managedCreatedPaths.delete(destination);
        if (alternateExcalidrawPath) this.managedCreatedPaths.delete(alternateExcalidrawPath);
        new Notice("Excalidraw is not available.", 2200);
        return null;
      }
      try {
        const created = await excalidraw.createDrawing(leafName, normalizedFolder || undefined);
        const file = typeof created === "string" ? this.app.vault.getAbstractFileByPath(normalizePath(created)) : created;
        if (!(file instanceof TFile)) throw new Error("Excalidraw did not return a created file.");
        if (file.extension !== "md") {
          this.managedCreatedPaths.delete(destination);
          if (alternateExcalidrawPath) this.managedCreatedPaths.delete(alternateExcalidrawPath);
          new Notice("Excalidraw created a legacy non-Markdown drawing. Enable Markdown Excalidraw files in Excalidraw settings to use it as a K-Plex note.", 5000);
          return null;
        }
        return this.rememberManagedCreatedFile(file);
      } catch (error) {
        this.managedCreatedPaths.delete(destination);
        if (alternateExcalidrawPath) this.managedCreatedPaths.delete(alternateExcalidrawPath);
        throw error;
      }
    }

    try {
      const file = await this.app.vault.create(destination, "");
      return this.rememberManagedCreatedFile(file);
    } catch (error) {
      this.managedCreatedPaths.delete(destination);
      throw error;
    }
  }

  async createNewNodeInFolder(folder: GraphPage, rawName: string, kind: GhostMaterializationKind): Promise<GraphPage | null> {
    if (!folder.isFolder) return null;
    const validation = this.validateRelatedNoteName(rawName);
    if (!validation.valid) {
      new Notice(validation.error ?? "Enter a valid note name.", 2800);
      return null;
    }
    if (validation.existing) {
      new Notice(`A note named “${validation.stem}” already exists in the vault.`, 2800);
      return null;
    }

    const folderPath = folder.path === "folder:/"
      ? ""
      : folder.path.startsWith("folder:")
        ? normalizePath(folder.path.slice("folder:".length))
        : "";
    const file = await this.createNewFileInFolder(validation.stem, kind, folderPath);
    return file ? this.index.insertCreatedFile(file) : null;
  }

  openCreateInFolderModal(folder: GraphPage, hostLeaf?: WorkspaceLeaf): void {
    if (!folder.isFolder) return;
    new CreateFolderNoteModal(this, folder, hostLeaf).open();
  }

  private async writeCreatedNodeAlias(file: TFile, rawAlias: string): Promise<string> {
    const alias = rawAlias.trim();
    if (!alias) return "";
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(file.path, Date.now() + 15000);
    await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
      const key = Object.keys(frontmatter).find((candidate) => {
        const normalized = normalizeFieldName(candidate);
        return normalized === "alias" || normalized === "aliases";
      }) ?? "aliases";
      const current = frontmatter[key];
      const aliases = Array.isArray(current)
        ? current.filter((value): value is string => typeof value === "string")
        : typeof current === "string" && current.trim() ? [current] : [];
      if (!aliases.includes(alias)) frontmatter[key] = [...aliases, alias];
    });
    return alias;
  }

  private normalizedWebUrl(raw: string): string | null {
    const value = raw.trim();
    if (!/^https?:\/\//i.test(value)) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
    } catch {
      return null;
    }
  }

  async createNewRelatedFileForOrigin(origin: GraphPage, rawName: string, kind: GhostMaterializationKind, rawAlias = ""): Promise<TFile | null> {
    const validation = this.validateRelatedNoteName(rawName);
    if (!validation.valid) {
      new Notice(validation.error ?? "Enter a valid note name.", 2800);
      return null;
    }
    if (validation.existing) {
      new Notice(`A note named “${validation.stem}” already exists in the vault.`, 2800);
      return null;
    }

    // FileManager.getNewFileParent is the public Obsidian API that applies the user's new-note
    // location preference. Resolve it against the relationship origin rather than whichever editor
    // tab happens to be active while the modal is open.
    const proposedName = kind === "excalidraw" ? `${validation.stem}.excalidraw.md` : `${validation.stem}.md`;
    const sourcePath = origin.file?.path ?? origin.path;
    const configuredParent = this.app.fileManager.getNewFileParent(sourcePath, proposedName);
    const configuredFolder = configuredParent.path === "/" ? "" : configuredParent.path;
    const file = await this.createNewFileInFolder(validation.stem, kind, configuredFolder);
    if (!file) return null;
    await this.writeCreatedNodeAlias(file, rawAlias);
    return file;
  }

  async linkNewRelatedFile(origin: GraphPage, semanticRole: RelationshipRole, file: TFile, selectedField: string, rawAlias = ""): Promise<GraphPage> {
    // K-Plex already knows the complete minimum fact set for a newly created node. Publish both the
    // page and relationship before awaiting processFrontMatter/MetadataCache, then let the normal
    // incremental path reconcile richer metadata in the background.
    const alias = rawAlias.trim();
    const target = this.index.insertCreatedFile(file, alias ? [alias] : []);
    if (origin.file?.extension === "md") {
      this.index.applyRelationshipEdit(origin.path, target.path, semanticRole, selectedField);
      try {
        await this.writeRelationship(origin.file, target, selectedField);
      } catch (error) {
        this.index.applyFrontmatterRelationshipRemoval(origin.path, target.path, selectedField);
        throw error;
      }
      return target;
    }
    if (target.file?.extension === "md") {
      const inverseRole = this.inverseRelationshipRole(semanticRole);
      const inverseField = this.inverseOntologyField(selectedField, semanticRole);
      this.index.applyRelationshipEdit(target.path, origin.path, inverseRole, inverseField);
      try {
        await this.writeRelationship(target.file, origin, inverseField);
      } catch (error) {
        this.index.applyFrontmatterRelationshipRemoval(target.path, origin.path, inverseField);
        throw error;
      }
      return target;
    }
    throw new Error("A new K-Plex relationship requires at least one Markdown endpoint.");
  }

  async createWebLinkRelatedPage(
    origin: GraphPage,
    semanticRole: RelationshipRole,
    rawUrl: string,
    rawAlias: string,
    selectedField: string,
  ): Promise<GraphPage | null> {
    if (origin.file?.extension !== "md") {
      new Notice("Web links can only be added from a Markdown node.", 2800);
      return null;
    }
    const url = this.normalizedWebUrl(rawUrl);
    if (!url) {
      new Notice("Enter a valid http:// or https:// web link.", 2800);
      return null;
    }
    const alias = rawAlias.trim();
    const provisional: GraphPage = {
      path: url, file: null, name: alias || url, url, isFolder: false, isTag: false, mtime: null,
      neighbours: new Map(), aliases: [], tags: [], noteType: null, primaryStyleTag: null, styleTags: [], maxLabelLength: 0,
    };
    const escapedAlias = alias.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
    const reference = alias ? `[${escapedAlias}](${url})` : url;
    await this.writeRelationship(origin.file, provisional, selectedField, reference);
    const target = this.index.insertUrlPage(url, alias);
    this.index.applyRelationshipEdit(origin.path, target.path, semanticRole, selectedField);
    return target;
  }

  private placeholderPath(stem: string): string {
    // A placeholder has no physical location yet. Keep its graph/link identity pathless until the
    // user materializes it, at which point Obsidian's new-note rules determine the real folder.
    return stem.trim();
  }

  async createPlaceholderRelatedPage(
    origin: GraphPage,
    semanticRole: RelationshipRole,
    rawName: string,
    selectedField: string,
  ): Promise<GraphPage | null> {
    const validation = this.validateRelatedNoteName(rawName);
    if (!validation.valid) {
      new Notice(validation.error ?? "Enter a valid note name.", 2800);
      return null;
    }
    if (validation.existing) {
      new Notice(`A note named “${validation.stem}” already exists in the vault.`, 2800);
      return null;
    }
    if (origin.file?.extension !== "md") {
      new Notice("A placeholder relationship must be stored in a Markdown note.", 2800);
      return null;
    }

    const path = this.placeholderPath(validation.stem);
    const existing = this.index.get(path);
    if (existing) {
      await this.createRelationToPage(origin, semanticRole, existing, selectedField);
      return existing;
    }

    // Write the unresolved wiki link first. Only publish the virtual page after the vault write
    // succeeds, so a failed frontmatter edit cannot leave a detached placeholder in the live graph.
    const provisional: GraphPage = {
      path, file: null, name: validation.stem, url: null, isFolder: false, isTag: false, mtime: null,
      neighbours: new Map(), aliases: [], tags: [], noteType: null, primaryStyleTag: null,
      styleTags: [], maxLabelLength: 0,
    };
    await this.writeRelationship(origin.file, provisional, selectedField);
    const target = this.index.insertVirtualPage(path);
    this.index.applyRelationshipEdit(origin.path, target.path, semanticRole, selectedField);
    return target;
  }

  async finishNewRelatedNode(
    page: GraphPage,
    hostLeaf: WorkspaceLeaf | undefined,
    openForEditing: boolean,
  ): Promise<void> {
    this.notifyNavigation(page.path);
    if (!openForEditing || !page.file) return;
    const host = hostLeaf && hostLeaf.view.getViewType() !== KPLEX_SIDEPANEL_VIEW_TYPE
      ? hostLeaf
      : this.app.workspace.getLeavesOfType(EXCALIBRAIN_VIEW_TYPE)[0];
    if (host) {
      await this.openMarkdownInSidecar(host, page.file, 0, true);
      return;
    }
    await this.openInDocumentLeaf(page.file);
  }

  private ghostCreationLocations(page: GraphPage, stem: string): GhostMaterializationLocation[] {
    const normalizedGhostPath = normalizePath(page.path);
    const explicitFolderSeparator = normalizedGhostPath.lastIndexOf("/");
    if (explicitFolderSeparator > 0) {
      const explicitFolder = normalizedGhostPath.slice(0, explicitFolderSeparator);
      return [{ folderPath: explicitFolder, label: explicitFolder }];
    }

    const proposedName = `${stem}.md`;
    const folders = new Set<string>();
    for (const parent of this.index.semanticParentPages(page)) {
      if (parent.url || parent.isTag || parent.isFolder) continue;
      const sourcePath = parent.file?.path ?? parent.path;
      if (!sourcePath) continue;
      const configuredParent = this.app.fileManager.getNewFileParent(sourcePath, proposedName);
      folders.add(configuredParent.path === "/" ? "" : normalizePath(configuredParent.path));
    }

    if (folders.size === 0) {
      const fallbackSource = this.settings.lastActivePath || "";
      const configuredParent = this.app.fileManager.getNewFileParent(fallbackSource, proposedName);
      folders.add(configuredParent.path === "/" ? "" : normalizePath(configuredParent.path));
    }

    return [...folders].sort((a, b) => a.localeCompare(b)).map((folderPath) => ({
      folderPath,
      label: folderPath || "Vault root",
    }));
  }

  private async materializeGhostPage(
    page: GraphPage,
    stem: string,
    kind: GhostMaterializationKind,
    folderPath: string,
  ): Promise<boolean> {
    const file = await this.createNewFileInFolder(stem, kind, folderPath);
    if (!file) return false;

    await this.rememberNewNodeDefaultType(kind);
    if (page.path === file.path) this.index.insertCreatedFile(file);
    else if (!this.index.renameFile(page.path, file)) this.index.insertCreatedFile(file);
    await this.openInDocumentLeaf(file);
    return true;
  }

  async createGhostNote(page: GraphPage): Promise<void> {
    if (page.file) {
      await this.openInDocumentLeaf(page.file);
      return;
    }
    if (page.url || page.isFolder || page.isTag) return;

    const rawLeafName = page.path.split("/").pop() ?? page.name;
    const validation = this.validateRelatedNoteName(rawLeafName);
    if (!validation.valid) {
      new Notice(validation.error ?? "The placeholder does not have a valid note name.", 3000);
      return;
    }
    if (validation.existing) {
      await this.openInDocumentLeaf(validation.existing);
      return;
    }

    const locations = this.ghostCreationLocations(page, validation.stem);
    const excalidrawAvailable = this.isExcalidrawAvailable();
    const defaultKind: GhostMaterializationKind = this.settings.newNodeDefaultType === "excalidraw" && excalidrawAvailable
      ? "excalidraw"
      : "markdown";

    if (locations.length === 1 && !excalidrawAvailable) {
      await this.materializeGhostPage(page, validation.stem, "markdown", locations[0].folderPath);
      return;
    }

    new MaterializeGhostModal(
      this.app,
      validation.stem,
      locations,
      excalidrawAvailable,
      defaultKind,
      (kind, folderPath) => this.materializeGhostPage(page, validation.stem, kind, folderPath),
    ).open();
  }

}
