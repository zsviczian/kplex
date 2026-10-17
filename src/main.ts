/**
 * Obsidian plugin lifecycle and host orchestration for indexing, navigation and vault mutations. Portable owners determine semantics; this host boundary supplies effects, cleanup and localized product feedback. Native metadata events request finite visible presentation repair independently of semantic readiness. Passive document synchronization preserves the current representation of exact matching native destinations; explicit opening and source inspection retain their separate navigation contracts. Support reporting projects retained facts without starting index work; this lifetime owns its bounded recorder and native report dialogs. Per-note Markdown zoom preferences follow Vault rename/delete events independently of index readiness.
 * Remote node image consent publishes synchronously before persistence and never requests semantics.
 * Style-manager drafts commit on the settings disk queue before live publication; style-only
 * completion refreshes cached presentation without clearing or reacquiring semantic scopes.
 * Appearance identities use that same queue. Unsupported color containers persist verbatim and
 * remain read-only; palette validation and semantic-cycle checks precede any durable write.
 * Unsuccessful source-backed startup adoption reports incomplete coverage rather than implying
 * that index preparation is still running; it never grants semantic write authority.
 * File deletion captures its ontology-cleanup preference before consent; settings navigation
 * cancels that approval, and concurrent preference changes require a fresh deletion request.
 * Missing Hidden configuration offers an explicitly approved unused property or exact settings
 * navigation. Configuration persists before policy publication and never reassigns existing fields.
 * Surface registration releases menus in its captured rendering document before migration/close retires that realm.
 * Linked-tab follow delegates managed companions to the Sidecar request owner so parallel App observations cannot reopen one destination twice.
 * Existing adjacent tabs enter Sidecar ownership only through explicit directional attachment; geometry offers eligibility without acquiring or resizing a pane.
 * Deletion captures bounded pre-trash property/body approval, writes only confirmed fields and retains
 * partial commits. Deletion Hidden covers captured resolved spellings and observed native unresolved
 * coordinates without guessing identities. Additive Hidden consent shares coherent source publication;
 * originating graph/details owners retire pending dialogs while plugin lifetime owns saved work.
 * Its foreground write lease ends before lower-priority source publication can checkpoint.
 * Folder/tag notices supply complete literal references to the shared localization formatter.
 * Native fold sessions hide only a verified two-group pair; captured recovery and ownership epochs
 * restore before native reveal, release, migration or teardown without persisting zero dimensions.
 * New-file relationship additions persist against native file identities independently of semantic
 * indexing; current host metadata drives subsequent graph reconciliation and editor completion.
 * Creation dialogs choose vault-relative destinations from folder metadata; explicit placeholder
 * relocation approves bounded native reference occurrences and retains partial-write recovery locally.
 */
import { mergeGraphLensDefinitions } from "./lens/GraphLens";
import { appearanceColorReferences } from "./core/contracts/appearance";
import { requireNamedColor } from "./core/plex/colorEditing";
import * as appearanceThemes from "./core/plex/appearanceThemes";
import type {StyleEditorModal} from "./ui/StyleEditorModal";

import { FileView, ItemView, MarkdownView, Menu, Notice, Platform, Plugin, TFile, TFolder, apiVersion, getLanguage, getAllTags, normalizePath, type Editor, type HoverParent, type WorkspaceLeaf } from "obsidian";
import { captureSettingsPolicy, classifySettingsChange, isStyleOnlySettingsChange, type SettingsPolicy } from "./core/graph/settingsPolicy";
import { removeMarkdownZoomModes, renameMarkdownZoomModes } from "./core/plex/markdownZoomPreferences";
import { GraphIndex } from "./index/GraphIndex";
import { DEFAULT_SETTINGS, KplexSettingTab, migrateAndMergeSettings, importExcaliBrainGraphSettings, type DocumentSyncMode, type KplexSettings, type KplexLayoutProfile, type KplexViewSurface, type SidecarPosition, type StyleSettingsDraft, type StyleCommitResult } from "./settings";
import { STYLE_SETTINGS_KEYS } from "./core/contracts/appearance";
import { cyclicSemanticColorSlots, migrateColorPreferences } from "./core/plex/colorPreferences";
import { KPLEX_VIEW_TYPE, KPLEX_SIDEPANEL_VIEW_TYPE, KplexView, KplexSidepanelView } from "./ui/KplexView";
import { RelationModal, type RelationModalOptions } from "./ui/RelationModal";
import { NewRelatedNoteModal, type RelatedNoteInvocation } from "./ui/NewRelatedNoteModal";
import { CreateFolderNoteModal } from "./ui/CreateFolderNoteModal";
import { MaterializeGhostModal, type GhostMaterializationKind, type GhostMaterializationLocation } from "./ui/MaterializeGhostModal";
import { DeleteNodeConfirmationModal, RemainingNodeReferencesModal, HideRelationshipModal, type DeleteNodePreview, type DeleteSourcePreview, type RemainingNodeReference } from "./ui/DeleteNodeModal";
import { HiddenFieldSetupModal, type HiddenFieldSetupChoice } from "./ui/HiddenFieldSetupModal";
import { navigatePluginSettings } from "./adapters/obsidian/settingsNavigation";
import { suggestHiddenProperty } from "./adapters/obsidian/hiddenPropertyName";
import { LinkDirection, type GateRole, type GraphPage, type RelationshipRole } from "./types";
import { OntologySuggester } from "./editor/OntologySuggester";
import { isWebViewerAvailable, openExternalUrl } from "./adapters/obsidian/externalUrl";
import { normalizeFieldName, parseBodyMetadata, iterateLinkReferencesFromValue } from "./core/parser/metadata";
import { extractLinksFromValue, iterateResolvedLinksFromValue } from "./index/fieldParser";
import type { RelationEvidence } from "./index/RelationEvidence";
import { AddToOntologyModal, type OntologyAssignmentRole } from "./ui/AddToOntologyModal";
import { NoteTypeModal } from "./ui/NoteTypeModal";
import { activeLayoutProfile, effectiveViewSettings, layoutProfileKey } from "./ui/viewProfile";
import { mergeTypographyOverride, resetTypographyOverride as resetDeviceTypography, type TypographyField, type TypographyValues } from "./core/plex/typographyPreferences";
import { persistedLayoutDeviceClass, type PersistedLayoutDeviceClass } from "./core/plex/viewPresentation";
import { readObsidianPresentationEnvironment } from "./adapters/obsidian/presentationEnvironment";
import { createObsidianTranslator } from "./adapters/obsidian/localization";
import { createTranslator, type Translator } from "./lang";
import { isGraphTabCommandAvailable, isPopoutCommandAvailable, primaryOpenSurface } from "./core/plex/viewPresentation";
import { createAdjacentFileLeaf } from "./adapters/obsidian/adjacentFileLeaf";
import { isEmbeddedMarkdownLeaf } from "./adapters/obsidian/embeddedMarkdownLeaf";
import { StartupDiagnostics } from "./adapters/obsidian/startupDiagnostics";
import { writeRelationshipMetadata, SavedRelationshipPendingError, relationshipMetadataPayload } from "./adapters/obsidian/relationshipMetadataWrite";
import { SOURCE_DECODE_BUDGET_BYTES } from "./index/SourceFacts";
import { perfNow } from "./util/perf";
import { createIndexDiagnosticsReport } from "./adapters/obsidian/indexDiagnosticsReport";
import { createSupportReport } from "./application/supportReport";
import type { IndexingActivityCapture } from "./application/IndexingActivity";
import { SessionEventRecorder } from "./application/SessionEventRecorder";
import { SupportClipboardSession } from "./application/supportClipboard";
import { SupportReportModal } from "./adapters/obsidian/SupportReportModal";
import { readSupportCustomizations } from "./adapters/obsidian/supportEnvironment";
import { PartialRelatedFileError } from "./adapters/obsidian/relatedFileOutcome";
import { capturePlaceholderRelocation, applyPlaceholderRelocation, placeholderReference, type PlaceholderRelocation } from "./adapters/obsidian/placeholderRelocation";
import { ActionManager, type ActionContext, type ActionImplementations, type SidecarFoldRoute, type SidecarFoldTarget } from "./application/ActionManager";
import { frontmatterDeclarationKey } from "./application/frontmatterUnlink";
import { ACTION_BY_ID, ACTION_RELATION_ROLES, type ActionId, type ActionOutcome, type ActionRequest, type Availability } from "./core/plex/actions";
import { compileActionBindings, migrateActionPreferences, sanitizeActionPreferences, type ActionPreferencesV1 } from "./core/plex/actionPreferences";
import { createActionCommandPublisher, type ActionCommandPublisher } from "./adapters/obsidian/actionCommands";
import { actionNodeRef, resolveActionPage } from "./adapters/obsidian/actionNode";
import { translateActionText } from "./ui/actionPresentation";
import { ActionTargetPicker } from "./ui/ActionTargetPicker";
import { PlexFoldSession, plexFoldIdentity, type PlexFoldCandidate } from "./ui/PlexFoldSession";

/** Public build-time identity; finite source harnesses may omit the esbuild replacement. */
declare const __KPLEX_BUILD_ID__: string;

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

/** Confirmation authority for one physical property; replacement files never inherit approval. */
export type FrontmatterUnlinkExpectation = Readonly<{
  storage: TFile;
  target: TFile | null;
  storagePath: string;
  targetPath: string;
  fieldKey: string;
  declarationKey: string;
  viewSourcePath: string;
  viewTargetPath: string;
}>;

/** A writing adapter signals commitment only after the existing canonical pair publication. */
export type RelationshipWriteResult = { state: "saved-published"; page: GraphPage } | { state: "unavailable" };

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const MANAGED_CREATED_PATH_TTL_MS = 4_000;
const RECENT_LEAF_HISTORY_LIMIT = 20;

type RecentIndexedNavigationTarget = {
  leaf: WorkspaceLeaf;
  path: string;
  file: TFile | null;
};

/** Finite appearance intents cross the same settings queue; initialization/import never add another writer. */
type StyleCommitOptions = Readonly<{themeAction?: appearanceThemes.AppearanceThemeAction; legacyImport?: unknown; initializeThemes?: {existing: boolean};
  /** Imperative compatibility callers may replace a coherent root/library pair that still differs from disk. */
  persistExistingChanges?: boolean}>;

export default class KplexPlugin extends Plugin {
  settings: KplexSettings = DEFAULT_SETTINGS;
  index!: GraphIndex;
  /** Shared action engine; React surface ports retain their own state and owning document. */
  actionManager!: ActionManager;
  private actionPublisher: ActionCommandPublisher | null = null;
  private readonly actionPreferenceListeners = new Set<() => void>();
  private readonly actionSurfaceHosts = new Map<string, { generation: number; leaf: WorkspaceLeaf }>();
  private readonly actionWindows = new WeakMap<Window, string>();
  private actionWindowSequence = 0;
  private actionInvocationSequence = 0;
  private readonly actionEditors = new Map<string, Editor>();
  private readonly actionDialogs = new Map<{ close(): void }, { surfaceId?: string; generation?: number }>();
  /** The host owns Settings navigation; the tab owns rendered shortcut controls and cleanup. */
  private settingsTab: KplexSettingTab | null = null;
  private actionPreferenceQueue: Promise<void> = Promise.resolve();
  private settingsWriteQueue: Promise<void> = Promise.resolve();
  private appearanceThemeActivation = 0;
  private appearanceThemeListeners = new Set<() => void>();
  /** A future version remains intact on disk; editing its conservative fallback is disabled. */
  actionPreferenceUnsupportedVersion: number | undefined;
  actionPreferenceMigrationSkipped: readonly ActionId[] = [];
  actionPreferenceMigrationIssueCount = 0;
  private savedSettingsPolicy: SettingsPolicy | null = null;
  translator: Translator = createTranslator("en");
  private rebuildTimer: number | null = null;
  private indexDirty = true;
  private linkedDocumentLeaf: WorkspaceLeaf | null = null;
  private lastDocumentLeaf: WorkspaceLeaf | null = null;
  /** Chronological session history of active leaves, oldest to newest. */
  private recentLeafHistory: WorkspaceLeaf[] = [];
  private readonly hoverParent: HoverParent = { hoverPopover: null };
  private reactiveIndexListenersRegistered = false;
  private preRestoreChanged = false;
  private preRestoreUncoveredChanges = false;
  private readonly preRestoreReasons = new Map<string, number>();
  private readonly preRestoreMarkdownPaths = new Map<string, number>();
  private preRestoreListenerCleanup: (() => void) | null = null;
  private openKplexViews = 0;
  private layoutReady = false;
  private metadataStabilized = false;
  private metadataStabilityPromise: Promise<number> | null = null;
  private readonly indexBacklogReasons = new Set<string>();
  private indexDirtyRevision = 0;
  private rebuildTask: Promise<void> | null = null;
  private visibleMetadataTimer: number | null = null;
  private readonly visibleMetadataPaths = new Set<string>();
  private unloading = false;
  private initialIndexTask: Promise<void> | null = null;
  private initialIndexComplete = false;
  private initialSourceIndexIncomplete = false;
  /** In-memory guard against duplicate claims while the persisted one-time startup guidance flag saves. */
  private startupIndexInfoBubbleClaimed = false;
  private snapshotRestoreTask: Promise<{ restored: boolean; fresh: boolean; createdAt: number | null; partial?: boolean }> | null = null;
  private readonly sidecarLeaves = new Map<WorkspaceLeaf, WorkspaceLeaf>();
  /** One managed leaf serializes native opens; newer targets retire queued mode/persistence and known older file-open echoes. */
  private readonly passiveSidecarSyncRequests = new WeakMap<WorkspaceLeaf, {
    leaf: WorkspaceLeaf;
    file: TFile | null;
    filePath: string | undefined;
    url: string | null;
    pending: boolean;
    nativeCompletion: Promise<void>;
    nativeFile: TFile | null;
    previousNativeFile: TFile | null;
  }>();
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
  private readonly collapsedPlexHosts = new Map<WorkspaceLeaf, PlexFoldSession>();
  /** Incarnation metadata only; existing Sidecar and fold maps remain the sole owner inventories. */
  private readonly plexFoldRevisions = new WeakMap<WorkspaceLeaf, number>();
  private readonly sidecarListeners = new Set<() => void>();
  private transientDocumentFollowSuppression: { path: string; until: number } | null = null;
  private readonly navigationListeners = new Set<(path: string) => void>();
  private readonly searchFocusListeners = new Map<WorkspaceLeaf, () => void>();
  private readonly nodeFlairListeners = new Set<(path: string) => void>();
  private readonly indexStatusListeners = new Set<() => void>();
  /** Lazily established Markdown total; known membership changes maintain it without vault enumeration. */
  private cachedMarkdownFileCount: number | null = null;
  private readonly kplexVisibilityListeners = new Set<() => void>();
  private visibleKplexLeaves = new Set<WorkspaceLeaf>();
  private lastIndexStatusKey = "";
  private lastStartupProgressNotification = 0;
  private readonly graphLensListeners = new Set<(lenses: KplexSettings["graphLenses"]) => void>();
  private readonly managedMetadataWrites = new Map<string, number>();
  /** Pending saved relationship observers release on unload, rename/delete or actual convergence. */
  private readonly relationshipWriteCancels = new Set<() => void>();
  /** Paths suppress the synchronous vault:create rebuild; object identity protects optimistic UI. */
  private readonly managedCreatedPaths = new Map<string, number>();
  private readonly managedCreatedFiles = new WeakSet<TFile>();
  /** Markdown files whose metadata/body changed since the last published graph. */
  private readonly dirtyMarkdownPaths = new Set<string>();
  /** Rename-only metadata notifications are semantic no-ops when mtime/size are unchanged. */
  private readonly renameMetadataSuppressions = new Map<string, { mtime: number; size: number; until: number }>();
  /** Parent and child deletion events may overlap; count each physical Markdown identity once. */
  private readonly deletedMarkdownFiles = new WeakSet<TFile>();
  private activeKplexMenu: Menu | null = null;
  private activeKplexMenuDocument: Document | null = null;
  private activeKplexMenuLeaf: WorkspaceLeaf | null = null;
  /** A native hide can precede this window listener within the same Escape dispatch. */
  private justClosedKplexMenu: { leaf: WorkspaceLeaf | null; document: Document } | null = null;
  private kplexMenuReleaseTimer: number | null = null;
  /** Cancel the owning menu without letting the same Escape move focus to a previous native file tab. */
  private readonly kplexMenuEscapeKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || (!this.activeKplexMenu && !this.justClosedKplexMenu)) return;
    const leaf = this.activeKplexMenuLeaf ?? this.justClosedKplexMenu?.leaf;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dismissKplexMenu();
    if (leaf?.view.containerEl.isConnected && (leaf.view.getViewType() === KPLEX_VIEW_TYPE
      || leaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE)) {
      this.app.workspace.setActiveLeaf(leaf, { focus: true });
    }
  };
  /** Close a tracked menu on outside input while allowing its own items to receive their click. */
  private readonly kplexMenuOutsidePointerDown = (event: PointerEvent): void => {
    const target = event.target && typeof event.target === "object" && "closest" in event.target
      ? event.target as Element
      : null;
    if (target?.closest(".menu")) return;
    this.dismissKplexMenu();
  };

  private runningKplexSettings(): unknown {
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

  readonly startupDiagnostics = new StartupDiagnostics();
  /** Passive scalar-only evidence for this plugin lifetime, never a source or publication owner. */
  readonly supportEvents = new SessionEventRecorder(/** Use the existing host monotonic clock without a timer. */ () => window.performance.now());
  private lastSupportIndexPhase: string | null = null;

  /** Register host resources; optional startup diagnostics observe this exact production path. */
  async onload(): Promise<void> {
    this.supportEvents.record("plugin-start");
    this.startupDiagnostics.begin((window as Window & { kplexStartupDiagnosticsEnabled?: boolean }).kplexStartupDiagnosticsEnabled === true);
    this.translator = createObsidianTranslator();
    const ownData: unknown = await this.loadData();
    const hasOwnData = ownData !== null && ownData !== undefined;
    const ownRecord = ownData && typeof ownData === "object" ? ownData as Record<string, unknown> : null;
    // A persisted record is an existing installation even when newer fields/old flags are absent.
    const alreadyKplex = hasOwnData;
    this.settings = migrateAndMergeSettings(ownData);
    const actionMigration = migrateActionPreferences(ownData, readObsidianPresentationEnvironment().keyConvention);
    this.settings.actionPreferences = actionMigration.preferences;
    this.actionPreferenceUnsupportedVersion = actionMigration.unsupportedVersion;
    this.actionPreferenceMigrationSkipped = actionMigration.skippedDefaults;
    this.actionPreferenceMigrationIssueCount = actionMigration.issues.length;
    this.savedSettingsPolicy = captureSettingsPolicy(this.settings);
    const initializedChanged = alreadyKplex && !ownRecord?.kplexInitialized;
    if (initializedChanged) {
      this.settings.kplexInitialized = true;
    }
    if (hasOwnData && (initializedChanged || actionMigration.migrated)) {
      await this.persistSettingsSnapshot();
    }

    this.startupDiagnostics.mark("settings-loaded");
    this.index = new GraphIndex(this);
    this.registerMarkdownZoomPreferenceListeners();
    // URL acquisition is independent of MetadataCache, local graph preparation and full Eager inventory.
    this.registerEvent(this.app.vault.on("modify", /** Retire exact URL facts on content edits, including equal-stat writes. */
      file => { if (file instanceof TFile && file.extension === "md") void this.index.refreshUrlOwner(file.path); }));
    this.registerEvent(this.app.vault.on("create", /** New Markdown owners join the independent URL cache. */
      file => { if (file instanceof TFile && file.extension === "md" && this.layoutReady) void this.index.refreshUrlOwner(file.path); }));
    this.registerEvent(this.app.vault.on("delete", /** Deleted owners cannot retain URL reference counts. */
      file => { if (file instanceof TFile && file.extension === "md") void this.index.refreshUrlOwner(file.path); }));
    this.registerEvent(this.app.vault.on("rename", /** Old URL source coordinates retire before the renamed owner publishes. */
      (file, oldPath) => { if (file instanceof TFile) {
        if (oldPath.toLowerCase().endsWith(".md")) void this.index.refreshUrlOwner(oldPath);
        if (file.extension === "md") void this.index.refreshUrlOwner(file.path);
      } }));

    this.registerView(KPLEX_VIEW_TYPE, (leaf: WorkspaceLeaf) => new KplexView(leaf, this));
    this.registerView(KPLEX_SIDEPANEL_VIEW_TYPE, (leaf: WorkspaceLeaf) => new KplexSidepanelView(leaf, this));
    this.registerHoverLinkSource(KPLEX_VIEW_TYPE, { display: "K-Plex", defaultMod: false });
    this.registerHoverLinkSource(KPLEX_SIDEPANEL_VIEW_TYPE, { display: "K-Plex", defaultMod: false });
    this.settingsTab = new KplexSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    this.registerEditorSuggest(new OntologySuggester(this));
    this.addRibbonIcon("brain-circuit", this.translator("ribbon.open"), () => void this.activateView());

    this.initializeActions();

    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      // A requested Presentation/other tab in a folded group must become visible without
      // redirecting native activation to the Plex or its managed document.
      if (leaf) for (const [host, session] of this.collapsedPlexHosts) {
        if (this.leafGroupElement(leaf) === session.hostGroup) this.restoreCollapsedPlex(host);
      }
      if (this.reconcilePlexFolds()) void this.saveSettings(false, false);
      // Capture every actual leaf activation in sequence. Do not decide here whether the leaf is a
      // file/Web Viewer: active-leaf-change can arrive before a newly activated view is fully
      // materialized. Resolution walks this history backward and inspects each leaf's current view.
      this.rememberLeafActivation(leaf);
      this.validateLinkedDocumentLeaf();
      this.notifySidecar(); // The selected neighboring tab can change while no Sidecar is owned.
      this.onKplexVisibilityMayHaveChanged();
    }));
    this.registerEvent(this.app.workspace.on("file-open", /** Native replacement may retire a fold; ordinary file/representation changes preserve it. */ () => {
      if (this.reconcilePlexFolds()) void this.saveSettings(false, false);
      this.notifySidecar();
    }));
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      let changed = this.reconcilePlexFolds();
      for (const [host, sidecar] of [...this.sidecarLeaves.entries()]) {
        const hostAttached = this.leafIsAttached(host);
        const sidecarAttached = this.leafIsAttached(sidecar);
        if (!hostAttached || !sidecarAttached) {
          this.restoreCollapsedPlex(host);
          this.deleteSidecarOwner(host);
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
          this.deleteSidecarOwner(host);
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
      // Refresh explicit attachment offers as well as owned controls when native splits change.
      // Geometry alone never promotes an ordinary adjacent tab to managed ownership.
      this.notifySidecar();
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
        this.installPreRestoreChangeFence();
        const legacySettings = !alreadyKplex ? this.runningKplexSettings() : null;
        // First-use migration follows the actual loaded-data/import state. Never persist pristine
        // factory presets before a running ExcaliBrain appearance has had its existing import path.
        await this.updateStyleSettings(/** Initialization captures effective migrated appearance without editing it. */ () => {}, this.captureAppearanceOwner(), {
          initializeThemes: {existing: hasOwnData || legacySettings !== null},
          ...(legacySettings === null ? {} : {legacyImport: legacySettings}),
        });
        if (legacySettings !== null) new Notice(this.translator("notice.excaliBrainSettingsImported"), 2600);

        if (this.unloading) return;
        this.layoutReady = true;
        void this.index.startBackgroundUrlIndex();
        this.startupDiagnostics.mark("layout-ready");
        await this.index.primePhysicalSearchCatalog();
        if (this.unloading) return;
        const hostCenter = this.startupGraphSeedPaths()[0];
        if (hostCenter) void this.index.withForegroundPriority(() => this.index.publishHostMetadataPreview(hostCenter), 1);

        // Re-associate a persisted sidecar before normal recent-tab synchronization is allowed to
        // run. This uses only Obsidian's restored workspace geometry/view state; it must not wait
        // for the semantic graph or create a new split.
        if (this.settings.sidecarOpen) {
          const restoredHost = this.app.workspace.getLeavesOfType(KPLEX_VIEW_TYPE)[0];
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
        const restoreStarted = perfNow();
        this.supportEvents.record("cache-restore-start", { category: "cache" });
        let restored: Awaited<ReturnType<GraphIndex["restorePersistedSnapshot"]>>;
        try {
          this.snapshotRestoreTask ??= this.index.restorePersistedSnapshot(startupSeedPaths);
          restored = await this.snapshotRestoreTask;
        } catch (error) {
          this.supportEvents.record("cache-restore-failure", { category: "cache", outcome: "failed", durationMs: perfNow() - restoreStarted });
          throw error; // Preserve the existing startup rejection; diagnostics do not repair or retry it.
        }
        if (this.unloading) return;
        this.supportEvents.record("cache-restore-end", { category: "cache", outcome: restored.restored ? "complete" : "unavailable", durationMs: perfNow() - restoreStarted });
        if (restored.restored) {
          await this.refreshBookmarkedEntryPoints();
        }
        if (this.unloading) return;
        this.classifyPreRestoreChanges(restored.fresh);
        if (!restored.fresh) {
          this.indexDirtyRevision += 1;
          this.indexBacklogReasons.add(restored.restored ? "startup:stale-snapshot" : "startup:no-snapshot");
        }

        this.preRestoreListenerCleanup?.();
        this.registerReactiveIndexListeners();
        this.registerOntologyContextMenu();
        // Prewarm exactly once per Obsidian session when it is safe to do so. A fresh persisted
        // semantic snapshot makes this effectively free. On iOS, a first-ever large-vault cold
        // scan is deferred until K-Plex is actually opened: repeatedly rebuilding 20k notes in a
        // hidden WebView was responsible for a restart loop on iPad. The per-file IndexedDB body
        // checkpoints still let an interrupted first scan resume instead of starting at file zero.
        const noteCount = this.app.vault.getMarkdownFiles().length;
        const largeIosExpensiveRebuild = !this.index.isOnDemandMode() && Platform.isIosApp && !restored.fresh && !this.index.hasPendingSnapshotHydration() &&
          (!restored.restored || !this.index.hasIncrementalRestorePatch()) && noteCount > 5000;
        if (!largeIosExpensiveRebuild) void this.ensureInitialIndex();
      })();
    });
  }

  /**
   * Order startup graph candidates by the center K-Plex itself is expected to restore first.
   *
   * @returns Deduplicated graph paths suitable for both persisted-snapshot preview and cold-build
   * prioritization. The persisted K-Plex center wins over transient workspace focus during restore.
   */
  private startupGraphSeedPaths(): string[] {
    const paths: string[] = [];
    if (this.settings.lastActivePath) paths.push(this.settings.lastActivePath);
    const active = this.app.workspace.getActiveFile();
    if (active) paths.push(active.path);
    const recentLeaf = this.findRecentDocumentLeaf();
    const recentFile = this.fileForLeaf(recentLeaf);
    if (recentFile) paths.push(recentFile.path);
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

  /** Release action publications, surface registrations and host resources before index teardown. */
  onunload(): void {
    this.unloading = true;
    this.settingsTab?.disposeActionSettings();
    this.settingsTab = null;
    for (const dialog of this.actionDialogs.keys()) dialog.close();
    this.actionDialogs.clear();
    this.actionPublisher?.dispose();
    this.actionPublisher = null;
    this.actionManager?.dispose();
    this.actionPreferenceListeners.clear();
    this.actionSurfaceHosts.clear();
    this.actionEditors.clear();
    for (const cancel of this.relationshipWriteCancels) cancel();
    this.relationshipWriteCancels.clear();
    this.startupDiagnostics.dispose();
    this.supportEvents.dispose();
    this.dismissKplexMenu();
    if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
    if (this.startupInitializationTimer !== null) window.clearTimeout(this.startupInitializationTimer);
    for (const element of [...this.linkedLeafHighlightTimers.keys()]) this.clearLinkedLeafHighlight(element);
    for (const host of [...this.collapsedPlexHosts.keys()]) this.restoreCollapsedPlex(host);
    // A managed sidecar is still an ordinary Obsidian content tab. Plugin unload/disable must not
    // close the user's note; simply release K-Plex ownership and leave workspace leaves intact.
    this.sidecarLeaves.clear();
    this.nodeFlairListeners.clear();
    this.indexStatusListeners.clear();
    this.kplexVisibilityListeners.clear();
    this.visibleKplexLeaves.clear();
    this.graphLensListeners.clear();
    this.appearanceThemeListeners.clear();
    this.linkedDocumentLeaf = null;
    if (this.visibleMetadataTimer !== null) window.clearTimeout(this.visibleMetadataTimer);
    this.visibleMetadataPaths.clear();
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
      reason === "metadata:changed" || reason === "vault:create-markdown" ||
      reason === "coalesced-backlog" || reason === "interval",
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

  /** Discard startup events already covered by the captured physical inventory. */
  private classifyPreRestoreChanges(snapshotFresh: boolean): void {
    // The inventory already includes events delivered before its synchronous tree walk.
    // Keep only events that arrived while snapshot preview/hydration was loading.
    const inventoryRevision = this.index.getRestoreInventorySourceRevision();
    this.preRestoreUncoveredChanges = this.preRestoreChanged &&
      (inventoryRevision === null || inventoryRevision !== this.indexDirtyRevision);
    if (this.preRestoreUncoveredChanges) {
      for (const [reason, revision] of this.preRestoreReasons) {
        if (inventoryRevision === null || revision > inventoryRevision) this.indexBacklogReasons.add(reason);
      }
      for (const [path, revision] of this.preRestoreMarkdownPaths) {
        if (inventoryRevision === null || revision > inventoryRevision) this.dirtyMarkdownPaths.add(path);
      }
    }
    this.preRestoreReasons.clear();
    this.preRestoreMarkdownPaths.clear();
    this.indexDirty = !snapshotFresh || this.preRestoreUncoveredChanges || this.indexBacklogReasons.size > 0;
  }

  /** Capture changes during snapshot inspection before normal event-driven work is registered. */
  private installPreRestoreChangeFence(): void {
    if (this.preRestoreListenerCleanup) return;
    const mark = (reason: string, file?: TFile): void => {
      this.preRestoreChanged = true;
      this.indexDirtyRevision += 1;
      this.preRestoreReasons.set(reason, this.indexDirtyRevision);
      if (file?.extension === "md") this.preRestoreMarkdownPaths.set(file.path, this.indexDirtyRevision);
    };
    const created = this.app.vault.on("create", (item) => {
      this.index.invalidateHostStructure();
      mark(item instanceof TFile && item.extension === "md" ? "vault:create-markdown" : "vault:create",
        item instanceof TFile ? item : undefined);
      if (item instanceof TFile) this.index.updateHostFileAvailability(item.path, item);
      else if (item instanceof TFolder) void this.index.updateHostFolderAvailability(item.path, item);
    });
    const deleted = this.app.vault.on("delete", (item) => {
      this.index.invalidateHostStructure();
      mark("vault:delete", item instanceof TFile ? item : undefined);
      if (item instanceof TFile) this.index.updateHostFileAvailability(item.path);
      else if (item instanceof TFolder) void this.index.updateHostFolderAvailability(item.path);
    });
    const renamed = this.app.vault.on("rename", (item, oldPath) => {
      this.index.invalidateHostStructure();
      mark("vault:rename", item instanceof TFile ? item : undefined);
      if (item instanceof TFile) this.index.updateHostFileAvailability(oldPath, item);
      else if (item instanceof TFolder) void this.index.updateHostFolderAvailability(oldPath, item);
    });
    const resolved = this.app.metadataCache.on("resolve", (file) => {
      if (this.app.vault.getFileByPath(file.path) === file) {
        this.index.refreshVisibleHostMetadataPreviews(file.path);
        void this.index.refreshVisiblePresentation(file.path);
      }
    });
    const metadata = this.app.metadataCache.on("changed", (file) => {
      if (this.app.vault.getFileByPath(file.path) !== file) return;
      const previousSourceRevision = this.indexDirtyRevision;
      mark("metadata:changed", file);
      void this.index.refreshVisiblePresentation(file.path);
      if (this.index.refreshVisibleHostMetadataPreviews(file.path, previousSourceRevision)) this.scheduleVisibleMetadataRefresh(file.path);
    });
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true;
      this.app.vault.offref(created);
      this.app.vault.offref(deleted);
      this.app.vault.offref(renamed);
      this.app.metadataCache.offref(metadata);
      this.app.metadataCache.offref(resolved);
      this.preRestoreListenerCleanup = null;
    };
    this.preRestoreListenerCleanup = release;
    this.register(release);
  }

  /** Maintain an already-established Markdown progress denominator in O(1); null remains genuinely unknown. */
  private adjustCachedMarkdownFileCount(delta: number): void {
    if (this.cachedMarkdownFileCount !== null) this.cachedMarkdownFileCount += delta;
  }

  /**
   * Keep durable note preferences attached to their physical file through startup and normal work.
   * Graph listeners are installed in separate restore phases and may skip folder moves before an
   * authoritative baseline exists; these lifecycle-registered listeners have no graph dependency.
   */
  private registerMarkdownZoomPreferenceListeners(): void {
    this.registerEvent(this.app.vault.on("rename", /** Move file/subtree overrides even while index restore is pending. */ (item, oldPath) => {
      const next = renameMarkdownZoomModes(this.settings.centralNodeMarkdownZoomModes, oldPath, item.path, item instanceof TFolder);
      if (next === this.settings.centralNodeMarkdownZoomModes) return;
      this.settings.centralNodeMarkdownZoomModes = next;
      void this.persistSettingsSnapshot().catch(/** Event saves must not leave an unhandled rejection; a later ordinary save can retry. */ () => {
        console.error("K-Plex could not save Markdown zoom preferences");
      });
    }));
    this.registerEvent(this.app.vault.on("delete", /** Retire deleted file/subtree choices without rebuilding or observing graph state. */ item => {
      const next = removeMarkdownZoomModes(this.settings.centralNodeMarkdownZoomModes, item.path, item instanceof TFolder);
      if (next === this.settings.centralNodeMarkdownZoomModes) return;
      this.settings.centralNodeMarkdownZoomModes = next;
      void this.persistSettingsSnapshot().catch(/** Keep the in-memory deletion while reporting a failed disk write without private paths. */ () => {
        console.error("K-Plex could not save Markdown zoom preferences");
      });
    }));
  }

  /** Register post-restore vault/metadata listeners and initialize lazy vault-wide status facts. */
  /** Preserve persisted navigation/history/pins across a known file or folder move. */
  private remapNavigationPaths(oldPath: string, newPath: string, folder = false): boolean {
    const remap = (path: string): string => {
      if (path === oldPath) return newPath;
      if (!folder) return path;
      if (path === `folder:${oldPath}`) return `folder:${newPath}`;
      if (path.startsWith(`${oldPath}/`)) return newPath + path.slice(oldPath.length);
      if (path.startsWith(`folder:${oldPath}/`)) return `folder:${newPath}` + path.slice(`folder:${oldPath}`.length);
      return path;
    };
    let changed = false;
    for (const key of ["lastActivePath", "sidecarLastFilePath"] as const) {
      const next = remap(this.settings[key]);
      if (next !== this.settings[key]) { this.settings[key] = next; changed = true; }
    }
    for (const key of ["navigationHistory", "pinnedNodes"] as const) {
      const next = this.settings[key].map(remap);
      if (next.some((path, index) => path !== this.settings[key][index])) {
        this.settings[key] = [...new Set(next)]; changed = true;
      }
    }
    if (folder) for (const path of [...this.dirtyMarkdownPaths]) {
      const next = remap(path);
      if (next !== path) { this.dirtyMarkdownPaths.delete(path); this.dirtyMarkdownPaths.add(next); }
    }
    return changed;
  }

  private registerReactiveIndexListeners(): void {
    if (this.reactiveIndexListenersRegistered) return;
    this.reactiveIndexListenersRegistered = true;
    this.cachedMarkdownFileCount = null;

    this.registerEvent(this.app.vault.on("create",
      /** Publish native file availability independently of startup/build completion, then queue its source patch. */
      (created) => {
        this.index.invalidateHostStructure(Boolean((created instanceof TFile || created instanceof TFolder)
          && this.initialIndexComplete && this.index.hasPhysicalBaseline()));
        this.pruneManagedMetadataWrites();
        if (created instanceof TFile && created.extension === "md") {
          this.deletedMarkdownFiles.delete(created);
          this.adjustCachedMarkdownFileCount(1);
          this.notifyIndexStatus();
        }
        if (created instanceof TFile && (this.managedCreatedPaths.get(created.path) ?? 0) > Date.now()) return;
        if (created instanceof TFile && created.extension === "md") {
          // A new note has one new source. Materialize its file-tree endpoint immediately when an
          // authoritative graph is already available; if startup is still building, reconcile it
          // after that pass instead of restarting the entire vault scan for one created file.
          this.dirtyMarkdownPaths.add(created.path);
          if (this.initialIndexComplete && !this.rebuildTask && this.hasVisibleKplexSurface() && this.index?.hasPhysicalBaseline()) {
            this.index.insertCreatedFile(created);
          } else {
            // Find/navigation may use the exact native file while a graph owner is still awaiting
            // unrelated work. This provisional endpoint grants no relationship or write authority.
            this.index.updateHostFileAvailability(created.path, created);
          }
          this.scheduleRebuild("vault:create-markdown");
          return;
        }
        if (created instanceof TFolder && this.initialIndexComplete && this.index?.hasPhysicalBaseline()) {
          // Empty folder creation is a known structural delta. Materialize only its root-to-folder
          // ancestry; subsequent Markdown creates reuse the same folder pages and remain per-file
          // patches instead of leaving a structural `vault:create` reason that forces a full rebuild.
          this.index.cancelRebuild();
          this.index.insertCreatedFolder(created);
          return;
        }
        if (created instanceof TFile && this.initialIndexComplete && this.index?.hasPhysicalBaseline()) {
          // Attachments have no Markdown patch to consume a structural backlog. Materialize their
          // known file-tree endpoint locally; source-local resolution maintenance owns inbound links.
          this.index.cancelRebuild();
          this.index.insertCreatedFile(created);
          return;
        }
        this.scheduleRebuild("vault:create");
      }));
    this.registerEvent(this.app.vault.on("delete",
      /** Remove deleted Markdown sources from both semantic progress and its cached denominator. */
      (deleted) => {
        this.index.invalidateHostStructure();
        if (deleted instanceof TFile && deleted.extension === "md") {
          this.countDeletedMarkdownFile(deleted);
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
        if (deleted instanceof TFile) {
          // Attachment deletion has the same endpoint/ghost boundary as Markdown deletion. Keep
          // surviving inbound declarations and remove physical membership without a vault rebuild.
          this.index?.dematerializeFile(deleted.path);
          this.settlePatchOnlyBacklogIfIdle();
          return;
        }
        if (deleted instanceof TFolder && this.initialIndexComplete && this.index?.hasPhysicalBaseline()) {
          this.index.cancelRebuild();
          void this.index.removeDeletedFolder(deleted, file => this.countDeletedMarkdownFile(file)).then(() => {
            this.settlePatchOnlyBacklogIfIdle(); this.notifyIndexStatus();
          }).catch(() => this.scheduleRebuild("vault:delete-folder-failed"));
          return;
        }
        this.scheduleRebuild("vault:delete");
      }));
    this.registerEvent(this.app.vault.on("rename",
      /** Preserve path-owned state and refresh totals when a rename changes Markdown membership. */
      (renamed, oldPath) => {
        this.index.invalidateHostStructure();
        if (!(renamed instanceof TFile)) {
          if (renamed instanceof TFolder && this.initialIndexComplete && this.index?.hasPhysicalBaseline()) {
            this.index.cancelRebuild();
            void this.index.renameFolder(oldPath, renamed).catch(() => this.scheduleRebuild("vault:rename-folder-failed"));
            if (this.remapNavigationPaths(oldPath, renamed.path, true)) void this.saveSettings(false, false);
            return;
          }
          // Startup without a hydrated graph still owns authoritative structural construction.
          this.scheduleRebuild("vault:rename-folder");
          return;
        }

        const newPath = renamed.path;
        const wasMarkdown = oldPath.toLowerCase().endsWith(".md");
        const isMarkdown = renamed.extension === "md";
        if (wasMarkdown !== isMarkdown) {
          this.adjustCachedMarkdownFileCount(isMarkdown ? 1 : -1);
          this.notifyIndexStatus();
        }
        const changed = this.remapNavigationPaths(oldPath, newPath);

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
    this.registerEvent(this.app.metadataCache.on("resolve", (file) => {
      if (this.app.vault.getFileByPath(file.path) === file) {
        this.index.refreshVisibleHostMetadataPreviews(file.path);
        void this.index.refreshVisiblePresentation(file.path);
      }
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      const previousSourceRevision = this.indexDirtyRevision;
      /** Capture preview freshness after this event's source revision has been advanced. */
      const refreshVisible = (): void => {
        void this.index.refreshVisiblePresentation(file.path);
        if (this.index.refreshVisibleHostMetadataPreviews(file.path, previousSourceRevision)) this.scheduleVisibleMetadataRefresh(file.path);
      };
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
      if (until > Date.now()) { refreshVisible(); return; }
      this.managedMetadataWrites.delete(file.path);
      const renameSuppression = this.renameMetadataSuppressions.get(file.path);
      if (renameSuppression && renameSuppression.until > Date.now() &&
          renameSuppression.mtime === file.stat.mtime && renameSuppression.size === file.stat.size) {
        // Obsidian commonly emits metadataCache.changed after a pure rename. The TFile and contents
        // are unchanged, and GraphIndex already remapped the path synchronously above.
        refreshVisible();
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
      refreshVisible();
    }));
    // metadataCache.resolved fires in large waves during startup and after a single link edit.
    // `changed`, vault create/delete/rename and explicit K-Plex edits already cover semantic
    // invalidation without turning one relationship move into a whole-vault rebuild storm.
  }

  /** Count each physical Markdown deletion once across overlapping folder and child events. */
  private countDeletedMarkdownFile(file: TFile): void {
    if (this.deletedMarkdownFiles.has(file)) return;
    this.deletedMarkdownFiles.add(file);
    this.adjustCachedMarkdownFileCount(-1);
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

  /** Collapse a host event burst, then run only visible sources in the actual priority lane. */
  private scheduleVisibleMetadataRefresh(path: string): void {
    if (!this.hasVisibleKplexSurface() || this.unloading) return;
    this.visibleMetadataPaths.add(path);
    if (this.visibleMetadataTimer !== null) window.clearTimeout(this.visibleMetadataTimer);
    this.visibleMetadataTimer = window.setTimeout(() => {
      this.visibleMetadataTimer = null;
      const paths = [...this.visibleMetadataPaths];
      this.visibleMetadataPaths.clear();
      const preparationStarted = perfNow();
      this.supportEvents.record("semantic-preparation-pending", { category: "index", outcome: "pending", count: paths.length });
      void (async () => {
        for (const selected of paths) {
          if (this.unloading || !this.hasVisibleKplexSurface()) return;
          await this.index.refreshVisibleMarkdownPath(selected);
        }
      })().catch(/** Preserve the existing local error while exporting only a finite failure category and duration. */ error => {
        this.supportEvents.record("semantic-preparation-failure", { category: "index", outcome: "failed", durationMs: perfNow() - preparationStarted });
        console.error("K-Plex visible source preparation failed", error);
      });
    }, 120);
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

  /** Complete the initial source owner; an unsuccessful adoption reports incomplete coverage until a later attempt succeeds. */
  private async adoptInitialSourceIndex(): Promise<void> {
    this.initialSourceIndexIncomplete = false;
    const adopted = await this.index.adoptStartupSources();
    if (this.unloading) return;
    this.initialSourceIndexIncomplete = !adopted;
    this.initialIndexComplete = adopted;
    if (adopted) {
      for (const reason of ["startup:no-snapshot", "startup:stale-snapshot", "startup:partial-restore-incomplete"]) {
        this.indexBacklogReasons.delete(reason);
      }
      if (!this.preRestoreUncoveredChanges && this.indexBacklogReasons.size === 0 && this.dirtyMarkdownPaths.size === 0) {
        this.indexDirty = false;
      }
      if (this.indexDirty && this.hasVisibleKplexSurface()) this.scheduleRebuild("startup:post-initial-backlog");
    }
    this.notifyIndexStatus();
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

      if (this.index.isOnDemandMode()) {
        const ready = await this.index.initializeOnDemandBaseline(this.startupGraphSeedPaths());
        if (this.unloading) return;
        this.initialIndexComplete = ready;
        if (ready) {
          this.indexDirty = false;
          this.indexBacklogReasons.clear();
          this.dirtyMarkdownPaths.clear();
          void this.index.startBackgroundUrlIndex();
        }
        this.notifyIndexStatus();
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
      } else if (this.index.size > 0 && !this.index.hasPhysicalBaseline() && !this.index.hasRestoredCheckpoint()) {
        // The preview task failed after it had already returned a usable partial scene. Fall back
        // to a normal rebuild instead of ever treating that partial scene as the complete index.
        this.indexDirty = true;
        this.indexDirtyRevision += 1;
        this.indexBacklogReasons.add("startup:partial-restore-incomplete");
      }

      // Missing graph acceleration is recoverable source progress, not a reason to rebuild all
      // semantics. Source inventory owns offline/sync repair; requested scopes own current views.
      if (this.index.hasSourceBackedStartup()) {
        await this.adoptInitialSourceIndex();
        return;
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
        if (patched.reconciled) {
          this.indexBacklogReasons.delete("startup:stale-snapshot");
          this.initialIndexComplete = true;
          if (!this.preRestoreUncoveredChanges && patchRevision === this.indexDirtyRevision &&
              this.indexBacklogReasons.size === 0 && this.dirtyMarkdownPaths.size === 0) {
            this.indexDirty = false;
          }
          this.notifyIndexStatus();
          if (!this.indexDirty) return;
          // A newer reactive event remains in the per-file backlog. Let the normal coordinator
          // patch it after this startup task releases its guard.
          if (this.hasVisibleKplexSurface()) this.scheduleRebuild("startup:post-initial-backlog");
          return;
        }
      }
      // Give iOS one paint/GC opportunity after Obsidian's own startup metadata wave before
      // allocating a second graph snapshot. This is deliberately small; it is not a polling loop.
      if (Platform.isIosApp) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
      }

      if (this.unloading) return;

      if (this.indexDirty || this.index.size === 0) {
        // Startup itself is already an allow-closed demand lane; do not mark an empty cold start as
        // an explicit forced rebuild, because that would bypass progressive first publication.
        await this.performRebuild(false, false, "startup:initial-index", true);
        if (this.index.hasSourceBackedStartup()) return;
      }
      if (this.unloading) return;
      // A progressive cold build may have published a useful neighborhood before cancellation.
      // Keep that graph navigable, but do not mistake partial publication for startup completion.
      this.initialIndexComplete = this.index.isFullSnapshotHydrated();
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

  /** Run the host rebuild workflow and report localized progress/completion while retaining the existing semantic publication and cancellation ownership. */
  private async performRebuild(showNotice: boolean, force: boolean, reason: string, allowClosed: boolean): Promise<void> {
    if (this.unloading) return;
    if (this.index.hasPendingStructuralMaintenance()) await this.index.waitForStructuralMaintenance();
    if (this.unloading) return;
    // Reactive backlog can arrive after a preview but before optional cache hydration finishes.
    // The initial coordinator owns the final restore/reconciliation decision; rebuilding the
    // preview here would race that owner and reset a usable cached scene to a cold build.
    // Hydration can be installed while the initial owner awaits host metadata or structural work.
    // That owner's own cold-start call must join the actual restore directly, never its own task.
    if (!force && !showNotice && this.index.hasPendingSnapshotHydration()) {
      if (allowClosed && reason === "startup:initial-index") {
        const restored = await this.index.waitForSnapshotHydration();
        if (!restored.restored) {
          this.indexDirty = true;
          this.indexDirtyRevision += 1;
          this.indexBacklogReasons.add("startup:partial-restore-incomplete");
        } else {
          await this.refreshBookmarkedEntryPoints();
          if (!restored.fresh) {
            this.indexDirty = true;
            this.indexBacklogReasons.add("startup:stale-snapshot");
          }
        }
        if (this.unloading) return;
        // A late graph-cache failure can still retain durable sources. Keep the same initial
        // adoption decision as a restore that was already pending when this owner first ran.
        if (this.index.hasSourceBackedStartup()) {
          await this.adoptInitialSourceIndex();
          return;
        }
      } else await this.ensureInitialIndex();
      if (this.unloading) return;
    }
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
      if (this.initialIndexComplete && this.index.hasPhysicalBaseline()) {
        for (const path of this.dirtyMarkdownPaths) {
          const file = this.app.vault.getFileByPath(path);
          if (file?.extension === "md") this.index.insertCreatedFile(file);
        }
      }
      const structuralDirty = [...this.indexBacklogReasons].some((item) =>
        item !== "metadata:changed" && item !== "coalesced-backlog" && item !== "interval" &&
        item !== "vault:create-markdown" && item !== "startup:post-initial-backlog",
      );
      if (this.index.isOnDemandMode()) {
        const ready = await this.index.refreshOnDemandGraph(this.startupGraphSeedPaths(), structuralDirty || force);
        if (this.unloading) return;
        if (ready && this.indexDirtyRevision === startRevision) {
          this.indexDirty = false;
          this.indexBacklogReasons.clear();
          this.dirtyMarkdownPaths.clear();
        }
        await this.refreshBookmarkedEntryPoints();
        return;
      }
      if (!force && !showNotice && this.index.size > 0 && !structuralDirty && this.dirtyMarkdownPaths.size === 0) {
        this.indexDirty = false;
        this.indexBacklogReasons.clear();
        this.notifyIndexStatus();
        return;
      }
      const canIncrementalPatch = !force && !showNotice && this.index.size > 0 && !structuralDirty &&
        this.dirtyMarkdownPaths.size > 0;
      if (canIncrementalPatch) {
        const paths = [...this.dirtyMarkdownPaths];
        this.index.noteBuildDecision("per-file-patch", [...this.indexBacklogReasons].sort().join("|") || reason, paths.length);
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
            this.index.acknowledgeHostPresentation();
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
      if (showNotice) new Notice(this.translator("notice.rebuildingIndex"), 1200);
      const progressiveStartup = allowClosed && !showNotice && !force && !this.initialIndexComplete && !this.index.isFullSnapshotHydrated();
      this.index.noteBuildDecision(progressiveStartup ? "cold-progressive" : "full-rebuild",
        [...this.indexBacklogReasons].sort().join("|") || reason);
      const published = progressiveStartup
        ? await this.index.rebuildProgressively(this.startupGraphSeedPaths(), {
          // Keep the large-iOS low-memory checkpoint strategy, but only after the useful center
          // neighborhood has been published so first paint is no longer blocked by vault prewarm.
          prewarmBodyCache: Platform.isIosApp && this.app.vault.getMarkdownFiles().length > 5000,
        })
        : await this.index.rebuild();
      if (this.unloading) return;
      if (!published) {
        this.indexDirty = true;
        this.indexBacklogReasons.add(reason);
        if (allowClosed && this.indexDirtyRevision !== startRevision && this.hasVisibleKplexSurface() && this.rebuildTimer === null) {
          // A note saved while cold ingestion was awaiting work invalidates that source revision.
          // Retry after the current startup task releases its guard instead of leaving a partial
          // scene indefinitely until the user closes and reopens K-Plex.
          this.rebuildTimer = window.setTimeout(() => {
            this.rebuildTimer = null;
            void this.ensureInitialIndex();
          }, 1100);
        }
        return;
      }

      // The authoritative build covered its startup reasons. New Markdown files created after
      // its file list was captured are now materialized and remain in the per-source patch backlog.
      for (const pendingReason of [...this.indexBacklogReasons]) {
        if (pendingReason.startsWith("startup:")) this.indexBacklogReasons.delete(pendingReason);
      }
      for (const path of this.dirtyMarkdownPaths) {
        const file = this.app.vault.getFileByPath(path);
        if (file?.extension === "md") this.index.insertCreatedFile(file);
      }
      this.indexBacklogReasons.delete("vault:create-markdown");

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

  /** Preserve the legacy command-center policy independently of editor focus and node selection. */
  private commandCentralPage(): GraphPage | null {
    if (this.openKplexViews <= 0) return null;
    const page = this.index.get(this.settings.lastActivePath);
    if (!page || page.isFolder || page.isTag) return null;
    return page;
  }

  /** Assign an ephemeral window identity used only for action routing, never persisted settings. */
  actionWindowId(ownerWindow: Window | null | undefined = window.activeWindow ?? window): string {
    const owner = ownerWindow ?? window.activeWindow ?? window;
    let id = this.actionWindows.get(owner);
    if (!id) { id = `window-${++this.actionWindowSequence}`; this.actionWindows.set(owner, id); }
    return id;
  }

  /** Resolve only this recovery action against native pair ownership in the invoking window.
   * Explicit owners never fall through; checks read identities/capabilities without revealing,
   * releasing, opening a graph or consulting its center. Other actions retain their resolver. */
  private resolvePlexFoldAction(request: ActionRequest): SidecarFoldRoute {
    /** Project a captured host pair to finite portable identity, never a native leaf. */
    const resolved = (candidate: PlexFoldCandidate): SidecarFoldRoute => ({ state: "resolved",
      target: { id: candidate.token, windowId: this.actionWindowId(candidate.ownerWindow) } });
    /** An explicit surface/focused Plex cannot borrow another pair when it is ineligible. */
    const explicit = (host: WorkspaceLeaf): SidecarFoldRoute => {
      const candidate = this.readPlexFoldCandidate(host);
      if (!candidate) return { state: "unavailable", reasonKey: this.readPlexFoldUnavailableReason(host) };
      if (request.windowId !== undefined && request.windowId !== this.actionWindowId(candidate.ownerWindow)) return { state: "unavailable", reasonKey: "sidecar.foldUnavailable" };
      return resolved(candidate);
    };
    if (request.surfaceId !== undefined) {
      const owner = this.actionSurfaceHosts.get(request.surfaceId);
      return owner ? explicit(owner.leaf) : { state: "unavailable", reasonKey: "sidecar.foldUnavailable" };
    }
    // Native window hints can outlive a closed popout. It cannot invoke a new action; retain
    // this plugin's live main window rather than treating the retired document as an owner.
    const ownerWindow = window.activeWindow && !window.activeWindow.closed ? window.activeWindow : window;
    const windowId = this.actionWindowId(ownerWindow);
    if (request.windowId !== undefined && request.windowId !== windowId) return { state: "unavailable", reasonKey: "sidecar.foldUnavailable" };
    const focused = [...this.app.workspace.getLeavesOfType(KPLEX_VIEW_TYPE), ...this.app.workspace.getLeavesOfType(KPLEX_SIDEPANEL_VIEW_TYPE)]
      .find(/** Embedded native editors may be the active leaf while their containing Plex owns focus. */ leaf => leaf.view.containerEl.ownerDocument.defaultView === ownerWindow
        && leaf.view.containerEl.contains(ownerWindow.document.activeElement));
    if (focused) return explicit(focused);
    const active = this.app.workspace.getActiveViewOfType(ItemView)?.leaf;
    if (active && active.view.containerEl.ownerDocument.defaultView === ownerWindow
      && (active.view instanceof KplexView || active.view instanceof KplexSidepanelView)) return explicit(active);
    const candidates = this.readPlexFoldCandidates(ownerWindow);
    /** Ambiguity remains an explicit finite picker decision, never registration-order fallback. */
    const choose = (pairs: readonly PlexFoldCandidate[]): SidecarFoldRoute => pairs.length === 1 ? resolved(pairs[0])
      : pairs.length ? { state: "ambiguous", targets: pairs.map(/** Preserve each current native incarnation/window. */ pair => ({ id: pair.token, windowId })) }
        : { state: "unavailable", reasonKey: "sidecar.foldUnavailable" };
    const activeGroup = active?.view.containerEl.ownerDocument.defaultView === ownerWindow ? this.leafGroupElement(active) : null;
    const associated = activeGroup ? candidates.filter(/** Any native sibling identifies its participating group without acquiring it. */ pair => pair.hostGroup === activeGroup || pair.sidecarGroup === activeGroup) : [];
    if (associated.length) return choose(associated);
    const folded = candidates.filter(/** A sole hidden owner is the recovery preference from unrelated controls. */ pair => pair.folded);
    if (folded.length === 1) return resolved(folded[0]);
    const ranked = candidates.map(/** Reuse the existing explicit interaction ledger; checks do not record activity. */ pair => ({ pair,
      order: Math.max(0, ...[...this.actionSurfaceHosts].filter(/** Only this exact native owner contributes recency. */ ([, host]) => host.leaf === pair.hostLeaf)
        .map(/** Surface registration identities remain opaque and generation-scoped. */ ([id]) => this.actionManager.readInteractionOrder(id))) }));
    const newest = Math.max(0, ...ranked.map(/** Compare the shared ledger, not per-surface local counters. */ value => value.order));
    const recent = ranked.filter(/** Stale/absent registrations have zero weight and cannot choose arbitrarily. */ value => newest > 0 && value.order === newest);
    return recent.length === 1 ? resolved(recent[0].pair) : choose(candidates);
  }

  /** Reacquire only the captured native incarnation; stale acceptance cannot retarget another pair. */
  private plexFoldTargetCandidate(target: SidecarFoldTarget): PlexFoldCandidate | null {
    const hosts = new Set([...this.sidecarLeaves.keys(), ...this.collapsedPlexHosts.keys()]);
    for (const host of hosts) {
      const candidate = this.readPlexFoldCandidate(host);
      if (candidate?.token === target.id && this.actionWindowId(candidate.ownerWindow) === target.windowId
        && this.isPlexFoldCandidateCurrent(candidate)) return candidate;
    }
    return null;
  }

  /** Perform one exact pair transition; native focus/reveal fences remain in the fold owner. */
  private async applyPlexFoldTarget(target: SidecarFoldTarget): Promise<ActionOutcome> {
    const candidate = this.plexFoldTargetCandidate(target);
    if (!candidate) return { status: "cancelled" };
    for (const [id, owner] of this.actionSurfaceHosts) if (owner.leaf === candidate.hostLeaf) this.actionManager.recordInteraction(id);
    return await this.togglePlexFold(candidate) ? { status: "completed" }
      : { status: "unavailable", reasonKey: this.readPlexFoldUnavailableReason(candidate.hostLeaf) };
  }

  /** Execute captured routing or open the existing native picker. Cancelling changes no native pair. */
  private executePlexFoldAction(context: ActionContext): ActionOutcome | Promise<ActionOutcome> {
    const route = context.sidecarFold;
    if (!route) return { status: "unavailable", reasonKey: "sidecar.foldUnavailable" };
    if (route.state === "resolved") return this.applyPlexFoldTarget(route.target);
    const sessionId = `sidecar-fold-${++this.actionInvocationSequence}`;
    const items = route.targets.map(/** Read only native titles for a bounded captured list, never note contents or graph pages. */ (target, index) => {
      const candidate = this.plexFoldTargetCandidate(target);
      return { label: this.translator("sidecar.foldPairLabel", { number: index + 1 }),
        detail: candidate?.sidecarLeaf.view.getDisplayText(), disabled: !candidate, value: target };
    });
    const picker = new ActionTargetPicker(this.app, items, this.translator("sidecar.chooseFoldPair"),
      /** Choice validates its captured token; never dispatch a newly resolved generic command. */ target => {
        void this.applyPlexFoldTarget(target).catch(/** Native picker callbacks share the established localized failure treatment. */ error => {
          this.supportEvents.record("action-failed", { category: "action" });
          console.error("K-Plex action failed", error); new Notice(this.translator("actions.failed"));
        });
      }, /** Release only this native picker/session on selection, Escape, teardown or unload. */ () => {
        this.actionDialogs.delete(picker); this.actionManager.closeSession(sessionId);
      });
    this.actionDialogs.set(picker, context.surfaceId === undefined ? {} : { surfaceId: context.surfaceId, generation: context.generation });
    picker.open();
    return { status: "opened", sessionId };
  }

  /** Associate a React generation with its leaf/document; release its menu without retiring another owner or successor. */
  registerActionSurfaceHost(id: string, generation: number, leaf: WorkspaceLeaf): () => void {
    const registration = { generation, leaf };
    const ownerDocument = leaf.view.containerEl.ownerDocument;
    this.actionSurfaceHosts.set(id, registration);
    this.supportEvents.record("view-created", { category: "view" });
    return /** Release only this owning React generation's native association. */ () => {
      if (this.actionSurfaceHosts.get(id) === registration) {
        if ((this.activeKplexMenuLeaf === leaf && this.activeKplexMenuDocument === ownerDocument)
          || (this.justClosedKplexMenu?.leaf === leaf && this.justClosedKplexMenu.document === ownerDocument)) {
          this.dismissKplexMenu();
        }
        this.actionSurfaceHosts.delete(id);
        this.supportEvents.record("view-closed", { category: "view" });
      }
      for (const [dialog, owner] of this.actionDialogs) {
        if (owner.surfaceId === id && owner.generation === generation) dialog.close();
      }
    };
  }

  /** Find the native host selected by the action resolver without choosing an unrelated view. */
  actionHostLeaf(id?: string): WorkspaceLeaf | undefined {
    return id ? this.actionSurfaceHosts.get(id)?.leaf : undefined;
  }

  /** Fence delayed UI completion against close or migration while retaining a captured origin. */
  isActionSurfaceCurrent(id: string, generation: number): boolean {
    return !this.unloading && this.actionSurfaceHosts.get(id)?.generation === generation
      && this.actionManager.readSnapshot(id)?.mounted === true;
  }

  /** Subscribe presentation only; action preference changes never notify the semantic index. */
  subscribeActionPreferences(listener: () => void): () => void {
    this.actionPreferenceListeners.add(listener);
    return /** Release exactly this subscriber on surface/settings teardown. */ () => { this.actionPreferenceListeners.delete(listener); };
  }

  /** Report actual native registration independently of the persisted desired publication choice. */
  isActionPublished(id: ActionId): boolean {
    const command = ACTION_BY_ID.get(id)?.command;
    return Boolean(command && this.actionPublisher?.registeredIds().includes(command.id));
  }

  /** Serialize valid workflow preferences including overlaps; failed storage never installs a draft or touches indexing. */
  updateActionPreferences(next: ActionPreferencesV1): Promise<void> {
    const convention = readObsidianPresentationEnvironment(window.activeWindow ?? window).keyConvention;
    const validated = sanitizeActionPreferences(next, false, convention, true);
    // Explicit edits retain both local assignments and inherited defaults. Migration-only safety
    // must never silently rewrite this draft; the runtime compiler rejects ambiguous dispatch.
    if (this.settings.actionPreferencesFuture !== undefined) return Promise.reject(new Error(this.translator("actions.newerPreferences")));
    if (validated.issues.length) return Promise.reject(new Error(this.translator("actions.invalidPreferences")));
    const compiled = compileActionBindings(validated.preferences, convention);
    if (compiled.issues.length) return Promise.reject(new Error(this.translator("actions.invalidPreferences")));
    const draft = validated.preferences;
    /** Apply only the last committed state; queued updates retain submission order. */
    const apply = async (): Promise<void> => {
      if (this.unloading) throw new Error(this.translator("actions.surface-unavailable"));
      await this.enqueueSettingsWrite(/** Commit preference memory before releasing the common persistence queue. */ async () => {
        await this.saveData(this.settingsSnapshotForPersistence(draft));
        if (!this.unloading) this.settings.actionPreferences = draft;
      });
      if (this.unloading) return;
      this.actionPreferenceMigrationSkipped = [];
      this.actionPreferenceMigrationIssueCount = 0;
      const publication = this.actionPublisher?.sync(draft);
      for (const listener of this.actionPreferenceListeners) listener();
      if (publication?.failures.length) {
        console.error("K-Plex action publication failed", publication.failures);
        throw new Error(this.translator("actions.publicationFailed"));
      }
    };
    const result = this.actionPreferenceQueue.then(apply);
    this.actionPreferenceQueue = result.catch(/** A failed draft does not poison later explicit retries. */ () => undefined);
    return result;
  }

  /** Queue settings disk writes without allowing an older pending save to overwrite new actions. */
  private enqueueSettingsWrite(write: () => Promise<void>): Promise<void> {
    const result = this.settingsWriteQueue.then(write);
    this.settingsWriteQueue = result.catch(/** The caller reports its failure; subsequent saves remain possible. */ () => undefined);
    return result;
  }

  /** Omit runtime recovery markers while retaining the actual future schema in its original field. */
  private settingsSnapshotForPersistence(actionPreferences: unknown, source: KplexSettings = this.settings): Record<string, unknown> {
    const { actionPreferencesFuture: _runtimeFuture, colorPreferencesFuture: _runtimeColorFuture, graphLensesColorFuture: _runtimeLensColorFuture, appearanceThemesFuture: _runtimeThemesFuture, ...settings } = source;
    return { ...settings, actionPreferences, ...(source.appearanceThemesFuture !== undefined ? {appearanceThemes: source.appearanceThemesFuture} : {}), ...(source.graphLensesColorFuture !== undefined ? {graphLenses: source.graphLensesColorFuture} : {}), colorPreferences: source.colorPreferencesFuture !== undefined
      ? source.colorPreferencesFuture : source.colorPreferences };
  }

  /** Persist live settings at the queued boundary, preserving an unsupported future schema verbatim. */
  private persistSettingsSnapshot(): Promise<void> {
    return this.enqueueSettingsWrite(/** Capture after earlier workflow saves have actually committed. */ () => this.saveData(
      this.settingsSnapshotForPersistence(this.settings.actionPreferencesFuture ?? this.settings.actionPreferences),
    ));
  }

  /** Capture the selected identity plus activation epoch; A→B→A never revives an old draft. */
  captureAppearanceOwner(): appearanceThemes.AppearanceOwner {
    return {themeId: this.settings.appearanceThemes?.selectedId, activation: this.appearanceThemeActivation ?? 0};
  }

  /** Submission and queue entry both require the exact opening activation; accepted disk writes complete normally. */
  isAppearanceOwnerCurrent(owner: appearanceThemes.AppearanceOwner): boolean {
    return !this.unloading && owner.themeId === this.settings.appearanceThemes?.selectedId && owner.activation === (this.appearanceThemeActivation ?? 0);
  }

  /** Theme metadata has its own existing-lifetime notification, without pretending graph data changed. */
  subscribeAppearanceThemes(listener: () => void): () => void {
    (this.appearanceThemeListeners ??= new Set()).add(listener);
    return /** Release only this native/React lifetime's subscription. */ () => {this.appearanceThemeListeners.delete(listener);};
  }

  /** Native shells retain their opening theme draft and expose explicit discard after another activation. */
  bindAppearanceEditor(editor: StyleEditorModal, owner: appearanceThemes.AppearanceOwner): void {
    const name = this.settings.appearanceThemes?.themes.find(/** Resolve only the opening identity's display name. */ theme => theme.id === owner.themeId)?.name ?? this.appearanceThemeNames().user;
    editor.bindThemeOwner(/** A selected-ID match alone cannot revive A→B→A. */ () => this.isAppearanceOwnerCurrent(owner),
      /** The editor releases this subscription with its existing native lifetime. */ changed => this.subscribeAppearanceThemes(changed), name,
      this.settings.appearanceThemesFuture !== undefined ? this.translator("themes.unavailable") : undefined);
  }

  /** Supply localized initial preset/copy names; stored display names remain user data after creation. */
  private appearanceThemeNames(): appearanceThemes.ThemeNames {
    return {default: this.translator("themes.defaultName"), user: this.translator("themes.userName"),
      nativeBase: this.translator("themes.nativeBaseName"), custom: this.translator("themes.customName")};
  }

  /** Explicit selection/metadata intents reuse the same appearance writer and opening-owner fence. */
  updateAppearanceThemes(action: appearanceThemes.AppearanceThemeAction, owner = this.captureAppearanceOwner()): Promise<StyleCommitResult> {
    return this.updateStyleSettings(/** Library metadata/activation is prepared by its finite intent, not a second draft writer. */ () => {}, owner, {themeAction: action});
  }

  /** A fresh stable identity and detached current/factory copy become active only after durable success. */
  createAppearanceTheme(name: string, fromDefaults: boolean, owner = this.captureAppearanceOwner()): Promise<StyleCommitResult> {
    return this.updateAppearanceThemes({kind: "create", id: window.crypto.randomUUID(), name, fromDefaults}, owner);
  }

  /** Reset only the selected editable theme's sources; factory edits otherwise use normal copy-on-write. */
  resetAppearanceThemeColors(scope: appearanceThemes.ColorResetScope, owner = this.captureAppearanceOwner()): Promise<StyleCommitResult> {
    return this.updateStyleSettings(/** Preserve all non-color records and palette definitions at the serialized boundary. */ draft => {
      if (this.settings.appearanceThemes?.selectedId === appearanceThemes.DEFAULT_THEME_ID) throw new Error("Default theme cannot be reset");
      appearanceThemes.resetAppearanceColors(draft, scope);
    }, owner);
  }

  /** Legacy appearance and ontology are imported over latest settings and synchronized with the selected theme atomically. */
  importLegacyAppearance(raw: unknown, owner = this.captureAppearanceOwner()): Promise<StyleCommitResult> {
    return this.updateStyleSettings(/** The allowlisted importer supplies this operation's appearance. */ () => {}, owner, {legacyImport: raw});
  }

  /**
   * Commit appearance/library and their effective root projection through the existing disk queue.
   * Every edit starts from latest fields and its opening activation. Metadata-only operations never
   * refresh the graph. A successful factory change creates one private custom theme; failed writes
   * publish neither colors nor library. Accepted writes survive UI retirement and refresh failure.
   */
  async updateStyleSettings(edit: (draft: StyleSettingsDraft) => void, owner = this.captureAppearanceOwner(), options: StyleCommitOptions = {}): Promise<StyleCommitResult> {
    if (!this.isAppearanceOwnerCurrent(owner)) throw new Error("Appearance editor belongs to an earlier theme activation");
    let persisted = false, refresh = false, semantic = false, refreshPending = false;
    try { await this.enqueueSettingsWrite(/** Prepare only when this operation owns the existing settings disk queue. */ async () => {
      if (!this.isAppearanceOwnerCurrent(owner)) throw new Error("Appearance editor belongs to an earlier theme activation");
      const source = this.settings;
      if (source.appearanceThemesFuture !== undefined && !options.initializeThemes) throw new Error("Newer appearance themes are read-only");
      const importing = "legacyImport" in options;
      const working = importing ? importExcaliBrainGraphSettings(options.legacyImport, source) : source;
      const before = captureSettingsPolicy(source);
      const draft = structuredClone(Object.fromEntries(STYLE_SETTINGS_KEYS.map(
        /** Preserve the full finite appearance inventory, including optional root absence. */ key => [key, working[key]],
      ))) as StyleSettingsDraft;
      edit(draft);
      let library = source.appearanceThemes;
      if (options.initializeThemes && !library && source.appearanceThemesFuture === undefined && source.colorPreferencesFuture === undefined && source.graphLensesColorFuture === undefined
        && appearanceThemes.canCaptureThemeAppearance(draft)) {
        const changedBeforeInitialization = !appearanceThemes.themeValuesEqual(appearanceThemes.captureThemeAppearance(draft), appearanceThemes.captureThemeAppearance(DEFAULT_SETTINGS));
        library = appearanceThemes.createAppearanceThemes(draft, DEFAULT_SETTINGS, options.initializeThemes.existing || changedBeforeInitialization, this.appearanceThemeNames());
      }
      if (options.themeAction) {
        if (!library) throw new Error("Appearance themes are unavailable");
        library = appearanceThemes.editAppearanceThemeLibrary(library, options.themeAction);
        if (library.selectedId !== source.appearanceThemes?.selectedId) {
          const selected = library.themes.find(/** Apply only this explicit activation's stable identity. */ theme => theme.id === library?.selectedId);
          if (!selected) throw new Error("Selected theme no longer exists");
          appearanceThemes.applyThemeAppearance(draft, selected.appearance);
        }
      } else if (library && !options.initializeThemes) {
        if (!appearanceThemes.canCaptureThemeAppearance(draft)) throw new Error("Unsupported appearance cannot be stored as a theme");
        library = appearanceThemes.recordThemeAppearance(library, appearanceThemes.captureThemeAppearance(draft),
          library.selectedId === appearanceThemes.DEFAULT_THEME_ID ? window.crypto.randomUUID() : "", this.appearanceThemeNames().custom);
      }
      const next = {...working};
      for (const key of STYLE_SETTINGS_KEYS) Object.assign(next, {[key]: draft[key]});
      if (library) next.appearanceThemes = library;
      if (options.initializeThemes) next.kplexInitialized = true;
      const policy = captureSettingsPolicy(next), effects = classifySettingsChange(before, policy);
      const libraryChanged = !appearanceThemes.themeValuesEqual(source.appearanceThemes, library);
      if (effects.changedKeys.includes("graphLenses") && source.graphLensesColorFuture !== undefined) throw new Error("Newer lens colors are read-only");
      if (effects.changedKeys.includes("colorPreferences")) {
        if (source.colorPreferencesFuture !== undefined) throw new Error("Newer color preferences are read-only");
        if (migrateColorPreferences(draft.colorPreferences).future !== undefined || cyclicSemanticColorSlots(draft.colorPreferences).length) throw new Error("Invalid color preferences");
      }
      // Only legacy import can own non-appearance fields here. Capture their individual before
      // values so another live workflow control cannot be overwritten after storage awaits.
      const importedFields = importing ? Object.keys(working).filter(/** The importer retains local library/workflow data; only actual changed roots need publication. */ key =>
        !STYLE_SETTINGS_KEYS.some(/** Appearance roots are published by their existing field-level fence. */ field => field === key)
        && key !== "appearanceThemes" && key !== "appearanceThemesFuture" && !appearanceThemes.themeValuesEqual(Reflect.get(source, key), Reflect.get(working, key)))
        .map(/** Detach only a changed imported root's comparison token. */ key => ({key, before: appearanceThemes.copyThemeValue(Reflect.get(source, key) as unknown), after: Reflect.get(working, key) as unknown})) : [];
      if (!options.persistExistingChanges && (library || options.initializeThemes) && !effects.changedKeys.length && !libraryChanged && !importedFields.length && next.kplexInitialized === source.kplexInitialized) return;
      await this.saveData(this.settingsSnapshotForPersistence(source.actionPreferencesFuture ?? source.actionPreferences, next));
      persisted = true;
      const current = captureSettingsPolicy(this.settings), values = {...(this.savedSettingsPolicy ?? current).values};
      for (const key of STYLE_SETTINGS_KEYS) {
        if (!effects.changedKeys.includes(key) || current.values[key] !== before.values[key]) continue;
        Object.assign(this.settings, {[key]: draft[key]});
      }
      for (const field of importedFields) if (appearanceThemes.themeValuesEqual(Reflect.get(this.settings, field.key), field.before)) Object.assign(this.settings, {[field.key]: field.after});
      for (const key of effects.changedKeys) if (current.values[key] === before.values[key]) values[key] = policy.values[key];
      // Compatibility callers already published their live fields. Record the exact queued disk
      // snapshot only after storage succeeds; a failed write must remain dirty for any next save.
      this.savedSettingsPolicy = options.persistExistingChanges ? policy : {values};
      if (options.initializeThemes) this.settings.kplexInitialized = true;
      if (libraryChanged && library) {
        const previous = source.appearanceThemes?.selectedId;
        this.settings.appearanceThemes = library;
        if (previous !== library.selectedId) this.appearanceThemeActivation = (this.appearanceThemeActivation ?? 0) + 1;
        // Snapshot listeners: native page replacement may synchronously release/re-register rows.
        for (const listener of [...(this.appearanceThemeListeners ?? [])]) try {listener();} catch (error) {console.error("K-Plex saved theme notification failed", error); refreshPending = true;}
        if (previous === appearanceThemes.DEFAULT_THEME_ID && library.selectedId !== previous && !options.themeAction) {
          const selected = library.themes.find(/** Name the new committed custom theme, never a stale editor label. */ theme => theme.id === library.selectedId);
          try {new Notice(this.translator("themes.customSaved", {name: selected?.name ?? this.appearanceThemeNames().custom}));}
          catch (error) {console.error("K-Plex custom theme notice failed", error); refreshPending = true;}
        }
      }
      if (effects.changedKeys.includes("graphLenses")) for (const listener of [...(this.graphLensListeners ?? [])]) try {listener(this.settings.graphLenses);} catch (error) {console.error("K-Plex saved lens notification failed", error); refreshPending = true;}
      semantic = effects.semanticInvalidation;
      if (semantic) this.index.invalidateSemanticPolicy();
      refresh = effects.changedKeys.length > 0 && !options.initializeThemes;
    }); } catch (error) {
      if (!persisted) throw error instanceof Error ? error : new Error(String(error));
      console.error("K-Plex saved style publication failed", error); return {refreshPending: true};
    }
    if (this.unloading || !refresh) return {refreshPending};
    try {await this.index.refreshPresentationSettings(); if (semantic) await this.index.refreshSemanticSettings(); return {refreshPending};}
    catch (error) {console.error("K-Plex saved style presentation refresh failed", error); return {refreshPending: true};}
  }

  /** Navigate to the declarative shortcut page, including when optional commands are unpublished. */
  openActionSettings(): boolean {
    return this.openSettingsPage(this.translator("actions.settingsTitle"));
  }

  /** Navigate to the deletion preference and its stable row anchor without changing settings or approving deletion. */
  openDeleteCleanupSettings(): void {
    if (this.openSettingsPage(this.translator("settings.ui.plex.behavior"))) this.settingsTab?.focusSetting(
      this.translator("settings.deletion.removeOntologyLinks"), "kplex-remove-ontology-links-on-delete");
  }

  /** Open the actual Hidden-fields control without creating a field or approving a note write. */
  openHiddenOntologySettings(): void {
    if (this.openSettingsPage(this.translator("settings.ui.ontology"), this.translator("settings.ui.relationship.fields"))) {
      this.settingsTab?.focusSetting(this.translator("settings.ui.hidden.fields"));
    }
  }

  /** Reuse native page-path navigation with the existing owning-tab fallback for settings cross-links. */
  private openSettingsPage(...pageNames: string[]): boolean {
    if (navigatePluginSettings(this.app, this.manifest.id, pageNames)) return true;
    this.openSettings();
    return pageNames.every(/** Traverse the exact localized native page path only after explicit navigation refusal. */ name => this.settingsTab?.openSettingsPage(name) ?? false);
  }

  /** Reveal only the chosen native surface and wait for its current action registration. */
  async revealActionSurface(id: string): Promise<boolean> {
    const host = this.actionSurfaceHosts.get(id);
    if (!host || this.unloading) return false;
    this.restorePlexFoldBeforeReveal(host.leaf);
    await this.app.workspace.revealLeaf(host.leaf);
    const view = host.leaf.view;
    if (view instanceof KplexView || view instanceof KplexSidepanelView) await view.waitUntilReady();
    return this.isActionSurfaceCurrent(id, host.generation);
  }

  /** Keep the optional host settings bridge isolated; never inspect or rewrite native hotkey data. */
  openHotkeySettings(): void {
    type SettingsController = { open?: () => void; openTabById?: (id: string) => void };
    const controller = (this.app as unknown as { setting?: SettingsController }).setting;
    if (controller?.open && controller.openTabById) { controller.open(); controller.openTabById("hotkeys"); return; }
    new Notice(this.translator("actions.hostHotkeyGuidance"));
  }

  /** Assemble narrow existing operations and publish stable command metadata once per lifetime. */
  private initializeActions(): void {
    const implementations: ActionImplementations = {};
    const enabled: Availability = { state: "enabled" };
    /** Reacquire one captured reference; this check performs no source acquisition. */
    const pageFor = (context: ActionContext): GraphPage | null => context.target.kind === "node"
      ? resolveActionPage(this.index, context.target.node) : null;
    /** Attach an existing operation without moving its behavior into catalog metadata. */
    const operation = (id: ActionId, execute: (context: ActionContext) => ActionOutcome | Promise<ActionOutcome>,
      availability: (context: ActionContext) => Availability = () => enabled,
    ): void => { implementations[id] = { availability, execute }; };
    /** Wrap a non-writing legacy host operation with one completion/error owner. */
    const completed = (run: () => void | Promise<unknown>): (() => Promise<ActionOutcome>) =>
      async () => { await run(); return { status: "completed" }; };
    operation("surface.open-tab", completed(() => this.activateView()),
      /** Preserve device-specific command visibility. */ () => isGraphTabCommandAvailable(readObsidianPresentationEnvironment(window.activeWindow ?? window)) ? enabled : { state: "disabled", reasonKey: "actions.deviceUnavailable" });
    operation("surface.open-popout", completed(() => this.activateViewInPopout()),
      /** Phone/tablet surfaces do not publish an available desktop popout operation. */ () => isPopoutCommandAvailable(readObsidianPresentationEnvironment(window.activeWindow ?? window)) ? enabled : { state: "disabled", reasonKey: "actions.deviceUnavailable" });
    operation("surface.open-sidepanel", completed(() => this.activateSidepanel()));
    operation("index.rebuild", completed(() => this.rebuildIndex(true)));
    operation("index.copy-diagnostics", completed(() => this.copyIndexDiagnostics()));
    operation("view.sidecar.collapse-plex", /** All surfaces use the graph-independent host toggle and captured pair. */ context => this.executePlexFoldAction(context),
      /** A pure ambiguous check advertises the existing picker without opening it. */ context => context.sidecarFold?.state === "ambiguous"
        ? { state: "preparable", reasonKey: "sidecar.chooseFoldPair" } : context.sidecarFold ? enabled : { state: "disabled", reasonKey: "sidecar.foldUnavailable" });
    operation("support.report-bug", /** Alternate palette/command route remains usable when Zen hides the toolbar. */ context => {
      const origin = this.actionHostLeaf(context.surfaceId)?.view.containerEl;
      this.reportBug(origin, context.surfaceId);
      return { status: "completed" };
    });
    operation("actions.configure", /** Native Settings owns the page lifetime; navigation creates no detached dialog session. */ () => this.openActionSettings()
      ? { status: "completed" } : { status: "unavailable", reasonKey: "actions.unavailable" });
    operation("search.focus", /** Legacy fallback covers readiness before a surface port is registered. */ context => {
      return this.requestSearchFocus(this.actionHostLeaf(context.surfaceId)) ? { status: "completed" }
        : { status: "unavailable", reasonKey: "actions.surface-unavailable" };
    }, /** No composer, focus or scanning during command checking. */ () => this.searchTargetLeaf() ? enabled : { state: "disabled", reasonKey: "actions.surface-unavailable" });
    operation("document.sync-from-center", /** Use the captured Plex center instead of the editor's note. */ async context => {
      const page = pageFor(context);
      if (!page) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
      await this.syncMostRecentTabWithKplex(page); return { status: "completed" };
    });
    operation("center.sync-from-document", completed(() => this.syncKplexWithMostRecentTab()));
    operation("center.focus-active-note", /** This explicitly document-oriented command preserves its distinct target policy. */ async () => {
      const file = this.app.workspace.getActiveFile();
      if (!file) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
      await this.focusInKplex(file.path); return { status: "completed" };
    }, /** Read the public active-file fact without transferring focus. */ () => this.app.workspace.getActiveFile() ? enabled : { state: "disabled", reasonKey: "actions.target-unavailable" });
    for (const role of ACTION_RELATION_ROLES) for (const family of ["center", "selected"] as const) {
      operation(`relationship.create-${family}.${role}`, /** Freeze resolved origin and transfer exclusivity to the existing composer. */ context => {
        const origin = pageFor(context);
        if (!origin) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
        const sessionId = `composer-${++this.actionInvocationSequence}`;
        const hostLeaf = this.actionHostLeaf(context.surfaceId);
        const invocation: RelatedNoteInvocation = {
          continuation: context.request.args && "continuation" in context.request.args ? context.request.args.continuation : undefined,
          /** Closing/migrating a graph retires late navigation without changing committed disk work. */
          current: () => !this.unloading && (!context.surfaceId || context.generation === undefined
            || this.isActionSurfaceCurrent(context.surfaceId, context.generation)),
          /** Explicit follow returns to the same graph rather than an arbitrary active leaf. */
          focusGraph: () => { if (context.surfaceId) void this.actionManager.dispatch({ id: "graph.focus", source: "internal", surfaceId: context.surfaceId }); },
          /** Release the manager's modal session without deregistering the owning surface. */
          onClosed: () => { this.actionDialogs.delete(dialog); this.actionManager.closeSession(sessionId); },
        };
        const dialog = origin.isFolder
          ? new CreateFolderNoteModal(this, origin, hostLeaf, invocation)
          : new NewRelatedNoteModal(this, origin, role, undefined, hostLeaf, undefined, invocation);
        this.actionDialogs.set(dialog, { surfaceId: context.surfaceId, generation: context.generation });
        try { dialog.open(); } catch (error) { dialog.close(); this.actionDialogs.delete(dialog); throw error; }
        return { status: "opened", sessionId };
      }, /** Preserve legacy global center exclusions; selected/local capability is explicit. */ context => {
        const origin = pageFor(context);
        return origin && !origin.isTag && (!origin.isFolder || role === "child" && (family === "selected" || context.request.source !== "obsidian-command"))
          && (family !== "center" || context.request.source !== "obsidian-command" || this.commandCentralPage() !== null)
          ? enabled : { state: "disabled", reasonKey: "actions.target-unavailable" };
      });
    }
    const ontologyRoles = ["select", "parent", "child", "left", "right", "previous", "next", "hidden", "excluded"] as const;
    for (const role of ontologyRoles) operation(`ontology.assign.${role}`, /** Consume the supplied native editor, never a graph node or stale field string. */ async context => {
      const editor = context.target.kind === "editor-field" ? this.actionEditors.get(context.target.editorInvocationId) : undefined;
      const field = editor ? this.fieldAtEditorCursor(editor) : null;
      if (!field) return { status: "unavailable", reasonKey: "actions.editor-unavailable" };
      if (role === "select") {
        const sessionId = `ontology-${++this.actionInvocationSequence}`;
        const dialog = this.openAddToOntologyModal(field, undefined, /** Release only this native selector session. */ () => {
          if (dialog) this.actionDialogs.delete(dialog);
          this.actionManager.closeSession(sessionId);
        });
        if (!dialog) return { status: "unavailable", reasonKey: "actions.editor-unavailable" };
        this.actionDialogs.set(dialog, {});
        return { status: "opened", sessionId };
      }
      await this.assignFieldToOntology(field, role);
      return { status: "completed" };
    }, /** Checking cannot assign a field, save settings or open the selector. */ context => {
      const editor = context.target.kind === "editor-field" ? this.actionEditors.get(context.target.editorInvocationId) : undefined;
      return editor && this.fieldAtEditorCursor(editor) ? enabled : { state: "disabled", reasonKey: "actions.editor-unavailable" };
    });
    this.actionManager = new ActionManager({
      implementations,
      /** This recovery action has an explicit absence/ambiguity contract independent of generic surfaces. */
      resolveSidecarFold: request => this.resolvePlexFoldAction(request),
      /** Accepted pair identities expire on ownership, native generation or fold transitions. */
      validateSidecarFold: target => this.plexFoldTargetCandidate(target) !== null,
      /** Prefer actual owning graph/native view, including sidebar palette launches; shared-center commands retain their distinct target. */
      readCommandContext: request => {
        const owner = window.activeWindow ?? window;
        const active = this.app.workspace.getActiveViewOfType(KplexView)?.leaf
          ?? this.app.workspace.getActiveViewOfType(KplexSidepanelView)?.leaf;
        const recent = this.app.workspace.getMostRecentLeaf();
        const surfaces = [...this.actionSurfaceHosts].filter(([, value]) => value.leaf.view.containerEl.ownerDocument.defaultView === owner);
        // Native getMostRecentLeaf excludes left/right sidebars. Actual graph DOM focus outranks
        // an ancestor's native association; while a palette owns DOM focus, its active view remains.
        const associated = surfaces.find(/** A retired or hidden graph cannot override actual native ownership. */ ([id]) => {
          const snapshot = this.actionManager.readSnapshot(id);
          return snapshot?.mounted && snapshot.visible && snapshot.focusRegion === "graph";
        })?.[0]
          ?? surfaces.find(([, value]) => value.leaf === active)?.[0]
          ?? surfaces.find(([, value]) => value.leaf === recent)?.[0];
        // Reporting has no node target and must stay usable when the graph is not yet available.
        const shared = request.id === "support.report-bug" ? null : this.index.get(this.settings.lastActivePath);
        return { sharedCenter: shared ? actionNodeRef(shared) : null,
          windowId: request.windowId ?? this.actionWindowId(owner), preferredSurfaceId: associated,
          focusRegion: associated ? (this.actionManager.readSnapshot(associated)?.commandFocusRegion ?? this.actionManager.readSnapshot(associated)?.focusRegion) : "external" };
      },
      /** Transient occurrences are revalidated by their owning surface, persisted pages by exact lookup. */
      validateNode: node => {
        if (node.kind === "section") return true;
        const page = resolveActionPage(this.index, node);
        return Boolean(page && (!page.file || this.app.vault.getFileByPath(page.file.path) === page.file));
      },
      /** Existing services own expected notices; unexpected thrown failures have one localized owner. */
      onError: error => {
        this.supportEvents.record("action-failed", { category: "action" });
        console.error("K-Plex action failed", error); new Notice(this.translator("actions.failed"));
      },
    });
    this.actionPublisher = createActionCommandPublisher({ host: this, manager: this.actionManager,
      /** Catalog strings cross into typed localization only through the checked assembly helper. */
      translate: key => translateActionText(this.translator, key),
      /** An editor token is an ephemeral host capability released after checking or execution. */
      makeRequest: (id, editor) => {
        if (!editor) return { id, source: "obsidian-command" };
        const token = `editor-${++this.actionInvocationSequence}`; this.actionEditors.set(token, editor);
        return { id, source: "obsidian-command", target: { kind: "editor-field", editorInvocationId: token } };
      },
      /** Never retain editor objects in preferences or after an invocation promise settles. */
      releaseRequest: request => { if (request.target?.kind === "editor-field") this.actionEditors.delete(request.target.editorInvocationId); },
    });
    const publication = this.actionPublisher.sync(this.settings.actionPreferences);
    if (publication.failures.length) { console.error("K-Plex action registration failed", publication.failures); new Notice(this.translator("actions.publicationFailed")); }
  }

  /**
   * Persist all caller mutations through the canonical immutable settings projection. The legacy
   * boolean is a call-site compatibility facade only: managers/imports cannot bypass classification.
   * Capture before awaiting storage so overlapping saves cannot lose a semantic invalidation.
   * Image consent retires pending visuals and notifies every surface before storage; a consent-only
   * change never acquires or recompiles semantic scopes.
   */
  async saveSettings(_reindex = false, notifyIndex = true): Promise<void> {
    this.settings.primaryTagFieldLowerCase = this.settings.primaryTagField.toLowerCase().replaceAll(" ", "-");
    const next = captureSettingsPolicy(this.settings);
    const previousPolicy = this.savedSettingsPolicy;
    const effects = classifySettingsChange(previousPolicy ?? next, next);
    const consentOnly = effects.changedKeys.length === 1 && effects.changedKeys[0] === "allowRemoteNodeImages";
    const appearanceChanged = effects.changedKeys.some(/** Legacy imperative saves delegate appearance synchronization to the one queued owner. */ key => STYLE_SETTINGS_KEYS.some(/** This is the appearance-write inventory, not the theme schema. */ field => field === key));
    const queuedAppearance = appearanceChanged && (this.settings.appearanceThemes || this.settings.appearanceThemesFuture !== undefined);
    // The appearance queue owns its durable policy baseline. Advancing it here would make a
    // retry or overlapping workflow save miss an appearance whose first disk write rejected.
    if (!queuedAppearance) this.savedSettingsPolicy = next;
    if (effects.changedKeys.includes("allowRemoteNodeImages")) {
      this.index.invalidateNodeVisuals();
      this.index.notifyPresentation();
    }
    if (effects.semanticInvalidation) this.index.invalidateSemanticPolicy();
    if (queuedAppearance)
      await this.updateStyleSettings(/** Existing callers already published their imperative fields; persist their coherent snapshot even if its library matches. */ () => {},
        this.captureAppearanceOwner(), {persistExistingChanges: true});
    else await this.persistSettingsSnapshot();
    if (this.unloading) return;
    await this.index.refreshPresentationSettings();
    if (effects.semanticInvalidation) await this.index.refreshSemanticSettings();
    // Device typography changes reuse the existing graph and cannot expand a requested scope.
    // Style dictionaries/order also reuse semantic coverage. Preserve the legacy refresh
    // for other render changes and mixed writes, which may change requested scopes.
    else if (effects.render && !effects.typographyOnly && !effects.paintOnly && !consentOnly && !isStyleOnlySettingsChange(effects) && !effects.changedKeys.every(/** Non-color theme geometry uses presentation/layout only. */ key => STYLE_SETTINGS_KEYS.some(/** Lens behavior keeps its existing separate settings owner. */ field => field === key))) await this.index.refreshSemanticSettings();
    // Workflow-only callers can still request their historical view notification. Changed settings
    // use the separate presentation channel and never pretend relationship evidence changed.
    if ((!effects.render || effects.typographyOnly) && notifyIndex) this.index.notifyPresentation();
  }

  private isDocumentLeafCandidate(leaf: WorkspaceLeaf | null): leaf is WorkspaceLeaf {
    if (!leaf || isEmbeddedMarkdownLeaf(leaf) || this.isManagedSidecarLeaf(leaf)) return false;
    const viewState = leaf.getViewState();
    if (viewState.type === KPLEX_VIEW_TYPE || viewState.type === KPLEX_SIDEPANEL_VIEW_TYPE) return false;
    if (viewState.type === "empty" || leaf.view instanceof FileView) return true;

    // Background tabs can be DeferredView instances. Inspect serialized view state instead
    // of assuming leaf.view is already a FileView (Obsidian 1.7.2+ deferred views).
    const state = viewState.state as { file?: unknown } | undefined;
    return typeof state?.file === "string";
  }

  private leafIsAttached(leaf: WorkspaceLeaf): boolean {
    // iterateAllLeaves() can omit background tabs in a tab group. Type lookup includes them,
    // so a previously active document remains valid after K-Plex takes focus in the same group.
    return this.app.workspace.getLeavesOfType(leaf.getViewState().type).includes(leaf);
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

  /** Advance ownership/toggle incarnation, never persisted or used as an ownership inventory. */
  private advancePlexFoldRevision(host: WorkspaceLeaf): void {
    this.plexFoldRevisions.set(host, (this.plexFoldRevisions.get(host) ?? 0) + 1);
  }

  /** Explicitly claim one native Sidecar incarnation; reacquiring the same leaf retires old intent. */
  private setSidecarOwner(host: WorkspaceLeaf, leaf: WorkspaceLeaf): void {
    this.restoreCollapsedPlex(host);
    this.advancePlexFoldRevision(host);
    this.sidecarLeaves.set(host, leaf);
  }

  /** Visibility is restored synchronously before native ownership can be removed or replaced. */
  private deleteSidecarOwner(host: WorkspaceLeaf): void {
    this.restoreCollapsedPlex(host);
    this.advancePlexFoldRevision(host);
    this.sidecarLeaves.delete(host);
  }

  /** Undo only this captured session, including detached DOM; automatic restoration never focuses. */
  private restoreCollapsedPlex(hostLeaf: WorkspaceLeaf): void {
    const session = this.collapsedPlexHosts.get(hostLeaf);
    if (!session) return;
    this.collapsedPlexHosts.delete(hostLeaf);
    this.advancePlexFoldRevision(hostLeaf);
    session.dispose();
    this.notifySidecar();
    this.onKplexVisibilityMayHaveChanged();
  }

  /** Native reveal/fullscreen/remount retires a fold before its current DOM or React owner moves. */
  restorePlexFoldBeforeReveal(hostLeaf: WorkspaceLeaf): void { this.restoreCollapsedPlex(hostLeaf); }

  /** Inspect ephemeral state without changing Sidecar ownership or touching graph readiness. */
  isPlexFoldedForSidecar(hostLeaf: WorkspaceLeaf): boolean { return this.collapsedPlexHosts.has(hostLeaf); }

  /** Build a pure, finite host capture; metadata identity memoization has no native side effects.
   * Only two direct native tab groups may share the affected split. Unsafe third/partial/nested
   * branches remain expanded, while an already-folded session always retains its recovery route. */
  readPlexFoldCandidate(hostLeaf: WorkspaceLeaf): PlexFoldCandidate | null {
    if (this.unloading) return null;
    const session = this.collapsedPlexHosts.get(hostLeaf);
    if (session) return { ...session.candidate, token: this.plexFoldToken(session.candidate), folded: true, session };
    const hostView = hostLeaf.view;
    const sidecarLeaf = this.sidecarLeaves.get(hostLeaf);
    if (!(hostView instanceof KplexView) || !sidecarLeaf || this.sidecarMovingHosts.has(hostLeaf)
      || !this.leafIsAttached(hostLeaf) || !this.leafIsAttached(sidecarLeaf)) return null;
    const hostGroup = this.leafGroupElement(hostLeaf), sidecarGroup = this.leafGroupElement(sidecarLeaf);
    const split = hostGroup?.parentElement;
    if (!hostGroup || !sidecarGroup || !split || hostGroup === sidecarGroup
      || !hostGroup.classList.contains("workspace-tabs") || !sidecarGroup.classList.contains("workspace-tabs")
      || sidecarGroup.parentElement !== split || !split.classList.contains("workspace-split")
      || hostGroup.ownerDocument !== sidecarGroup.ownerDocument) return null;
    const branches = Array.from(split.children).filter(child => child.classList.contains("workspace-tabs") || child.classList.contains("workspace-split"));
    const axis = this.splitAxis(split);
    if (branches.length !== 2 || !branches.includes(hostGroup) || !branches.includes(sidecarGroup) || !axis) return null;
    let position = this.adjacentPosition(hostLeaf, sidecarLeaf);
    if (!position) {
      const conflicting = [...this.collapsedPlexHosts.values()].some(fold =>
        [fold.candidate.hostGroup, fold.candidate.sidecarGroup].some(group => group === hostGroup || group === sidecarGroup));
      if (!conflicting) return null;
      const before = branches.indexOf(sidecarGroup) < branches.indexOf(hostGroup);
      position = axis === "width" ? before ? "left" : "right" : before ? "above" : "below";
    }
    if (axis !== (position === "left" || position === "right" ? "width" : "height")) return null;
    const recoveryHost = sidecarGroup.querySelector<HTMLElement>(":scope > .workspace-tab-container");
    const ownerWindow = hostGroup.ownerDocument.defaultView;
    if (!recoveryHost || !ownerWindow) return null;
    const ancestors: HTMLElement[] = [];
    for (let ancestor: HTMLElement | null = split.parentElement; ancestor; ancestor = ancestor.parentElement) ancestors.push(ancestor);
    const hostExtent = hostGroup.getBoundingClientRect()[axis], sidecarExtent = sidecarGroup.getBoundingClientRect()[axis];
    const hostShare = hostExtent > 8 && sidecarExtent > 8 ? hostExtent / (hostExtent + sidecarExtent) : null;
    const capture: PlexFoldCandidate = { token: "", hostLeaf, sidecarLeaf, hostView, generation: hostView.getPlexFoldGeneration(), hostShare,
      hostGroup, sidecarGroup, split, ancestors, sidecarView: sidecarLeaf.view, sidecarType: sidecarLeaf.getViewState().type,
      recoveryHost, ownerWindow, position, folded: false };
    return { ...capture, token: this.plexFoldToken(capture) };
  }

  /** Create an opaque pair incarnation without retaining a parallel native ownership registry. */
  private plexFoldToken(candidate: PlexFoldCandidate): string {
    return [plexFoldIdentity(candidate.hostView), candidate.generation, plexFoldIdentity(candidate.sidecarLeaf),
      plexFoldIdentity(candidate.hostGroup), plexFoldIdentity(candidate.sidecarGroup), plexFoldIdentity(candidate.split),
      plexFoldIdentity(candidate.recoveryHost), ...candidate.ancestors.map(plexFoldIdentity),
      this.plexFoldRevisions.get(candidate.hostLeaf) ?? 0].join(":");
  }

  /** Enumerate only existing associations/folds in the invoking native window, never graph nodes. */
  readPlexFoldCandidates(ownerWindow: Window): readonly PlexFoldCandidate[] {
    const hosts = new Set([...this.sidecarLeaves.keys(), ...this.collapsedPlexHosts.keys()]);
    return [...hosts].map(host => this.readPlexFoldCandidate(host)).filter((candidate): candidate is PlexFoldCandidate => candidate?.ownerWindow === ownerWindow);
  }

  /** Distinguish an owned unsafe arrangement from an absent/unsupported native companion. */
  readPlexFoldUnavailableReason(hostLeaf: WorkspaceLeaf): "sidecar.foldUnsupportedLayout" | "sidecar.foldUnavailable" {
    return this.sidecarLeaves.has(hostLeaf) && hostLeaf.view instanceof KplexView
      ? "sidecar.foldUnsupportedLayout" : "sidecar.foldUnavailable";
  }

  /** Validate accepted intent against the same incarnation; a stale explicit owner never falls through. */
  isPlexFoldCandidateCurrent(candidate: PlexFoldCandidate): boolean {
    const current = this.readPlexFoldCandidate(candidate.hostLeaf);
    return current !== null && current.token === candidate.token && current.folded === candidate.folded
      && current.hostView === candidate.hostView && current.hostGroup === candidate.hostGroup
      && current.sidecarGroup === candidate.sidecarGroup && current.split === candidate.split
      && current.recoveryHost === candidate.recoveryHost && current.ownerWindow === candidate.ownerWindow
      && (!candidate.folded || current.session === candidate.session);
  }

  /** Validate captured native topology while hidden; zero host geometry is never an adjacency test. */
  private isPlexFoldSessionValid(session: PlexFoldSession): boolean {
    const c = session.candidate;
    const ancestors: HTMLElement[] = [];
    for (let ancestor: HTMLElement | null = c.split.parentElement; ancestor; ancestor = ancestor.parentElement) ancestors.push(ancestor);
    const unexpectedEmpty = c.sidecarLeaf.getViewState().type === "empty"
      && (c.sidecarType !== "empty" || c.sidecarLeaf.view !== c.sidecarView)
      && !this.sidecarMovingHosts.has(c.hostLeaf) && !this.passiveSidecarSyncRequests.get(c.hostLeaf)?.pending;
    return !unexpectedEmpty && ancestors.length === c.ancestors.length && ancestors.every((ancestor, index) => ancestor === c.ancestors[index])
      && !this.unloading && this.collapsedPlexHosts.get(c.hostLeaf) === session
      && this.sidecarLeaves.get(c.hostLeaf) === c.sidecarLeaf && this.leafIsAttached(c.hostLeaf) && this.leafIsAttached(c.sidecarLeaf)
      && c.hostLeaf.view === c.hostView && c.hostView.getPlexFoldGeneration() === c.generation
      && this.leafGroupElement(c.hostLeaf) === c.hostGroup && this.leafGroupElement(c.sidecarLeaf) === c.sidecarGroup
      && c.hostGroup.ownerDocument.defaultView === c.ownerWindow && c.sidecarGroup.ownerDocument === c.hostGroup.ownerDocument
      && c.hostGroup.parentElement === c.split && c.sidecarGroup.parentElement === c.split
      && c.sidecarGroup.querySelector(":scope > .workspace-tab-container") === c.recoveryHost && c.hostGroup.isConnected && c.sidecarGroup.isConnected
      && Array.from(c.split.children).filter(child => child.classList.contains("workspace-tabs") || child.classList.contains("workspace-split")).length === 2
      && this.splitAxis(c.split) === (c.position === "left" || c.position === "right" ? "width" : "height");
  }

  /** Restore invalid sessions before releasing only their exact native association; no replacement adoption. */
  private reconcilePlexFolds(): boolean {
    let changed = false;
    for (const [host, session] of [...this.collapsedPlexHosts]) {
      if (this.isPlexFoldSessionValid(session)) continue;
      this.restoreCollapsedPlex(host);
      if (this.sidecarLeaves.get(host) !== session.sidecarLeaf) continue;
      this.deleteSidecarOwner(host);
      if (this.linkedDocumentLeaf === session.sidecarLeaf) { this.linkedDocumentLeaf = null; this.settings.documentSyncMode = "off"; }
      if (this.leafIsAttached(host)) this.settings.sidecarOpen = false;
      changed = true;
    }
    return changed;
  }

  /** Toggle exactly one captured host pair. All transitions commit synchronously before optional native reveal. */
  async togglePlexFold(candidate: PlexFoldCandidate): Promise<boolean> {
    if (!this.isPlexFoldCandidateCurrent(candidate)) return false;
    if (candidate.folded) { await this.expandPlexFromSidecar(candidate.hostLeaf); return true; }
    for (const [host, session] of [...this.collapsedPlexHosts]) {
      if ([session.candidate.hostGroup, session.candidate.sidecarGroup].some(group => group === candidate.hostGroup || group === candidate.sidecarGroup)) this.restoreCollapsedPlex(host);
    }
    if (!this.isPlexFoldCandidateCurrent(candidate)) return false;
    const active = this.app.workspace.getActiveViewOfType(ItemView)?.leaf;
    const focusLeavesHost = (active && this.leafGroupElement(active) === candidate.hostGroup)
      || candidate.hostGroup.contains(candidate.hostGroup.ownerDocument.activeElement);
    let focusTarget: WorkspaceLeaf | null = null;
    if (focusLeavesHost) {
      this.app.workspace.iterateAllLeaves(/** Preserve the surviving group's native selected tab. */ leaf => {
        if (this.leafGroupElement(leaf) === candidate.sidecarGroup && this.leafTabIsActive(leaf)) focusTarget = leaf;
      });
      if (!focusTarget) return false;
    }
    candidate.hostView.prepareForPlexFold();
    if (!this.isPlexFoldCandidateCurrent(candidate)) return false;
    let session: PlexFoldSession | null = null;
    try {
      session = new PlexFoldSession(candidate, this.translator("sidecar.unfoldPlex"),
        /** A stale control/observer owns only its exact captured session. */ () => session !== null && this.isPlexFoldSessionValid(session),
        /** Window retirement restores without stealing focus or persisting folded state. */ () => { if (this.collapsedPlexHosts.get(candidate.hostLeaf) === session) this.restoreCollapsedPlex(candidate.hostLeaf); },
        /** Native button and published command share the exact same explicit restore owner. */ () => { if (this.collapsedPlexHosts.get(candidate.hostLeaf) === session) void this.expandPlexFromSidecar(candidate.hostLeaf); });
      this.collapsedPlexHosts.set(candidate.hostLeaf, session);
      this.advancePlexFoldRevision(candidate.hostLeaf);
      if (!session.hide()) { this.restoreCollapsedPlex(candidate.hostLeaf); return false; }
    } catch {
      if (session && this.collapsedPlexHosts.get(candidate.hostLeaf) === session) this.restoreCollapsedPlex(candidate.hostLeaf);
      else session?.dispose();
      return false;
    }
    // Focus only when it would otherwise remain inside the disappearing group. Select the native
    // group's current tab, never force the managed Sidecar over an unrelated selected sibling.
    try { if (focusTarget) this.app.workspace.setActiveLeaf(focusTarget, { focus: true }); }
    catch { this.restoreCollapsedPlex(candidate.hostLeaf); return false; }
    this.notifySidecar(); this.onKplexVisibilityMayHaveChanged();
    return true;
  }

  /** Retain the existing fold-only host entry point; published commands use the true toggle owner. */
  async collapsePlexForSidecar(hostLeaf: WorkspaceLeaf): Promise<void> {
    if (this.collapsedPlexHosts.has(hostLeaf)) return;
    const candidate = this.readPlexFoldCandidate(hostLeaf);
    if (!candidate) { new Notice(this.translator(this.readPlexFoldUnavailableReason(hostLeaf))); return; }
    await this.togglePlexFold(candidate);
  }

  /** Explicit recovery reveals the exact live view; delayed completion yields to newer native selection. */
  async expandPlexFromSidecar(hostLeaf: WorkspaceLeaf): Promise<void> {
    const session = this.collapsedPlexHosts.get(hostLeaf);
    if (!session) return;
    const c = session.candidate;
    this.restoreCollapsedPlex(hostLeaf);
    const revision = this.plexFoldRevisions.get(hostLeaf);
    if (this.unloading || hostLeaf.view !== c.hostView || c.hostView.getPlexFoldGeneration() !== c.generation || !this.leafIsAttached(hostLeaf)) return;
    const reveal = this.app.workspace.revealLeaf(hostLeaf);
    // Native reveal may synchronously select the target before its loading promise settles.
    // Its later completion must not add a focus change after a different tab was selected.
    const activeAfterReveal = this.app.workspace.getActiveViewOfType(ItemView)?.leaf;
    await reveal;
    if (!this.unloading && this.plexFoldRevisions.get(hostLeaf) === revision && !this.collapsedPlexHosts.has(hostLeaf) && hostLeaf.view === c.hostView
      && c.hostView.getPlexFoldGeneration() === c.generation && this.leafIsAttached(hostLeaf)
      && this.app.workspace.getActiveViewOfType(ItemView)?.leaf === activeAfterReveal) this.app.workspace.setActiveLeaf(hostLeaf, { focus: true });
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
      ...this.app.workspace.getLeavesOfType(KPLEX_VIEW_TYPE),
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

  /** Read a real file directly from the currently materialized view, regardless of file type. */
  private loadedFileForLeaf(leaf: WorkspaceLeaf | null): TFile | null {
    if (!leaf || !("file" in leaf.view)) return null;
    const file = leaf.view.file;
    return file instanceof TFile ? file : null;
  }

  /** Best-effort Web Viewer identity. `webviewer` is the host view-state identity already used by Sidecar restore. */
  private webViewerUrlForLeaf(leaf: WorkspaceLeaf | null): string | null {
    if (!leaf) return null;
    const viewState = leaf.getViewState();
    if (viewState.type !== "webviewer") return null;
    const state = viewState.state as { url?: unknown } | undefined;
    return typeof state?.url === "string" && state.url.trim() ? state.url.trim() : null;
  }

  /** Record every active leaf change in chronological order; qualification happens when history is resolved. */
  private rememberLeafActivation(leaf: WorkspaceLeaf | null): void {
    if (!leaf) return;
    this.recentLeafHistory.push(leaf);
    const overflow = this.recentLeafHistory.length - RECENT_LEAF_HISTORY_LIMIT;
    if (overflow > 0) this.recentLeafHistory.splice(0, overflow);
    if (!this.startupInitializing && this.fileForLeaf(leaf)) this.lastDocumentLeaf = leaf;
  }

  private rememberDocumentLeaf(leaf: WorkspaceLeaf | null): void {
    if (this.isDocumentLeafCandidate(leaf) && this.leafIsVisible(leaf)) this.lastDocumentLeaf = leaf;
  }

  /** Drop closed leaves while preserving the exact activation sequence of all surviving entries. */
  private pruneRecentLeafHistory(): void {
    if (this.recentLeafHistory.length === 0) return;
    const leavesByType = new Map<string, Set<WorkspaceLeaf>>();
    this.recentLeafHistory = this.recentLeafHistory.filter((leaf) => {
      const type = leaf.getViewState().type;
      let attached = leavesByType.get(type);
      if (!attached) {
        attached = new Set(this.app.workspace.getLeavesOfType(type));
        leavesByType.set(type, attached);
      }
      return attached.has(leaf);
    });
  }

  private validateLinkedDocumentLeaf(): void {
    if (this.linkedDocumentLeaf && !this.leafIsAttached(this.linkedDocumentLeaf)) this.linkedDocumentLeaf = null;
    if (this.lastDocumentLeaf && !this.leafIsAttached(this.lastDocumentLeaf)) this.lastDocumentLeaf = null;
    this.pruneRecentLeafHistory();
  }

  private findRecentDocumentLeaf(): WorkspaceLeaf | null {
    this.validateLinkedDocumentLeaf();

    // Walk real activation history backward. K-Plex/utility leaves are naturally skipped because
    // they do not currently resolve to a vault file; hidden siblings in the same tab group remain valid.
    for (let index = this.recentLeafHistory.length - 1; index >= 0; index -= 1) {
      const leaf = this.recentLeafHistory[index];
      if (!this.fileForLeaf(leaf)) continue;
      this.lastDocumentLeaf = leaf;
      return leaf;
    }

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
    const loadedFile = this.loadedFileForLeaf(leaf);
    if (loadedFile) return loadedFile;

    const state = leaf.getViewState().state as { file?: unknown } | undefined;
    if (typeof state?.file !== "string") return null;
    return this.app.vault.getFileByPath(state.file);
  }

  private indexedUrlPathForLeaf(leaf: WorkspaceLeaf): string | null {
    const url = this.webViewerUrlForLeaf(leaf);
    if (!url) return null;
    const exact = this.index.get(url);
    if (exact?.url) return exact.path;
    const normalized = this.normalizedWebUrl(url);
    if (!normalized || normalized === url) return null;
    const normalizedPage = this.index.get(normalized);
    return normalizedPage?.url ? normalizedPage.path : null;
  }

  /** Resolve the newest still-live activation that K-Plex can actually represent. */
  private findRecentIndexedNavigationTarget(): RecentIndexedNavigationTarget | null {
    this.validateLinkedDocumentLeaf();
    const hasActivationHistory = this.recentLeafHistory.length > 0;

    for (let index = this.recentLeafHistory.length - 1; index >= 0; index -= 1) {
      const leaf = this.recentLeafHistory[index];
      const file = this.fileForLeaf(leaf);
      if (file && this.index.get(file.path)) return { leaf, path: file.path, file };
      const path = this.indexedUrlPathForLeaf(leaf);
      if (path) return { leaf, path, file: null };
    }

    // Once explicit activation history exists, never replace its ordering with workspace iteration.
    // If no historical leaf maps to an indexed target, syncing is a no-op rather than selecting
    // whichever tab happens to be first in Obsidian's group/workspace traversal.
    if (hasActivationHistory) return null;

    const recent = this.app.workspace.getMostRecentLeaf();
    if (recent) {
      const file = this.fileForLeaf(recent);
      if (file && this.index.get(file.path)) return { leaf: recent, path: file.path, file };
      const path = this.indexedUrlPathForLeaf(recent);
      if (path) return { leaf: recent, path, file: null };
    }

    const fileLeaf = this.findRecentDocumentLeaf();
    const file = this.fileForLeaf(fileLeaf);
    return fileLeaf && file && this.index.get(file.path)
      ? { leaf: fileLeaf, path: file.path, file }
      : null;
  }

  /** Find an existing workspace leaf that already displays the requested file, preferring the most-recent leaf when it matches. */
  private findOpenFileLeaf(file: TFile): WorkspaceLeaf | null {
    /** A Sidecar is also an open file tab; only graph surfaces must be excluded. */
    const matches = (leaf: WorkspaceLeaf | null): leaf is WorkspaceLeaf => {
      if (!leaf) return false;
      const type = leaf.getViewState().type;
      return type !== KPLEX_VIEW_TYPE && type !== KPLEX_SIDEPANEL_VIEW_TYPE
        && this.fileForLeaf(leaf)?.path === file.path;
    };
    const recent = this.app.workspace.getMostRecentLeaf();
    if (matches(recent)) return recent;

    let candidate: WorkspaceLeaf | null = null;
    this.app.workspace.iterateAllLeaves(/** Preserve workspace order when the recent tab does not match. */ (leaf) => {
      if (!candidate && matches(leaf)) candidate = leaf;
    });
    return candidate;
  }

  /** Report which explicit file-opening actions should be shown for a node on the current Obsidian form factor. */
  getFileOpenMenuState(file: TFile): { focusOpenTab: boolean; adjacentPane: boolean; popoutWindow: boolean } {
    const environment = readObsidianPresentationEnvironment();
    return {
      focusOpenTab: this.findOpenFileLeaf(file) !== null,
      adjacentPane: isGraphTabCommandAvailable(environment),
      popoutWindow: isPopoutCommandAvailable(environment),
    };
  }

  /** Reveal a tab that already displays the file without creating another leaf. Returns false if no matching open tab remains. */
  async focusOpenFileTab(file: TFile): Promise<boolean> {
    const leaf = this.findOpenFileLeaf(file);
    if (!leaf) return false;
    this.lastDocumentLeaf = leaf;
    await this.app.workspace.revealLeaf(leaf);
    return true;
  }

  /** Open a file in a newly-created tab in the active tab group on every supported platform. */
  async openFileInNewTab(file: TFile): Promise<void> {
    let leaf: WorkspaceLeaf;
    try { leaf = this.app.workspace.getLeaf("tab"); }
    catch { leaf = this.app.workspace.getLeaf(true); }
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(file, { active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  /** Open a central note in the visible main tab beneath a sidebar, excluding embedded views and owned Sidecars. */
  async openFileInMainTab(file: TFile): Promise<void> {
    if (this.unloading || this.app.vault.getFileByPath(file.path) !== file) return;
    this.validateLinkedDocumentLeaf();
    /** Main-root visibility identifies the current tab even when a sidebar owns keyboard focus. */
    const qualifies = (leaf: WorkspaceLeaf | null): leaf is WorkspaceLeaf => Boolean(leaf
      && leaf.getRoot() === this.app.workspace.rootSplit
      && this.isDocumentLeafCandidate(leaf) && this.leafIsVisible(leaf));
    let leaf: WorkspaceLeaf | null = this.app.workspace.getMostRecentLeaf(this.app.workspace.rootSplit);
    if (!qualifies(leaf)) leaf = null;
    for (let index = this.recentLeafHistory.length - 1; !leaf && index >= 0; index -= 1) {
      const candidate = this.recentLeafHistory[index];
      if (qualifies(candidate)) leaf = candidate;
    }
    if (!leaf) this.app.workspace.iterateRootLeaves(/** Prefer a visible native document/empty tab when activation history is unavailable. */ candidate => {
      if (!leaf && qualifies(candidate)) leaf = candidate;
    });
    if (!leaf) leaf = this.app.workspace.getLeaf("tab");
    this.lastDocumentLeaf = leaf;
    this.retirePassiveSidecarRequestsForLeaf(leaf);
    await leaf.openFile(file, { active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  /**
   * Share the outer anchor's allocation when pixel bases retained by a Sidecar
   * move leave a newly inserted native pane with no usable extent. Preserve
   * all other workspace branches and normal nonzero native split allocations.
   */
  private ensureAdjacentFileLeafSize(anchor: WorkspaceLeaf, leaf: WorkspaceLeaf): void {
    const anchorGroup = this.leafGroupElement(anchor);
    const leafGroup = this.leafGroupElement(leaf);
    const split = anchorGroup?.parentElement;
    if (!anchorGroup || !leafGroup || !split || leafGroup.parentElement !== split) return;
    const axis = this.splitAxis(split);
    if (!axis) return;
    const anchorExtent = anchorGroup.getBoundingClientRect()[axis];
    const leafExtent = leafGroup.getBoundingClientRect()[axis];
    if (leafExtent > 8 || anchorExtent <= 16) return;
    // The default flex basis is zero. Existing explicit bases can consume the
    // whole split, so give the new pane half the anchor's existing allocation.
    const sharedExtent = (anchorExtent + leafExtent) / 2;
    this.setWorkspaceBasis(anchorGroup, sharedExtent);
    this.setWorkspaceBasis(leafGroup, sharedExtent);
  }

  /** Open beyond this Plex's Sidecar pair, protecting ownership while split geometry settles. */
  async openFileInAdjacentPane(file: TFile, hostLeaf: WorkspaceLeaf): Promise<void> {
    const sidecar = this.availableSidecarLeaf(hostLeaf);
    const position = this.getSidecarPosition(hostLeaf);
    const alreadyMoving = this.sidecarMovingHosts.has(hostLeaf);
    if (sidecar) this.sidecarMovingHosts.add(hostLeaf);
    try {
      const leaf = createAdjacentFileLeaf(this.app.workspace, hostLeaf, sidecar, position);
      this.lastDocumentLeaf = leaf;
      await leaf.openFile(file, { active: true });
      await this.app.workspace.revealLeaf(leaf);
      await this.waitForWorkspaceLayout(hostLeaf);
      const anchor = sidecar && (position === "right" || position === "below") ? sidecar : hostLeaf;
      this.ensureAdjacentFileLeafSize(anchor, leaf);
    } finally {
      if (sidecar) {
        await this.waitForWorkspaceLayout(hostLeaf);
        if (!alreadyMoving) this.sidecarMovingHosts.delete(hostLeaf);
      }
    }
  }

  /** Open a file in a native desktop pop-out window and show localized feedback if the host rejects the request. */
  async openFileInPopout(file: TFile): Promise<void> {
    try {
      const leaf = this.app.workspace.getLeaf("window");
      this.lastDocumentLeaf = leaf;
      await leaf.openFile(file, { active: true });
      await this.app.workspace.revealLeaf(leaf);
    } catch {
      new Notice(this.translator("notice.popoutUnavailable"), 2200);
    }
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

  /**
   * Claim the one-time startup indexing guidance bubble for the first visible Plex.
   *
   * The claim is persisted immediately, so after the guidance has appeared once it never returns
   * on later Obsidian sessions. Normal runtime re-indexing never opens startup guidance either.
   */
  claimStartupIndexInfoBubble(): boolean {
    if (
      this.startupIndexInfoBubbleClaimed
      || this.settings.startupIndexInfoBubbleSeen
      || this.initialIndexComplete
      || this.getIndexStatus().upToDate
    ) return false;
    this.startupIndexInfoBubbleClaimed = true;
    this.settings.startupIndexInfoBubbleSeen = true;
    void this.saveSettings(false, false);
    return true;
  }

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

  /** Follow an eligible native file, excluding a known superseded passive Sidecar echo; explicit opens retire that lease. */
  shouldFollowDocumentFile(file: TFile): boolean {
    if (this.startupInitializing) return false;
    const suppression = this.transientDocumentFollowSuppression;
    if (suppression && Date.now() >= suppression.until) this.transientDocumentFollowSuppression = null;
    else if (suppression?.path === file.path) return false;

    if (!this.syncLeafToKplexEnabled()) return false;
    this.validateLinkedDocumentLeaf();
    const leaf = this.settings.documentSyncMode === "pinned" ? this.linkedDocumentLeaf : this.findRecentDocumentLeaf();
    for (const [host, sidecar] of this.sidecarLeaves) {
      if (sidecar !== leaf) continue;
      const request = this.passiveSidecarSyncRequests.get(host);
      if (request?.pending && request.file !== file
        && (request.nativeFile === file || request.previousNativeFile === file)) return false;
    }
    return this.fileForLeaf(leaf)?.path === file.path;
  }

  /** Reacquire the eligible linked native file on sidebar reveal without requiring that sidebar to lose focus. */
  getDocumentFollowFile(): TFile | null {
    const leaf = this.documentSyncTargetLeaf();
    if (!leaf || isEmbeddedMarkdownLeaf(leaf)) return null;
    const file = this.fileForLeaf(leaf);
    return file && this.shouldFollowDocumentFile(file) ? file : null;
  }

  private targetNoteLeaf(createIfMissing = true): WorkspaceLeaf | null {
    this.validateLinkedDocumentLeaf();
    if (this.settings.documentSyncMode === "pinned" && this.linkedDocumentLeaf) return this.linkedDocumentLeaf;
    const recent = this.findRecentDocumentLeaf();
    if (recent) return recent;
    return createIfMissing ? this.app.workspace.getLeaf("split") : null;
  }

  /** Pin the recent tab explicitly; any deliberate open supersedes its older passive completion. */
  async relinkDocumentLeafToMostRecent(page?: GraphPage): Promise<void> {
    const candidate = this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.linkedDocumentLeaf = candidate;
    this.lastDocumentLeaf = candidate;
    this.settings.documentSyncMode = "pinned";
    if (page?.file) {
      this.retirePassiveSidecarRequestsForLeaf(candidate);
      await candidate.openFile(page.file, { active: false });
    }
    this.settings.sidecarOpen = false;
    await this.saveSettings(false, false);
    this.notifySidecar();
  }

  /** Change native follow ownership, with explicit pinning retiring passive work on its target. */
  async setDocumentSyncMode(mode: DocumentSyncMode, page?: GraphPage): Promise<TFile | null> {
    this.settings.documentSyncMode = mode;
    this.settings.autoOpenCentralDocument = mode !== "off";
    this.settings.followActiveFile = mode !== "off";

    if (mode === "off") {
      const released = this.linkedDocumentLeaf;
      this.linkedDocumentLeaf = null;
      if (released) {
        for (const [host, managed] of [...this.sidecarLeaves.entries()]) if (managed === released) this.deleteSidecarOwner(host);
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
        for (const [host, managed] of [...this.sidecarLeaves.entries()]) if (managed === released) this.deleteSidecarOwner(host);
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
    if (page?.file) {
      this.retirePassiveSidecarRequestsForLeaf(candidate);
      await candidate.openFile(page.file, { active: false });
    }
    this.settings.sidecarOpen = this.isManagedSidecarLeaf(candidate);
    await this.saveSettings(false, false);
    this.notifySidecar();
    return null;
  }

  async setDocumentLeafLinked(linked: boolean, page?: GraphPage): Promise<void> {
    await this.setDocumentSyncMode(linked ? "recent" : "off", page);
  }

  /** Explicitly synchronize the recent tab, retiring older passive work on that destination. */
  async syncMostRecentTabWithKplex(page: GraphPage): Promise<void> {
    if (!page.file) return;
    const leaf = this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    this.retirePassiveSidecarRequestsForLeaf(leaf);
    await leaf.openFile(page.file, { active: false });
  }

  async syncKplexWithMostRecentTab(): Promise<TFile | null> {
    const target = this.findRecentIndexedNavigationTarget();
    if (!target) return null;
    this.settings.lastActivePath = target.path;
    const history = [...this.settings.navigationHistory.filter((path) => path !== target.path), target.path].slice(-40);
    this.settings.navigationHistory = history;
    await this.saveSettings(false, false);
    this.notifyNavigation(target.path);
    this.index.notify();
    // Existing callers only use the file return value as an optional extra activation signal.
    // URL targets already navigate through notifyNavigation(), so returning null is intentional.
    return target.file;
  }

  async showPageInDocumentLeaf(page: GraphPage): Promise<void> {
    await this.syncMostRecentTabWithKplex(page);
  }

  /**
   * Follow the Plex center into its linked destination only when the exact file differs.
   * Same-file representation changes are observations, not reopening requests. Explicit Open
   * and one-shot synchronization use their existing independent methods and remain unconditional.
   * Managed companions delegate to their existing latest-request owner; ordinary tabs have no
   * post-await mode/focus/persistence work that can outlive this captured request.
   */
  async syncPageToDocumentLeaf(page: GraphPage): Promise<void> {
    if (this.unloading || !this.syncKplexToLeafEnabled() || !page.file
      || this.app.vault.getFileByPath(page.file.path) !== page.file) return;
    const leaf = this.targetNoteLeaf(true);
    if (!leaf || !this.leafIsAttached(leaf)) return;
    // App also propagates to its own Sidecar. The pinned destination can be that same leaf;
    // share its pending-open lease rather than racing an unguarded second native open.
    for (const [hostLeaf, sidecarLeaf] of this.sidecarLeaves) {
      if (sidecarLeaf === leaf) {
        if (!this.leafDisplaysPage(leaf, page)) this.lastDocumentLeaf = leaf;
        await this.syncSidecarToPage(hostLeaf, page);
        return;
      }
    }
    if (this.leafDisplaysPage(leaf, page)) return;
    this.lastDocumentLeaf = leaf;
    await leaf.openFile(page.file, { active: false });
  }

  /**
   * Compare a native destination with its exact canonical target, without inferring identity from
   * a graph NodeId or enforcing a Markdown/drawing representation. Deferred leaves retain the
   * existing file-state lookup; URLs and genuinely empty pages use their native view identities.
   */
  private leafDisplaysPage(leaf: WorkspaceLeaf, page: GraphPage): boolean {
    if (page.file) return this.app.vault.getFileByPath(page.file.path) === page.file
      && this.fileForLeaf(leaf) === page.file;
    if (page.url) return this.webViewerUrlForLeaf(leaf) === page.url;
    return leaf.getViewState().type === "empty";
  }

  subscribeNavigation(listener: (path: string) => void): () => void {
    this.navigationListeners.add(listener);
    return () => this.navigationListeners.delete(listener);
  }

  /** Notify existing navigation consumers while retaining only a path-free request boundary. */
  private notifyNavigation(path: string): void {
    this.supportEvents.record("navigation-request", { category: "navigation" });
    for (const listener of this.navigationListeners) listener(path);
  }

  /**
   * Capture bounded retained facts and start copying in the original toolbar gesture. Each optional
   * diagnostic owner fails independently to unavailable; raw exceptions never enter the report.
   * The modal previews exactly these bytes and is retired with its captured surface or plugin.
   */
  reportBug(origin?: HTMLElement, surfaceId?: string): void {
    if (this.unloading) return;
    const owner = origin?.ownerDocument.defaultView ?? window.activeWindow ?? window;
    const indexingActivity = this.captureIndexingActivity();
    let indexReport: unknown = null;
    let startup: unknown = null;
    try {
      if (this.index) indexReport = JSON.parse(createIndexDiagnosticsReport(this.index, () => this.getIndexDiagnosticsStatus(), this.manifest.version, indexingActivity));
    } catch { /* Partial startup/cache failures remain explicit unavailable facts, never raw errors. */ }
    try { startup = this.getStartupDiagnostics(); } catch { /* Report remains available without this optional owner. */ }
    let formFactor: unknown = null;
    let locale: unknown = null;
    try { formFactor = readObsidianPresentationEnvironment(owner).device; } catch { /* Optional evidence can be unavailable during window teardown. */ }
    try { locale = getLanguage(); } catch { /* A missing host locale must not disable issue reporting. */ }
    const host = this.actionHostLeaf(surfaceId);
    const report = createSupportReport({
      capturedAt: new Date().toISOString(), indexReport, startup, session: this.supportEvents.snapshot(),
      environment: {
        ...readSupportCustomizations(this.app),
        pluginVersion: this.manifest.version, obsidianApiVersion: apiVersion,
        operatingSystem: Platform.isIosApp ? "ios" : Platform.isAndroidApp ? "android" : Platform.isMacOS ? "macos" : Platform.isWin ? "windows" : Platform.isLinux ? "linux" : "unknown",
        formFactor, locale,
        theme: owner.document.body.classList.contains("theme-dark") ? "dark" : owner.document.body.classList.contains("theme-light") ? "light" : "unavailable",
        surfaceKind: host?.view instanceof KplexSidepanelView ? "sidepanel" : host ? (owner === window ? "tab" : "popout") : "unavailable",
      },
      indexingPreferences: {
        indexingMode: this.settings?.indexingMode, urlIndexingMode: this.settings?.urlIndexingMode,
        indexingThrottle: this.settings?.indexingThrottle,
        excalidrawFitOnNodeOpen: this.settings?.excalidrawFitOnNodeOpen,
      },
    }, indexingActivity);
    const session = new SupportClipboardSession(report, /** Capture only this toolbar's actual native clipboard owner. */ text => owner.navigator.clipboard.writeText(text));
    session.copy(); // Must precede native UI creation and every await on mobile clipboard paths.
    const registration = surfaceId ? this.actionSurfaceHosts.get(surfaceId) : undefined;
    let dialog: SupportReportModal | null = null;
    try {
      dialog = new SupportReportModal(this.app, session, this.translator, /** Native dismissal releases this exact plugin lifetime's dialog. */ () => { if (dialog) this.actionDialogs.delete(dialog); });
      this.actionDialogs.set(dialog, { surfaceId, generation: registration?.generation });
      dialog.open();
    } catch (error) {
      session.dispose();
      dialog?.close();
      if (dialog) this.actionDialogs.delete(dialog);
      throw error;
    }
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
    return type === KPLEX_VIEW_TYPE || type === KPLEX_SIDEPANEL_VIEW_TYPE;
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

  /** Existing source-event revision; collection must not mistake a yielding rescan for an atomic read. */
  getIndexSourceRevision(): number {
    return this.indexDirtyRevision;
  }

  /** Capture passive scalar health once; optional owners fail independently without admitting work. */
  captureIndexingActivity(): IndexingActivityCapture | null {
    let facts: ReturnType<GraphIndex["getIndexingActivityFacts"]> | undefined;
    try { facts = this.index?.getIndexingActivityFacts?.(); }
    catch { /* The retained recorder remains usable if optional health is unavailable. */ }
    try {
      return this.startupDiagnostics?.captureActivity?.(facts?.mode, facts?.urls, facts?.pacing,
        typeof __KPLEX_BUILD_ID__ === "string" ? __KPLEX_BUILD_ID__ : "source-archive", ...(facts?.current ?? [])) ?? null;
    } catch { return null; }
  }

  /** Copy one fresh passive capture through the invoking native window's clipboard owner. */
  private async copyIndexDiagnostics(): Promise<void> {
    const owner = window.activeWindow ?? window;
    try {
      const indexingActivity = this.captureIndexingActivity();
      const report = createIndexDiagnosticsReport(this.index, () => this.getIndexDiagnosticsStatus(), this.manifest.version, indexingActivity);
      await owner.navigator.clipboard.writeText(report);
      new Notice(this.translator("notice.indexDiagnosticsCopied"));
    } catch (error) {
      console.error("K-Plex could not copy index diagnostics", error);
      new Notice(this.translator("notice.indexDiagnosticsCopyFailed"));
    }
  }

  /** Never enumerate Markdown files merely to build a clipboard report. */
  private getIndexDiagnosticsStatus(): {
    upToDate: boolean;
    phase: string;
    indexedFiles: number;
    totalFiles: number | null;
  } {
    return this.computeIndexStatusFacts(this.cachedMarkdownFileCount, false);
  }

  /** Aggregate readiness without scheduling; only product status reads may record strict readiness. */
  private computeIndexStatusFacts(totalFiles: number | null, recordReadiness = true): {
    upToDate: boolean;
    phase: "ready" | "loading-cache" | "preparing" | "checking-cache" | "indexing" | "saving-cache" | "updating" | "incomplete";
    indexedFiles: number;
    totalFiles: number | null;
  } {
    const loadingCache = this.index.hasPendingSnapshotHydration();
    const semanticPreparing = this.index.hasPendingSemanticPreparation();
    const startupIncomplete = !this.initialIndexComplete && this.initialSourceIndexIncomplete;
    const semanticIncomplete = semanticPreparing && !this.index.hasActiveSemanticPreparation?.()
      || Boolean(this.index.getSearchVocabularyFailure?.()) || Boolean(this.index.hasUnavailableLocalCounts?.()) || startupIncomplete;
    const upToDate = (this.initialIndexComplete || this.index.isOnDemandMode() && this.index.hasLocalBaseline())
      && !this.indexDirty
      && this.rebuildTask === null
      && this.rebuildTimer === null
      && !loadingCache
      && !semanticPreparing
      && !semanticIncomplete
      && !this.index.hasPendingSearchVocabulary();
    if (upToDate && recordReadiness) this.startupDiagnostics?.finish();
    const indexedFiles = totalFiles === null
      ? this.index.indexedMarkdownFileCount()
      : upToDate && !this.index.isOnDemandMode() ? totalFiles : Math.min(totalFiles, this.index.indexedMarkdownFileCount());
    const phase = upToDate
      ? "ready"
      : loadingCache
        ? "loading-cache"
        : this.index.isCheckpointSaving()
          ? "saving-cache"
        : !this.initialIndexComplete && this.rebuildTask !== null
          ? "indexing"
          : semanticIncomplete && this.rebuildTask === null && this.rebuildTimer === null && (startupIncomplete || !this.indexDirty)
            ? "incomplete"
          : !this.initialIndexComplete && this.index.size > 0 && this.index.hasIncrementalRestorePatch()
            ? "checking-cache"
            : !this.initialIndexComplete
              ? "preparing"
              : "updating";
    return { upToDate, phase, indexedFiles, totalFiles };
  }

  /**
   * Report graph/search readiness and actual optional URL progress without scheduling work.
   * A zero URL total is unknown during preparation: report restored note counts when available
   * rather than implying a completed empty scan. Discovery totals apply once the inventory is known.
   * After graph hydration, an unfinished startup source pass keeps its existing measured progress;
   * compilation, saving, URL work, local mode and settled outcomes retain their own labels.
   */
  getIndexStatus(): {
    upToDate: boolean;
    phase: "ready" | "loading-cache" | "preparing" | "checking-cache" | "indexing" | "saving-cache" | "updating" | "incomplete";
    label: string;
    indexedFiles: number;
    totalFiles: number;
  } {
    // Progressive publication can notify frequently in large vaults. Cache the vault-wide total
    // between lifecycle changes so status rendering remains O(1) instead of repeatedly allocating
    // the complete Markdown-file list for every published batch.
    const totalFiles = this.cachedMarkdownFileCount ??= this.app.vault.getMarkdownFiles().length;
    const facts = this.computeIndexStatusFacts(totalFiles);
    const { phase, indexedFiles } = facts;
    const failure = phase === "incomplete" ? this.index.getSemanticPreparationFailure?.() : null;
    const searchFailure = phase === "incomplete" && !failure ? this.index.getSearchVocabularyFailure?.() : null;
    const aliasProgress = phase === "updating" ? this.index.getUrlAliasUpgradeProgress?.() : null;
    const urlProgress = this.index.getUrlIndexProgress();
    const label = urlProgress.active
      ? urlProgress.total === 0
        ? urlProgress.restored > 0
          ? this.translator("indexing.urlsRestoring", { restored: urlProgress.restored })
          : this.translator("indexing.urlsPreparing")
        : this.translator("indexing.urlsProgress", { processed: urlProgress.processed, total: urlProgress.total })
      : urlProgress.failed
        ? this.translator("indexing.urlsIncomplete")
      : phase === "incomplete" && !failure && !this.initialIndexComplete && this.initialSourceIndexIncomplete
      ? this.translator("index.statusStartupIncomplete")
      : this.index.isOnDemandMode() && ["ready", "preparing", "updating", "indexing", "incomplete"].includes(phase)
      ? this.translator(phase === "ready" ? "indexing.localReady" : phase === "incomplete" ? "indexing.localUnavailable" : "indexing.localPreparing")
      : searchFailure
      ? this.translator("index.statusSearchIncomplete")
      : aliasProgress
        ? aliasProgress.phase === "repair" && aliasProgress.total !== null
          ? this.translator("index.statusUpdatingSearchAliases", { processed: aliasProgress.processed, total: aliasProgress.total })
          : this.translator("index.statusUpdatingSearchVocabulary")
      : phase === "incomplete"
      ? this.translator(failure && /budget|limit/.test(failure) ? "index.statusRelationshipLimit" : "index.statusRelationshipIncomplete")
      : phase === "ready"
      ? this.translator("index.statusReady")
      : phase === "loading-cache"
        ? this.translator("index.statusLoadingCache")
        : phase === "preparing"
          ? this.translator("index.statusPreparing")
          : phase === "checking-cache"
            ? this.translator("index.statusCheckingCache")
            : phase === "indexing"
              ? this.translator("index.statusIndexingProgress", { indexed: indexedFiles, total: totalFiles })
              : phase === "saving-cache"
                ? this.translator("index.statusSavingCache")
              : this.translator("index.statusUpdating");
    const hydration = this.index.getSnapshotHydrationDiagnostics?.();
    const sourceProgress = phase === "preparing" && !this.index.isOnDemandMode() && !urlProgress.active && !urlProgress.failed
      ? this.startupDiagnostics?.progress("source") : null;
    const progress = phase === "loading-cache" && hydration?.phase === "source-authority"
      ? this.startupDiagnostics?.progress("source") : phase === "loading-cache" ? this.startupDiagnostics?.progress("hydration")
        : sourceProgress?.phase !== "complete" ? sourceProgress : null;
    const activityKeys = {
      "metadata": "index.startupMetadata", "preview": "index.startupPreview", "source-authority": "index.startupSourceAuthority",
      "source-inventory": "index.startupInventory", "source-coordinates": "index.startupInventory", "dependency-upgrade-validation": "index.startupDependencies",
      "host-metadata-comparison": "index.startupHostComparison", "host-retired-owner-check": "index.startupRetiredOwners",
      "source-reconciliation": "index.startupChecking", "source-retired-owner-check": "index.startupRetiredOwners",
      "dependency-completion": "index.startupDependencyCompletion", "dependency-final-validation": "index.startupDependencyCompletion",
      "resolution-reconciliation": "index.startupResolution", "requested-semantics": "index.startupSemantics",
      "node-vocabulary": "index.startupVocabulary", "pages": "index.startupPages", "file-rebind": "index.startupFiles",
      "relations": "index.startupRelations", "preview-search": "index.startupSearch", "evidence": "index.startupEvidence",
      "resolve": "index.startupResolution", "authoritative-search": "index.startupSearch", "promote": "index.startupPromotion",
    } as const;
    const activityKey = progress?.phase === "source-reconciliation" && progress.pass > 1
      ? "index.startupRechecking" : progress && activityKeys[progress.phase as keyof typeof activityKeys];
    const activity = activityKey ? this.translator(activityKey) : null;
    const progressLabel = progress && activity
      ? progress.total !== null && progress.total > 0
        ? this.translator("index.startupNotesProgress", { activity, processed: progress.processed.toLocaleString(),
          total: progress.total.toLocaleString(), percent: Math.floor(progress.processed * 100 / progress.total) })
        : progress.processed > 0
          ? this.translator("index.startupRecordsProgress", { activity, processed: progress.processed.toLocaleString() }) : activity
      : label;
    return { ...facts, label: progressLabel, totalFiles };
  }

  /**
   * Read retained startup timings, current work and aggregate counters without vault enumeration or
   * scheduling. A CLI client can reconnect after a timeout; startup continues independently and the
   * completed trace remains available for this plugin lifetime. No owner identities are exported.
   */
  getStartupDiagnostics() {
    const status = this.index ? this.computeIndexStatusFacts(this.cachedMarkdownFileCount, false) : null;
    return {
      ...this.startupDiagnostics.snapshot(),
      progress: { source: this.startupDiagnostics.progress("source"), hydration: this.startupDiagnostics.progress("hydration") },
      status,
      hydration: this.index?.getSnapshotHydrationDiagnostics() ?? null,
      source: this.index?.getSourceAcquisitionCounters() ?? null,
      semantic: this.index?.getSemanticPreparationDiagnostics() ?? null,
    };
  }

  /** Notify actual startup activity at most four times per second, without graph revisions or new timers. */
  notifyStartupProgress(): void {
    const now = window.performance.now();
    if (now - this.lastStartupProgressNotification < 250) return;
    this.lastStartupProgressNotification = now;
    this.notifyIndexStatus();
  }

  subscribeIndexStatus(listener: () => void): () => void {
    this.indexStatusListeners.add(listener);
    return () => this.indexStatusListeners.delete(listener);
  }

  /** Reuse the existing status read and retain only phase transitions, never per-file progress chatter. */
  private notifyIndexStatus(): void {
    const status = this.getIndexStatus();
    if (status.phase !== this.lastSupportIndexPhase) {
      this.lastSupportIndexPhase = status.phase;
      this.supportEvents.record("index-phase-change", { category: "index", phase: status.phase });
    }
    const key = `${status.upToDate ? "1" : "0"}:${status.phase}:${status.indexedFiles}:${status.totalFiles}:${status.label}`;
    if (key === this.lastIndexStatusKey) return;
    this.lastIndexStatusKey = key;
    for (const listener of this.indexStatusListeners) listener();
  }

  subscribeGraphLenses(listener: (lenses: KplexSettings["graphLenses"]) => void): () => void {
    this.graphLensListeners.add(listener);
    return () => this.graphLensListeners.delete(listener);
  }

  /** Lens edits share the durable appearance queue and merge against their captured editor baseline. */
  async setGraphLenses(lenses: KplexSettings["graphLenses"], baseline = this.settings.graphLenses, owner = this.captureAppearanceOwner()): Promise<StyleCommitResult> {
    const opening = structuredClone(baseline), edited = structuredClone(lenses);
    const result = await this.updateStyleSettings(draft => {
      if (this.settings.graphLensesColorFuture !== undefined) throw new Error("Newer lens colors are read-only");
      const merged = mergeGraphLensDefinitions(opening, edited, draft.graphLenses);
      const known = new Set(appearanceColorReferences({graphLenses: draft.graphLenses}).map(value => JSON.stringify(value)));
      for (const value of appearanceColorReferences({graphLenses: merged})) if (!known.has(JSON.stringify(value))) requireNamedColor(value, draft.colorPreferences);
      draft.graphLenses = merged;
    }, owner);
    return result;
  }

  subscribeNodeFlair(listener: (path: string) => void): () => void {
    this.nodeFlairListeners.add(listener);
    return () => this.nodeFlairListeners.delete(listener);
  }

  requestNodeFlair(path: string): void {
    for (const listener of this.nodeFlairListeners) listener(path);
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
      this.deleteSidecarOwner(hostLeaf);
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

  /** Report an existing editor associated with this surface without creating or adopting a leaf. */
  hasAssociatedEditor(hostLeaf: WorkspaceLeaf): boolean {
    return this.availableSidecarLeaf(hostLeaf) !== null;
  }

  /** Focus only this surface's managed companion; an unrelated document tab is never a fallback. */
  focusAssociatedEditor(hostLeaf: WorkspaceLeaf): boolean {
    const leaf = this.availableSidecarLeaf(hostLeaf);
    if (!leaf) return false;
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    if (leaf.view instanceof MarkdownView) leaf.view.editor.focus();
    else leaf.view.containerEl.focus();
    return true;
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

  /**
   * Offer the visible tab in one unambiguous group on the configured edge, without acquiring it.
   * Hidden tabs, embedded views, other Plex surfaces and already managed companions are ineligible.
   * Multiple groups sharing that edge remain ambiguous, including utility-only groups.
   */
  getAdjacentSidecarCandidate(hostLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
    if (this.unloading || this.startupInitializing || !this.leafIsAttached(hostLeaf)
      || hostLeaf.view.getViewType() === KPLEX_SIDEPANEL_VIEW_TYPE
      || this.isSidecarOpen(hostLeaf) || this.sidecarMovingHosts.has(hostLeaf)) return null;
    const groups = new Map<HTMLElement, WorkspaceLeaf[]>();
    this.app.workspace.iterateAllLeaves(/** Inspect native geometry only; no file reads or ownership changes. */ leaf => {
      if (leaf === hostLeaf || this.adjacentPosition(hostLeaf, leaf) !== this.settings.sidecarPosition) return;
      const group = this.leafGroupElement(leaf);
      if (!group) return;
      const members = groups.get(group) ?? [];
      members.push(leaf);
      groups.set(group, members);
    });
    if (groups.size !== 1) return null;
    const visible = [...groups.values()][0].filter(/** Select the displayed native tab, never a hidden sibling. */ leaf => this.leafIsVisible(leaf));
    if (visible.length !== 1) return null;
    const leaf = visible[0];
    const type = leaf.getViewState().type;
    if (type === KPLEX_VIEW_TYPE || type === KPLEX_SIDEPANEL_VIEW_TYPE
      || isEmbeddedMarkdownLeaf(leaf) || this.isManagedSidecarLeaf(leaf)) return null;
    return type === "empty" || this.fileForLeaf(leaf) || this.indexedUrlPathForLeaf(leaf) ? leaf : null;
  }

  /** Read the exact displayed note/URL identity; an empty pane cannot supply a graph center. */
  getAdjacentSidecarTarget(hostLeaf: WorkspaceLeaf): { file: TFile | null; path: string } | null {
    const leaf = this.getAdjacentSidecarCandidate(hostLeaf);
    if (!leaf) return null;
    const file = this.fileForLeaf(leaf);
    const path = file?.path ?? this.indexedUrlPathForLeaf(leaf);
    return path ? { file, path } : null;
  }

  /**
   * Explicitly claim the currently eligible adjacent tab, then apply the selected initial flow.
   * No split is created/resized. Reverse flow preserves native content/mode and returns its identity
   * to this App's existing partial-index follow owner. Failure releases ownership without closing
   * the user's pane; overlapping attachment/move requests cannot acquire it twice.
   */
  async attachAdjacentSidecar(hostLeaf: WorkspaceLeaf, direction: "to-leaf" | "to-plex", page?: GraphPage): Promise<{ file: TFile | null; path: string } | null> {
    const leaf = this.getAdjacentSidecarCandidate(hostLeaf);
    if (!leaf) return null;
    const file = this.fileForLeaf(leaf);
    const path = file?.path ?? this.indexedUrlPathForLeaf(leaf);
    if (direction === "to-plex" && !path) return null;
    if (direction === "to-leaf" && (!page || !page.file && !page.url
      || page.file && this.app.vault.getFileByPath(page.file.path) !== page.file
      || page.url && !isWebViewerAvailable(this.app))) return null;
    const previous = {
      linked: this.linkedDocumentLeaf, last: this.lastDocumentLeaf,
      mode: this.settings.documentSyncMode, open: this.settings.sidecarOpen,
      file: this.settings.sidecarLastFilePath, url: this.settings.sidecarLastUrl,
    };
    this.sidecarMovingHosts.add(hostLeaf);
    this.setSidecarOwner(hostLeaf, leaf);
    this.linkedDocumentLeaf = leaf;
    this.lastDocumentLeaf = leaf;
    this.settings.documentSyncMode = "pinned";
    this.settings.sidecarOpen = true;
    this.notifySidecar();
    try {
      if (direction === "to-leaf" && page) await this.openPageInSidecarLeaf(leaf, page);
      else {
        this.settings.sidecarLastFilePath = file?.path ?? "";
        this.settings.sidecarLastUrl = this.webViewerUrlForLeaf(leaf) ?? "";
      }
      await this.saveSettings(false, false);
      // A moved/closed leaf or an explicit detach during persistence wins over completion.
      if (this.unloading || this.sidecarLeaves.get(hostLeaf) !== leaf) return null;
      if (!this.leafIsAttached(leaf) || this.adjacentPosition(hostLeaf, leaf) !== this.settings.sidecarPosition) {
        await this.releaseSidecar(hostLeaf, true);
        return null;
      }
      const currentFile = this.fileForLeaf(leaf);
      const currentPath = currentFile?.path ?? this.indexedUrlPathForLeaf(leaf);
      return direction === "to-plex" && currentPath ? { file: currentFile, path: currentPath } : null;
    } catch (error) {
      if (this.sidecarLeaves.get(hostLeaf) === leaf) {
        this.deleteSidecarOwner(hostLeaf);
        this.linkedDocumentLeaf = previous.linked;
        this.lastDocumentLeaf = previous.last;
        this.settings.documentSyncMode = previous.mode;
        this.settings.sidecarOpen = previous.open;
        this.settings.sidecarLastFilePath = previous.file;
        this.settings.sidecarLastUrl = previous.url;
      }
      throw error;
    } finally {
      this.sidecarMovingHosts.delete(hostLeaf);
      this.notifySidecar();
    }
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

  /** Adopt an unchanged startup match only while its exact opening view and unclaimed ownership survive. */
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
      const hostView = hostLeaf.view, revision = this.plexFoldRevisions.get(hostLeaf);
      const generation = hostView instanceof KplexView ? hostView.getPlexFoldGeneration() : null;
      /** Awaited startup discovery cannot supersede explicit acquisition, release or native remount. */
      const current = (): boolean => !this.unloading && this.settings.sidecarOpen && this.leafIsAttached(hostLeaf)
        && hostLeaf.view === hostView && (generation === null || hostView instanceof KplexView && hostView.getPlexFoldGeneration() === generation)
        && this.plexFoldRevisions.get(hostLeaf) === revision && !this.sidecarLeaves.has(hostLeaf) && !this.sidecarMovingHosts.has(hostLeaf);

      // Give Obsidian's restored split tree and DeferredViews time to hydrate before matching the
      // remembered adjacent tab-group. Startup restoration must never create an extra pane merely
      // because a legitimate restored sidecar has not produced a usable DOMRect yet.
      await this.waitForWorkspaceLayout(hostLeaf, 3);
      if (!current()) return;
      const restored = await this.waitForRestoredSidecarCandidate(hostLeaf);
      if (!current()) return;
      if (!restored) {
        // Preserve the user's restored workspace exactly as Obsidian opened it. A later explicit
        // sidecar action may create a managed companion, but startup itself is non-greedy.
        this.notifySidecar();
        return;
      }
      if (!this.leafIsAttached(restored) || this.isManagedSidecarLeaf(restored)) return;
      const actualPosition = this.adjacentPosition(hostLeaf, restored);
      if (!actualPosition) return;

      this.setSidecarOwner(hostLeaf, restored);
      this.linkedDocumentLeaf = restored;
      this.lastDocumentLeaf = restored;
      this.settings.documentSyncMode = "pinned";
      this.settings.sidecarPosition = actualPosition;
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
      this.deleteSidecarOwner(hostLeaf);
      if (this.linkedDocumentLeaf === leaf) this.linkedDocumentLeaf = null;
      this.lastDocumentLeaf = leaf;
      leaf = null;
    }

    // Normal Open never adopts an arbitrary adjacent/pinned tab. Existing tabs require the
    // separate explicit attachment gesture before Sidecar close/move can manage them.
    if (!leaf) leaf = this.createSidecarLeaf(hostLeaf, this.settings.sidecarPosition);
    this.setSidecarOwner(hostLeaf, leaf);
    this.settings.sidecarOpen = true;
    this.settings.documentSyncMode = "pinned";
    this.linkedDocumentLeaf = leaf;
    this.lastDocumentLeaf = leaf;
    const actualPosition = this.adjacentPosition(hostLeaf, leaf);
    if (actualPosition) this.settings.sidecarPosition = actualPosition;
    return leaf;
  }

  /**
   * Deliberately inspect a file and line in the managed companion. An older passive open must
   * not reapply its preview preference after this explicit source request finishes.
   */
  async openMarkdownInSidecar(hostLeaf: WorkspaceLeaf, file: TFile, line = 0, sourceMode = true): Promise<void> {
    const leaf = this.ensureSidecarLeaf(hostLeaf);
    if (!leaf) {
      await this.openInDocumentLeaf(file);
      return;
    }
    this.transientDocumentFollowSuppression = { path: file.path, until: Date.now() + 1800 };
    this.settings.sidecarLastFilePath = file.path;
    this.settings.sidecarLastUrl = "";
    this.retirePassiveSidecarRequestsForLeaf(leaf);
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

  /**
   * Retire completion leases only for owners of this exact managed destination. Explicit native
   * navigation wins over an older passive request even when both display the same canonical file.
   * This bounded inventory neither intercepts host events nor cancels native openFile itself.
   */
  private retirePassiveSidecarRequestsForLeaf(leaf: WorkspaceLeaf): void {
    for (const [hostLeaf, sidecarLeaf] of this.sidecarLeaves) {
      if (sidecarLeaf === leaf) this.passiveSidecarSyncRequests.delete(hostLeaf);
    }
  }

  /**
   * Open the selected page in the supplied native Sidecar leaf, preserving host navigation and
   * localized failure feedback. Passive callers supply an exact destination/request lifetime;
   * retired awaited opens cannot apply Markdown mode to a newer file or representation.
   * Passive file changes skip an already-correct Markdown mode instead of scheduling another
   * native state update; explicit representation requests still reapply their selected mode.
   * Explicit Open/move callers retain their existing unconditional representation behavior.
   */
  private async openPageInSidecarLeaf(leaf: WorkspaceLeaf, page: GraphPage, stillCurrent?: () => boolean): Promise<void> {
    if (stillCurrent && !stillCurrent()) return;
    if (!stillCurrent) this.retirePassiveSidecarRequestsForLeaf(leaf);
    if (page.url) {
      // setViewState resolves to a missing-plugin placeholder rather than rejecting an unavailable view.
      // Keep the companion's actual content/restore identity; explicit Open still uses host URL routing.
      if (!isWebViewerAvailable(this.app)) {
        new Notice(this.translator("notice.webViewerUnavailable"), 2600);
        return;
      }
      this.settings.sidecarLastUrl = page.url;
      this.settings.sidecarLastFilePath = "";
      try {
        await leaf.setViewState({ type: "webviewer", state: { url: page.url, navigate: true }, active: false });
      } catch {
        if (!stillCurrent || stillCurrent()) new Notice(this.translator("notice.webViewerUnavailable"), 2600);
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
    if (!stillCurrent || !this.leafDisplaysPage(leaf, page)) await leaf.openFile(page.file, { active: false });
    if (stillCurrent && (!stillCurrent() || !this.leafDisplaysPage(leaf, page))) return;
    const state = leaf.getViewState();
    const mode = this.settings.sidecarMarkdownMode === "preview" ? "preview" : "source";
    if (state.type === "markdown" && (!stillCurrent || state.state?.mode !== mode)) {
      await leaf.setViewState({
        ...state,
        active: false,
        state: { ...state.state, mode },
      });
    }
  }

  async openSidecar(hostLeaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    // Opening can emit layout-change before the new split has usable geometry,
    // just like moving an existing companion. Retain ownership through that boundary.
    const alreadyMoving = this.sidecarMovingHosts.has(hostLeaf);
    this.sidecarMovingHosts.add(hostLeaf);
    try {
      const leaf = this.ensureSidecarLeaf(hostLeaf);
      if (!leaf) return;
      await this.openPageInSidecarLeaf(leaf, page);
      await this.waitForWorkspaceLayout(hostLeaf);
      // Retained pixel bases from an earlier move can leave the new companion
      // with no allocation. Reuse the native adjacent-pane sizing repair.
      this.ensureAdjacentFileLeafSize(hostLeaf, leaf);
      await this.waitForWorkspaceLayout(hostLeaf);
      await this.saveSettings(false, false);
      this.notifySidecar();
    } finally {
      if (!alreadyMoving) this.sidecarMovingHosts.delete(hostLeaf);
    }
  }

  async closeSidecar(hostLeaf: WorkspaceLeaf, persist = true): Promise<void> {
    const collapsed = this.collapsedPlexHosts.get(hostLeaf);
    const leaf = this.sidecarLeaves.get(hostLeaf) ?? collapsed?.sidecarLeaf ?? null;
    this.restoreCollapsedPlex(hostLeaf);
    this.deleteSidecarOwner(hostLeaf);
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
    this.deleteSidecarOwner(hostLeaf);
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
      this.setSidecarOwner(hostLeaf, replacement);
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
          this.setSidecarOwner(hostLeaf, previousSidecar);
          this.linkedDocumentLeaf = previousSidecar;
          this.lastDocumentLeaf = previousSidecar;
          const previousPosition = this.adjacentPosition(hostLeaf, previousSidecar);
          if (previousPosition) this.settings.sidecarPosition = previousPosition;
          this.settings.sidecarOpen = true;
          this.settings.documentSyncMode = "pinned";
        } else {
          this.deleteSidecarOwner(hostLeaf);
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

  /**
   * Update a managed adjacent companion only when its actual target differs. A same-file view
   * toggle keeps its chosen representation, while another follower still receives genuine target
   * navigation. Captured leaf, file path/incarnation and request identity fence awaited mode and
   * settings work against navigation, rename, detachment, replacement and plugin unload.
   * Native opens on one managed leaf are serialized: Obsidian can coalesce an overlapping
   * newer open before it actually displays that target. Superseded queued requests never open.
   */
  async syncSidecarToPage(hostLeaf: WorkspaceLeaf, page: GraphPage): Promise<void> {
    if (this.unloading || !this.leafIsAttached(hostLeaf)) return;
    const leaf = this.validateSidecarLeaf(hostLeaf);
    if (!leaf || !this.adjacentPosition(hostLeaf, leaf)) return;
    const file = page.file;
    const filePath = file?.path;
    const previous = this.passiveSidecarSyncRequests.get(hostLeaf);
    // Native openFile can publish its destination after await; another same-target observation
    // must join that pending request rather than start a coalesced open with an early completion.
    if (previous?.leaf === leaf && (previous.pending || this.leafDisplaysPage(leaf, page)) && previous.file === file
      && previous.filePath === filePath && previous.url === page.url) return;
    // Publish the completion lease before invoking native code, including synchronous host echoes.
    let completeNative!: () => void;
    const nativeCompletion = new Promise<void>(/** Resolve on success or failure so a rejected predecessor cannot poison newer navigation. */ resolve => { completeNative = resolve; });
    const previousNativeFile = previous?.leaf === leaf && previous.pending ? previous.nativeFile : null;
    const request = { leaf, file, filePath, url: page.url, pending: true, nativeCompletion,
      nativeFile: previousNativeFile, previousNativeFile };
    this.passiveSidecarSyncRequests.set(hostLeaf, request);
    /** Only this exact live destination and canonical file incarnation may finish passive work. */
    const stillCurrent = (): boolean => !this.unloading
      && this.passiveSidecarSyncRequests.get(hostLeaf) === request
      && this.sidecarLeaves.get(hostLeaf) === leaf
      && this.leafIsAttached(hostLeaf) && this.leafIsAttached(leaf)
      && Boolean(this.adjacentPosition(hostLeaf, leaf))
      && (!file || (file.path === filePath && this.app.vault.getFileByPath(filePath ?? "") === file));
    try {
      if (previous?.leaf === leaf && previous.pending) await previous.nativeCompletion;
      if (!stillCurrent()) return;
      // A -> B -> A can return to the opening file after retiring A's original mode work.
      // Finish that owned initial representation without reopening; unrelated same-file
      // observations continue to preserve the user's representation.
      if (this.leafDisplaysPage(leaf, page) && (!file || previousNativeFile !== file)) return;
      request.nativeFile = file;
      await this.openPageInSidecarLeaf(leaf, page, stillCurrent);
      // Only native open/mode work belongs to the queue. A slow settings write must not
      // hold the next foreground target after the native destination has settled.
      completeNative();
      if (!stillCurrent() || !this.leafDisplaysPage(leaf, page)) return;
      // Persist actual content identity so startup reconnects to the remembered adjacent tab.
      await this.saveSettings(false, false);
    } finally {
      // A failed or retired open must not permanently suppress a later navigation to this target.
      request.pending = false;
      completeNative();
    }
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
    let leaf = this.app.workspace.getLeavesOfType(KPLEX_VIEW_TYPE)[0];
    if (!leaf) {
      if (target === "popout") {
        try { leaf = this.app.workspace.getLeaf("window"); }
        catch { leaf = this.app.workspace.getLeaf(true); }
      } else {
        leaf = this.app.workspace.getLeaf(true);
      }
      await leaf.setViewState({ type: KPLEX_VIEW_TYPE, active: true });
    }
    this.restorePlexFoldBeforeReveal(leaf);
    await this.app.workspace.revealLeaf(leaf);
  }

  /** Activate the native K-Plex sidepanel and report host-opening failures through localized notices. */
  async activateSidepanel(): Promise<void> {
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(KPLEX_SIDEPANEL_VIEW_TYPE)[0] ?? null;
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) {
        new Notice(this.translator("notice.sidepanelUnavailable"), 2200);
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

  /** Activate K-Plex in a supported native popout and localize failure feedback without changing platform availability policy. */
  async activateViewInPopout(): Promise<void> {
    this.rememberDocumentLeaf(this.app.workspace.getMostRecentLeaf());
    try {
      const leaf = this.app.workspace.getLeaf("window");
      await leaf.setViewState({ type: KPLEX_VIEW_TYPE, active: true });
      await this.app.workspace.revealLeaf(leaf);
    } catch {
      new Notice(this.translator("notice.popoutUnavailable"), 2200);
    }
  }

  async focusInKplex(path: string): Promise<void> {
    await this.activateView();
    await this.ensureIndexReady("focus-active-note");
    if (!this.index.get(path)) return;
    const history = [...this.settings.navigationHistory.filter((p) => p !== path), path].slice(-40);
    this.settings.navigationHistory = history;
    this.settings.lastActivePath = path;
    await this.saveSettings(false, false);
  }

  /** Explicitly open and reveal a native document, superseding passive work on that exact leaf. */
  async openInDocumentLeaf(file: TFile): Promise<void> {
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    this.retirePassiveSidecarRequestsForLeaf(leaf);
    await leaf.openFile(file, { active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  /** Open a section's native source subpath without letting an older passive mode request win. */
  async openSection(page: GraphPage): Promise<void> {
    const sourcePath = page.transient?.sourcePath;
    const subpath = page.transient?.subpath;
    if (!sourcePath || !subpath) return;
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;
    this.validateLinkedDocumentLeaf();
    const leaf = this.linkedDocumentLeaf ?? this.findRecentDocumentLeaf() ?? this.app.workspace.getLeaf("split");
    this.lastDocumentLeaf = leaf;
    this.retirePassiveSidecarRequestsForLeaf(leaf);
    await leaf.openFile(file, { active: true, eState: { subpath } });
    await this.app.workspace.revealLeaf(leaf);
  }


  /** Report whether Obsidian's internal Web Viewer is available for explicit URL actions. */
  canOpenUrlInWebViewer(): boolean {
    return isWebViewerAvailable(this.app);
  }

  /** Open a URL in the device browser, bypassing the optional internal Web Viewer. */
  openUrlInBrowser(url: string, ownerDocument = this.app.workspace.containerEl.ownerDocument): void {
    const viewWindow = ownerDocument.defaultView ?? window;
    viewWindow.open(url, "_blank", "noopener");
  }

  /** Open a URL in a dedicated native Web Viewer tab when that core view is enabled. */
  async openUrlInWebViewer(url: string): Promise<void> {
    if (!isWebViewerAvailable(this.app)) {
      new Notice(this.translator("notice.webViewerUnavailable"), 2600);
      return;
    }
    let leaf: WorkspaceLeaf;
    try { leaf = this.app.workspace.getLeaf("tab"); }
    catch { leaf = this.app.workspace.getLeaf(true); }
    await leaf.setViewState({ type: "webviewer", state: { url, navigate: true }, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  /** Open a graph page through its supported host target and localize product feedback; semantic identities remain unchanged. */
  async openPage(page: GraphPage, ownerDocument = this.app.workspace.containerEl.ownerDocument, options: { chooseFolder?: boolean } = {}): Promise<void> {
    if (page.url) {
      openExternalUrl(page.url, ownerDocument);
      return;
    }
    if (page.file) {
      await this.openInDocumentLeaf(page.file);
      return;
    }
    if (page.isFolder || page.isTag) {
      new Notice(this.translator(page.isFolder ? "notice.folder" : "notice.tag", { name: page.isTag ? `#${page.name}` : page.name }), 1600);
      return;
    }
    await this.createGhostNote(page, options.chooseFolder === true);
  }

  /** Render facets and styles under the same prepared policy, including during async refresh. */
  getViewSettings(surface: KplexViewSurface): KplexSettings {
    return effectiveViewSettings(this.index.withPreparedPresentationSettings(this.settings), surface, readObsidianPresentationEnvironment());
  }

  /** Capture the host device, independent of viewport width or selected Plex surface. */
  getTypographyDevice(): PersistedLayoutDeviceClass {
    return persistedLayoutDeviceClass(readObsidianPresentationEnvironment().device);
  }

  /** Stage only validated scalar device edits synchronously; the originating control owns its storage debounce. */
  stageTypographyOverride(device: PersistedLayoutDeviceClass, patch: Partial<TypographyValues>): void {
    this.settings.typographyProfiles = mergeTypographyOverride(this.settings.typographyProfiles, device, patch);
    this.index.notifyPresentation();
  }

  /** Persist latest staged preferences and surface storage failure without discarding the user's live edits. */
  async persistTypographySettings(): Promise<boolean> {
    try {
      await this.saveSettings(false);
      return true;
    } catch (error) {
      new Notice(this.translator("actions.saveFailed", { error: String(error) }));
      return false;
    }
  }

  /** Native Settings edits use the same device writer and canonical serialized persistence path. */
  async updateTypographyOverride(device: PersistedLayoutDeviceClass, patch: Partial<TypographyValues>): Promise<void> {
    this.stageTypographyOverride(device, patch);
    await this.persistTypographySettings();
  }

  /** Reset supported device fields to inheritance; a late preview save can persist but never recreate deleted overrides. */
  async resetTypographyOverride(device: PersistedLayoutDeviceClass, field?: TypographyField): Promise<void> {
    this.settings.typographyProfiles = resetDeviceTypography(this.settings.typographyProfiles, device, field);
    this.index.notifyPresentation();
    await this.persistTypographySettings();
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

  /** Open the existing note-type editor and expose only its lifecycle handle to the surface owner. */
  openNoteTypeModal(page: GraphPage, onClosed?: () => void): NoteTypeModal | null {
    if (!page.file || page.file.extension !== "md") return null;
    const modal = new NoteTypeModal(this, page.file, page.noteType, onClosed);
    modal.open(); return modal;
  }

  /** Open the native field selector and expose its close boundary to an optional action session. */
  openAddToOntologyModal(field: string, onSaved?: () => void, onClosed?: () => void): AddToOntologyModal | null {
    if (!field.trim()) return null;
    const dialog = new AddToOntologyModal(this, field.trim(), onSaved, onClosed);
    dialog.open(); return dialog;
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

  /** Register editor ontology actions with localized captions while preserving field values and action semantics. */
  private registerOntologyContextMenu(): void {
    this.registerEvent(this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
      if (!(view instanceof MarkdownView)) return;
      const field = this.fieldAtEditorCursor(editor);
      if (!field) return;
      menu.addItem((item) => item
        .setTitle(this.translator("ontology.contextMenu", { field }))
        .setIcon("network")
        .onClick(() => this.openAddToOntologyModal(field)));
    }));
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
        if (item.type === "file" && item.path && this.app.vault.getAbstractFileByPath(item.path)) {
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

  /** Release document listeners before hiding the menu, including reentrant native onHide callbacks. */
  dismissKplexMenu(): void {
    const menu = this.activeKplexMenu;
    const closedDocument = this.justClosedKplexMenu?.document;
    if (this.kplexMenuReleaseTimer !== null) closedDocument?.defaultView?.clearTimeout(this.kplexMenuReleaseTimer);
    this.kplexMenuReleaseTimer = null;
    this.activeKplexMenuDocument?.removeEventListener("pointerdown", this.kplexMenuOutsidePointerDown, true);
    this.activeKplexMenuDocument?.defaultView?.removeEventListener("keydown", this.kplexMenuEscapeKeyDown, true);
    closedDocument?.defaultView?.removeEventListener("keydown", this.kplexMenuEscapeKeyDown, true);
    this.justClosedKplexMenu = null;
    this.activeKplexMenuDocument = null;
    this.activeKplexMenu = null;
    this.activeKplexMenuLeaf = null;
    menu?.hide();
  }

  /** Track the originating Plex leaf explicitly: workspace focus may belong to another pane or window. */
  private trackKplexMenu(menu: Menu, ownerDocument: Document, hostLeaf: WorkspaceLeaf): void {
    this.dismissKplexMenu();
    this.activeKplexMenu = menu;
    this.activeKplexMenuDocument = ownerDocument;
    this.activeKplexMenuLeaf = hostLeaf;
    ownerDocument.addEventListener("pointerdown", this.kplexMenuOutsidePointerDown, true);
    // Obsidian's document capture scope hides the menu before later document listeners run.
    // Window capture must own cancellation first, or its Escape continues into native tab focus.
    ownerDocument.defaultView?.addEventListener("keydown", this.kplexMenuEscapeKeyDown, true);
    menu.onHide(/** Retain cancellation through this native dispatch, then release the exact menu's listeners. */ () => {
      if (this.activeKplexMenu !== menu) return;
      const closed = { leaf: this.activeKplexMenuLeaf, document: ownerDocument };
      this.justClosedKplexMenu = closed;
      this.activeKplexMenu = null;
      this.activeKplexMenuLeaf = null;
      this.activeKplexMenuDocument = null;
      ownerDocument.removeEventListener("pointerdown", this.kplexMenuOutsidePointerDown, true);
      const viewWindow = ownerDocument.defaultView;
      if (!viewWindow) { this.justClosedKplexMenu = null; return; }
      // The host's earlier window key listener hides the menu before ours runs. Keep this one
      // cancellation token until that event unwinds; pointer/Enter actions never restore focus.
      // Microtasks can run between native DOM listeners. A next-task release is required to
      // retain cancellation through the complete key dispatch, not merely this callback.
      this.kplexMenuReleaseTimer = viewWindow.setTimeout(/** Release cancelled/selected menu ownership without touching a replacement menu. */ () => {
        this.kplexMenuReleaseTimer = null;
        if (this.justClosedKplexMenu === closed) this.justClosedKplexMenu = null;
        if (this.activeKplexMenuDocument?.defaultView !== viewWindow) {
          viewWindow.removeEventListener("keydown", this.kplexMenuEscapeKeyDown, true);
        }
      }, 0);
    });
  }

  /** Present the shared tracked menu in the pointer event's owning document. */
  showKplexMenuAtMouseEvent(menu: Menu, event: MouseEvent, hostLeaf: WorkspaceLeaf): void {
    const ownerDocument = event.view?.document ?? document;
    this.dismissKplexMenu();
    menu.showAtMouseEvent(event);
    // Native show first resets its prior visibility. Track only the displayed lifetime so that
    // that initial hide cannot retire the new menu's Escape/outside listeners.
    this.trackKplexMenu(menu, ownerDocument, hostLeaf);
  }

  /** Present the shared tracked menu at a control's owner-document coordinates. */
  showKplexMenuAtPosition(menu: Menu, position: { x: number; y: number }, ownerDocument: Document, hostLeaf: WorkspaceLeaf): void {
    this.dismissKplexMenu();
    menu.showAtPosition(position, ownerDocument);
    this.trackKplexMenu(menu, ownerDocument, hostLeaf);
  }

  /** Open the native plugin settings tab, or display localized guidance when the host controller is unavailable. */
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
    new Notice(this.translator("notice.openPluginSettings"), 3000);
  }

  /** All creation gestures share the React composer, including preselected gate/history endpoints. */
  openRelationModal(options: RelationModalOptions): NewRelatedNoteModal | RelationModal {
    if (options.mode === "create") {
      const modal = new NewRelatedNoteModal(this, options.origin, options.semanticRole, options.onCommitted, options.hostLeaf, options.fixedTarget, options.invocation);
      modal.open(); return modal;
    }
    const modal = new RelationModal(this, options);
    modal.open(); return modal;
  }

  triggerHoverPreview(page: GraphPage, targetEl: HTMLElement, event: MouseEvent | PointerEvent, sourcePath = ""): void {
    if (!page.file) return;
    this.app.workspace.trigger("hover-link", {
      event,
      source: KPLEX_VIEW_TYPE,
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

  /** Collect vault/index counts on demand for the About vault dialog without changing graph state. */
  getVaultStatistics(): {
    indexStatus: string; markdownFiles: number; notes: number; excalidrawDrawings: number | null;
    urls: number; folders: number; tags: number; placeholders: number;
    attachments: number; images: number; video: number; otherAttachments: number;
    ontologyTotal: number; ontologyUsed: number;
  } {
    const markdownFiles = this.app.vault.getMarkdownFiles();
    const excalidrawAvailable = this.isExcalidrawAvailable();
    const excalidrawDrawings = excalidrawAvailable
      ? markdownFiles.filter((file) => /\.excalidraw\.md$/i.test(file.path)
        || Boolean(this.app.metadataCache.getFileCache(file)?.frontmatter?.["excalidraw-plugin"])).length
      : null;
    const attachments = this.app.vault.getFiles().filter((file) => file.extension.toLowerCase() !== "md");
    const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "heic", "heif"]);
    const videoExtensions = new Set(["mp4", "webm", "mov", "m4v", "avi", "mkv", "ogv"]);
    const images = attachments.filter((file) => imageExtensions.has(file.extension.toLowerCase())).length;
    const video = attachments.filter((file) => videoExtensions.has(file.extension.toLowerCase())).length;
    const pages = this.index.allPages();
    const vaultRoot = this.app.vault.getRoot();
    const folders = this.app.vault.getAllLoadedFiles().filter((item) => item instanceof TFolder && item !== vaultRoot).length;
    const tags = new Set<string>();
    for (const file of markdownFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;
      for (const tag of getAllTags(cache) ?? []) tags.add(tag);
    }
    const ontologyNames = new Set(this.allOntologyFields().map(normalizeFieldName));
    const usedOntology = new Set<string>();
    for (const page of pages) {
      for (const relation of this.index.evidenceFrom(page.path)) {
        for (const evidence of relation.evidence) {
          if (!evidence.fieldName) continue;
          const normalized = normalizeFieldName(evidence.fieldName);
          if (ontologyNames.has(normalized)) usedOntology.add(normalized);
        }
      }
    }
    return {
      indexStatus: this.getIndexStatus().label,
      markdownFiles: markdownFiles.length,
      notes: markdownFiles.length - (excalidrawDrawings ?? 0),
      excalidrawDrawings,
      urls: pages.filter((page) => Boolean(page.url)).length,
      folders,
      tags: tags.size,
      placeholders: pages.filter((page) => !page.file && !page.url && !page.isFolder && !page.isTag).length,
      attachments: attachments.length,
      images,
      video,
      otherAttachments: attachments.length - images - video,
      ontologyTotal: ontologyNames.size,
      ontologyUsed: usedOntology.size,
    };
  }

  private referenceForPage(page: GraphPage, storageFile: TFile): string {
    if (page.file) return this.app.fileManager.generateMarkdownLink(page.file, storageFile.path);
    if (page.url) return page.url;
    return `[[${page.path}]]`;
  }

  /** Compare unresolved note spelling without guessing a basename or collapsing distinct file identities. */
  private normalizedNoteReferenceMatches(rawPath: string, targetPath: string): boolean {
    const reference = normalizePath(rawPath.split("#", 1)[0].trim()).replace(/\.md$/i, "");
    const target = normalizePath(targetPath).replace(/\.md$/i, "");
    if (!reference || !target) return false;
    return reference === target;
  }

  /** Resolved references use exact canonical paths; only an unresolved target allows extension normalization. */
  private valueContainsTarget(value: unknown, storageFile: TFile, target: GraphPage): boolean {
    const references = extractLinksFromValue(this.app, value, storageFile);
    return references.some(/** Host resolution supplies case-sensitive identities, never guessed basenames. */ path => this.referenceMatchesTarget(path, target));
  }

  /** Share exact canonical matching between membership and token-preservation validation. */
  private referenceMatchesTarget(path: string, target: GraphPage): boolean {
    if (target.url !== null) return path === target.url;
    return target.file ? path === target.path : this.normalizedNoteReferenceMatches(path, target.path);
  }

  /** Count every unrelated canonical reference occurrence through the shared parser/host resolver. */
  private nonTargetReferenceCounts(value: unknown, storageFile: TFile, target: GraphPage): Map<string, number> {
    const counts = new Map<string, number>();
    for (const path of iterateResolvedLinksFromValue(this.app, value, storageFile)) {
      if (!this.referenceMatchesTarget(path, target)) counts.set(path, (counts.get(path) ?? 0) + 1);
    }
    return counts;
  }

  /** Remove recognized matching link tokens, refusing grammar that cannot be transformed completely. */
  private stripTargetFromScalar(value: string, storageFile: TFile, target: GraphPage): string | null {
    if (!this.valueContainsTarget(value, storageFile, target)) return value;
    const tokens = /(\[\[[^\]]+\]\]|\[[^\]]*\]\([^)]+\)|https?:\/\/[^\s,;]+)/gi;
    const stripped = value.replace(tokens, /** A token may be removed only when all its references are the approved target. */ (token) => {
      if (!this.valueContainsTarget(token, storageFile, target)) return token;
      // A broad lexical token may enclose another reference. Never consume an unrelated link as
      // collateral damage; this grammar needs source editing rather than a guessed rewrite.
      if (extractLinksFromValue(this.app, token, storageFile).some(/** Reject collateral removal of another canonical target. */ path => !this.referenceMatchesTarget(path, target))) {
        throw new Error(this.translator("explain.removeUnsupported"));
      }
      return "";
    })
      .replace(/\s*[,;]\s*[,;]+/g, ", ")
      .replace(/^\s*[,;]\s*|\s*[,;]\s*$/g, "")
      .trim();
    if (stripped === value || this.valueContainsTarget(stripped, storageFile, target)) throw new Error(this.translator("explain.removeUnsupported"));
    const before = this.nonTargetReferenceCounts(value, storageFile, target);
    const after = this.nonTargetReferenceCounts(stripped, storageFile, target);
    if (before.size !== after.size || [...before].some(/** Every unrelated occurrence must survive transformation. */ ([path, count]) => after.get(path) !== count)) {
      throw new Error(this.translator("explain.removeUnsupported"));
    }
    return stripped || null;
  }

  /** Remove all matching references inside one selected property while preserving unrelated nested values. */
  private removeTargetFromValue(value: unknown, storageFile: TFile, target: GraphPage): unknown {
    if (!this.valueContainsTarget(value, storageFile, target)) return value;
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
        // YAML keys are data, including "__proto__"; assignment must not invoke a prototype setter.
        if (next !== undefined) Object.defineProperty(kept, key, { value: next, enumerable: true, writable: true, configurable: true });
      }
      return Object.keys(kept).length ? kept : undefined;
    }
    return value;
  }

  /** Own the exact metadata/body observer; pending status is localized and never closes the composer early. */
  private async mutateRelationshipMetadata(file: TFile, fields: ReadonlySet<string>, mutate: (frontmatter: Record<string, unknown>) => void, targetPath: string, beforeMutation?: () => boolean): Promise<void> {
    const targetIdentity = this.app.vault.getFileByPath(targetPath);
    await writeRelationshipMetadata(this.app, file, fields, mutate, {
      /** Release this bounded observer independently of modal lifetime. */
      own: cancel => { this.relationshipWriteCancels.add(cancel); return () => { this.relationshipWriteCancels.delete(cancel); }; },
      /** The existing wait boundary reports a saved mutation awaiting its graph, not a failed write. */
      pending: () => { new Notice(this.translator("relation.savedUpdatePending"), 4000); },
      savedPendingMessage: () => this.translator("relation.savedUpdatePending"),
      /** Recheck exact pair authority after FileManager's awaited read and before any mutation. */
      current: () => !this.unloading && this.app.vault.getFileByPath(file.path) === file
        && this.app.vault.getFileByPath(targetIdentity?.path ?? targetPath) === targetIdentity
        && this.index.isSemanticWriteReady(file.path, targetIdentity?.path ?? targetPath)
        && beforeMutation?.() !== false,
      preparingMessage: () => this.translator("relation.preparingRelationship"),
    });
  }

  /** Prepare only this editable pair and reacquire pages before the first persistence effect. */
  private async prepareRelationshipMutation(sourcePath: string, targetPath: string,
    expectedSource: TFile | null = this.app.vault.getFileByPath(sourcePath),
    expectedTarget: TFile | null = this.app.vault.getFileByPath(targetPath),
  ): Promise<readonly [GraphPage, GraphPage]> {
    // A path can be reused while a composer or pair acquisition is awaiting. File identity is
    // bounded to this operation; the same renamed TFile follows its current physical path.
    sourcePath = expectedSource?.path ?? sourcePath;
    targetPath = expectedTarget?.path ?? targetPath;
    /** The same renamed file survives; path reuse by a replacement never does. */
    const current = (): boolean => !this.unloading
      && this.app.vault.getFileByPath(expectedSource?.path ?? sourcePath) === expectedSource
      && this.app.vault.getFileByPath(expectedTarget?.path ?? targetPath) === expectedTarget;
    if (!current() || !(await this.index.prepareRelationshipPair(sourcePath, targetPath)) || !current()) {
      throw new Error(this.translator("relation.preparingRelationship"));
    }
    sourcePath = expectedSource?.path ?? sourcePath;
    targetPath = expectedTarget?.path ?? targetPath;
    const source = this.index.get(sourcePath), target = this.index.get(targetPath);
    if (!source || !target || source.file !== expectedSource || target.file !== expectedTarget
      || !this.index.isSemanticWriteReady(sourcePath, targetPath)) throw new Error(this.translator("relation.preparingRelationship"));
    return [source, target];
  }

  /** After saving, only an actual canonical pair publication completes the mutation contract. */
  private async publishSavedRelationship(sourcePath: string, targetPath: string): Promise<void> {
    if (!(await this.index.prepareRelationshipPair(sourcePath, targetPath))) throw new SavedRelationshipPendingError(this.translator("relation.savedUpdatePending"));
  }

  /** Persist a selected ontology move and await all affected metadata/body observations before returning. */
  private async writeRelationship(storageFile: TFile, target: GraphPage, field: string, referenceOverride?: string): Promise<void> {
    if (!this.index.isSemanticWriteReady(storageFile.path, target.path)
      && !(await this.index.prepareRelationshipPair(storageFile.path, target.path, this.index.get(target.path) ? undefined : target))) {
      throw new Error(this.translator("relation.preparingRelationship"));
    }
    // Keep the existing reactive metadata lane suppressed for this managed write. Source acquisition
    // observes actual Vault/MetadataCache events independently; the caller publishes only after the
    // exact current cache/body observer and canonical pair preparation have both completed.
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
    const ontologyFields = new Set(this.allOntologyFields().map(normalizeFieldName));
    const desiredNormalized = normalizeFieldName(field);
    const reference = referenceOverride ?? this.referenceForPage(target, storageFile);

    await this.mutateRelationshipMetadata(storageFile, new Set([...ontologyFields, desiredNormalized]), (frontmatter: Record<string, unknown>) => {
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
    }, target.path);
  }

  private async addRelationshipOntology(storageFile: TFile, target: GraphPage, field: string): Promise<void> {
    if (!this.index.isSemanticWriteReady(storageFile.path, target.path)
      && !(await this.index.prepareRelationshipPair(storageFile.path, target.path, this.index.get(target.path) ? undefined : target))) {
      throw new Error(this.translator("relation.preparingRelationship"));
    }
    // Connection details adds an additional ontology; it must not remove the same target from
    // other ontology properties or rewrite Markdown-body evidence.
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
    const desiredNormalized = normalizeFieldName(field);
    const reference = this.referenceForPage(target, storageFile);

    await this.mutateRelationshipMetadata(storageFile, new Set([desiredNormalized]), (frontmatter: Record<string, unknown>) => {
      this.appendRelationshipReference(frontmatter, storageFile, target, field, reference);
    }, target.path);
  }

  /** Append one requested reference without removing other properties, relationships or template metadata. */
  private appendRelationshipReference(frontmatter: Record<string, unknown>, storageFile: TFile, target: GraphPage, field: string, reference: string): void {
    const desiredNormalized = normalizeFieldName(field);
    const desiredKey = Object.keys(frontmatter).find(/** Preserve the existing spelling of the requested property. */ key => normalizeFieldName(key) === desiredNormalized) ?? field;
    const current = frontmatter[desiredKey];
    if (current === undefined || current === null || current === "") {
      frontmatter[desiredKey] = [reference];
      return;
    }
    if (this.valueContainsTarget(current, storageFile, target)) return;
    if (Array.isArray(current)) frontmatter[desiredKey] = [...(current as unknown[]), reference];
    else frontmatter[desiredKey] = [current, reference];
  }

  private async clearFrontmatterRelationship(storageFile: TFile, target: GraphPage): Promise<void> {
    if (!this.index.isSemanticWriteReady(storageFile.path, target.path)
      && !(await this.index.prepareRelationshipPair(storageFile.path, target.path, this.index.get(target.path) ? undefined : target))) {
      throw new Error(this.translator("relation.preparingRelationship"));
    }
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
    const ontologyFields = new Set(this.allOntologyFields().map(normalizeFieldName));
    await this.mutateRelationshipMetadata(storageFile, ontologyFields, (frontmatter: Record<string, unknown>) => {
      for (const key of Object.keys(frontmatter)) {
        if (!ontologyFields.has(normalizeFieldName(key))) continue;
        const next = this.removeTargetFromValue(frontmatter[key], storageFile, target);
        if (next === undefined) delete frontmatter[key];
        else frontmatter[key] = next;
      }
    }, target.path);
  }

  /** Create a relationship from a physical gate using the existing semantic-role and endpoint policy; localize user-visible validation. */
  async createRelationFromGate(origin: GraphPage, semanticRole: GateRole, selectedFile: TFile, selectedField: string): Promise<RelationshipWriteResult> {
    const selectedPage = this.index.get(selectedFile.path);
    if (!selectedPage) {
      new Notice(this.translator("notice.selectedNoteNotIndexed"), 2200);
      return { state: "unavailable" };
    }
    return this.createRelationToPage(origin, semanticRole, selectedPage, selectedField);
  }

  /** Persist an existing-target relationship under exact current pair authority, then await canonical saved publication. */
  async createRelationToPage(origin: GraphPage, semanticRole: RelationshipRole, target: GraphPage, selectedField: string, referenceOverride?: string): Promise<RelationshipWriteResult> {
    return this.index.withForegroundPriority(async () => {
      const originPath = origin.path;
      const targetPath = target.path;
      if (originPath === targetPath) return { state: "unavailable" };
      [origin, target] = await this.prepareRelationshipMutation(originPath, targetPath, origin.file, target.file);
      const gate = semanticRole === "parent" ? "top" : semanticRole === "child" ? "bottom" : semanticRole === "left" || semanticRole === "previous" ? "left" : "right";
      if (this.index.gateNeighbourPaths(origin, gate).has(target.path)) {
        new Notice(this.translator("notice.alreadyConnected"), 1800);
        return { state: "unavailable" };
      }

      // A target connected through another gate remains a valid drag target. Treat that gesture
      // as a relink so the new YAML relationship becomes authoritative over any stale body link.
      if (this.index.isConnected(origin, target.path)) {
        return this.relinkCentralNeighbour(origin, target, semanticRole, selectedField, origin.neighbours.get(target.path)?.direction ?? null);
      }

      if (origin.file?.extension === "md") {
        await this.writeRelationship(origin.file, target, selectedField, referenceOverride);
        await this.publishSavedRelationship(origin.path, target.path);
      } else if (target.file?.extension === "md") {
        const inverseField = this.inverseOntologyField(selectedField, semanticRole);
        await this.writeRelationship(target.file, origin, inverseField);
        await this.publishSavedRelationship(target.path, origin.path);
      } else {
        new Notice(this.translator("notice.dragOriginRequiresMarkdownTarget"), 2800);
        return { state: "unavailable" };
      }
      return { state: "saved-published", page: this.index.get(target.path) ?? target };
    });
  }

  /** Append ontology evidence to a connection while preserving its existing sources and localizing validation/confirmation feedback. */
  async addOntologyToConnection(
    center: GraphPage,
    neighbour: GraphPage,
    semanticRole: RelationshipRole,
    selectedField: string,
    storagePathOverride: string | null = null,
  ): Promise<RelationshipWriteResult> {
    return this.index.withForegroundPriority(async () => {
      [center, neighbour] = await this.prepareRelationshipMutation(center.path, neighbour.path, center.file, neighbour.file);
      const centerFile = center.file?.extension === "md" ? center.file : null;
      const neighbourFile = neighbour.file?.extension === "md" ? neighbour.file : null;
      if (!centerFile && !neighbourFile) {
        new Notice(this.translator("notice.relationshipNeedsMarkdown"), 2600);
        return { state: "unavailable" };
      }

      const candidates = this.index.relationshipStorageCandidates(center.path, neighbour.path);
      let storagePath: string | null = storagePathOverride && candidates.includes(storagePathOverride)
        ? storagePathOverride
        : (candidates.length > 0 ? candidates[0] : null);
      if (!storagePath) storagePath = centerFile?.path ?? neighbourFile?.path ?? null;

      if (storagePath === centerFile?.path && centerFile) {
        await this.addRelationshipOntology(centerFile, neighbour, selectedField);
        await this.publishSavedRelationship(center.path, neighbour.path);
      } else if (storagePath === neighbourFile?.path && neighbourFile) {
        const inverseField = this.inverseOntologyField(selectedField, semanticRole);
        await this.addRelationshipOntology(neighbourFile, center, inverseField);
        await this.publishSavedRelationship(center.path, neighbour.path);
      } else if (centerFile) {
        await this.addRelationshipOntology(centerFile, neighbour, selectedField);
        await this.publishSavedRelationship(center.path, neighbour.path);
      } else if (neighbourFile) {
        const inverseField = this.inverseOntologyField(selectedField, semanticRole);
        await this.addRelationshipOntology(neighbourFile, center, inverseField);
        await this.publishSavedRelationship(center.path, neighbour.path);
      }
      return { state: "saved-published", page: this.index.get(neighbour.path) ?? neighbour };
    });
  }

  /** Move the selected central relationship through its existing ontology persistence path and localize user-visible validation. */
  async relinkCentralNeighbour(
    center: GraphPage,
    neighbour: GraphPage,
    semanticRole: RelationshipRole,
    selectedField: string,
    existingDirection: LinkDirection | null = null,
    storagePathOverride: string | null = null,
  ): Promise<RelationshipWriteResult> {
    return this.index.withForegroundPriority(async () => {
      [center, neighbour] = await this.prepareRelationshipMutation(center.path, neighbour.path, center.file, neighbour.file);
      const centerFile = center.file?.extension === "md" ? center.file : null;
      const neighbourFile = neighbour.file?.extension === "md" ? neighbour.file : null;
      if (!centerFile && !neighbourFile) {
        new Notice(this.translator("notice.relationshipNeedsMarkdown"), 2600);
        return { state: "unavailable" };
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
        await this.publishSavedRelationship(center.path, neighbour.path);
      } else if (storagePath === neighbourFile?.path && neighbourFile) {
        await this.writeRelationship(neighbourFile, center, inverseField);
        await this.publishSavedRelationship(center.path, neighbour.path);
      } else if (centerFile) {
        await this.writeRelationship(centerFile, neighbour, selectedField);
        await this.publishSavedRelationship(center.path, neighbour.path);
      } else if (neighbourFile) {
        await this.writeRelationship(neighbourFile, center, inverseField);
        await this.publishSavedRelationship(center.path, neighbour.path);
      }
      return { state: "saved-published", page: this.index.get(neighbour.path) ?? neighbour };
    });
  }

  /** Derive a portable physical filename; an explicit folder uses exact lookups and permits matching basenames elsewhere. */
  validateRelatedNoteName(rawName: string, targetFolder?: string): { stem: string; valid: boolean; error: string | null; existing: TFile | null } {
    const displayName = rawName.trim();
    if (!displayName) return { stem: "", valid: false, error: this.translator("note.validation.type"), existing: null };

    const source = displayName.replace(/\.excalidraw(?:\.md)?$/i, "").replace(/\.md$/i, "").trim();
    let stem = "";
    for (const character of source) {
      const codePoint = character.codePointAt(0) ?? 0;
      stem += codePoint < 0x20 || '<>:"/\\|?*'.includes(character) ? "-" : character;
    }
    stem = stem.replace(/\s+/g, " ").replace(/[. ]+$/g, "").trim();
    if (!stem || stem === "." || stem === "..") stem = "Untitled";
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(stem)) stem = `${stem}-note`;

    if (targetFolder !== undefined) {
      const prefix = targetFolder ? `${targetFolder}/` : "";
      const existing = [".md", ".excalidraw.md", ".excalidraw"].map(/** A selected destination needs only exact native lookups, never a vault scan. */ extension =>
        this.app.vault.getFileByPath(`${prefix}${stem}${extension}`)).find(/** Ignore absent alternatives without broadening native identity. */ file => file !== null) ?? null;
      return { stem, valid: true, error: null, existing };
    }
    const normalized = stem.toLocaleLowerCase();
    const existing = this.app.vault.getFiles().find((file) => {
      const lowerName = file.name.toLocaleLowerCase();
      if (file.extension !== "md" && file.extension !== "excalidraw") return false;
      const candidate = lowerName.endsWith(".excalidraw.md")
        ? file.name.slice(0, -".excalidraw.md".length)
        : file.name.replace(/\.(?:md|excalidraw)$/i, "");
      return candidate.toLocaleLowerCase() === normalized;
    }) ?? null;

    return { stem, valid: true, error: null, existing };
  }

  /** Validate a vault-relative destination before folder creation or unresolved-link persistence. */
  validateNoteFolderPath(rawPath: string): { folderPath: string; error: string | null } {
    const path = rawPath.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
    const invalid = path.split("/").some(/** Physical paths retain valid Obsidian characters; link representability is a separate commit check. */ part =>
      part === "." || part === ".." || [...part].some(character => (character.codePointAt(0) ?? 0) < 0x20 || '<>:"|?*'.includes(character)));
    if (invalid) return { folderPath: path, error: this.translator("folderPicker.invalid") };
    const folderPath = path ? normalizePath(path) : "";
    const occupant = folderPath ? this.app.vault.getFileByPath(folderPath) : null;
    return { folderPath, error: occupant ? this.translator("folderPicker.fileConflict") : null };
  }

  /** Apply Obsidian's new-note location preference to the captured origin, independently of the active editor. */
  newRelatedNoteFolder(origin: GraphPage, rawName: string, kind: GhostMaterializationKind = "markdown"): string {
    const validation = this.validateRelatedNoteName(rawName, "");
    const proposedName = `${validation.stem || "Untitled"}${kind === "excalidraw" ? ".excalidraw.md" : ".md"}`;
    const parent = this.app.fileManager.getNewFileParent(origin.file?.path ?? origin.path, proposedName);
    return parent.path === "/" ? "" : parent.path;
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

  /** Locate the document YAML boundary, borrowing captured lines when a preview already owns the body. */
  private async frontmatterDocumentLineRange(file: TFile, capturedLines?: readonly string[]): Promise<{ start: number; end: number } | null> {
    const lines = capturedLines ?? (await this.app.vault.cachedRead(file)).split(/\r?\n/);
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

  /** Resolve actual native link positions before target deletion, excluding the existing YAML range. */
  private async markdownBodyReferenceLines(file: TFile, targetPath: string, capturedLines?: readonly string[]): Promise<number[]> {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];
    const frontmatter = await this.frontmatterDocumentLineRange(file,capturedLines);
    const lines = new Set<number>();
    for (const link of [...(cache.links ?? []), ...(cache.embeds ?? [])]) {
      if (!this.linkCacheMatchesTarget(link.link, file.path, targetPath)) continue;
      const line = link.position.start.line;
      if (frontmatter && line >= frontmatter.start && line <= frontmatter.end) continue;
      lines.add(line);
    }
    return [...lines].sort((a, b) => a - b);
  }

  /** Capture actual body link and inline provenance while the target still resolves; deletion reuses these navigation coordinates. */
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
        label: evidence.fieldName ? this.translator("explain.fieldAtLine", { field: evidence.fieldName, line: line + 1 }) : this.translator("explain.inlineRelationshipAtLine", { line: line + 1 }),
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
        label: this.translator("explain.linkAtLine", { line: line + 1 }),
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

  /** Capture bounded discovered property/body references and exact resolved spellings before trash retires target resolution. */
  async captureDeleteNodePreview(target: GraphPage): Promise<DeleteNodePreview> {
    const hiddenFields = [...new Set(this.settings.hierarchy.hidden.filter(/** Empty keys cannot form properties. */ field => field.trim()))];
    const ontology = new Set([...this.allOntologyFields(), ...hiddenFields].map(normalizeFieldName));
    const removeOntologyLinksOnDelete = this.settings.removeOntologyLinksOnDelete !== false;
    const preview: DeleteNodePreview = {sources: [], hiddenFields, hiddenField: hiddenFields[0] ?? "", removeOntologyLinksOnDelete};
    const targetPath = target.path, targetFile = target.file;
    let retainedBytes = 2 * hiddenFields.join("").length;
    for (const file of this.referencingMarkdownFiles(target)) {
      const path = file.path, cache = this.app.metadataCache.getFileCache(file), frontmatter = cache?.frontmatter ?? {};
      const source: DeleteSourcePreview = {file, path, properties: [], hiddenPayload: relationshipMetadataPayload(frontmatter,new Set(hiddenFields.map(normalizeFieldName))),bodyText:"",bodyStart:0,bodyReferences:[],targetSpellings:[]};
      retainedBytes += 512 + 2 * (path.length + source.hiddenPayload.length);
      if (retainedBytes + 2 * file.stat.size > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translator("delete.cleanup.previewTooLarge"));
      const content = await this.app.vault.cachedRead(file);
      if (retainedBytes + 2 * content.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translator("delete.cleanup.previewTooLarge"));
      const lines = content.split(/\r?\n/);
      const documentRange = await this.frontmatterDocumentLineRange(file,lines);
      source.bodyStart = documentRange ? documentRange.end + 1 : 0;
      source.bodyText = lines.slice(source.bodyStart).join("\n");
      const spellings = new Set<string>([target.path]);
      retainedBytes += 128 + 2 * target.path.length;
      for (const reference of iterateLinkReferencesFromValue([frontmatter,source.bodyText])) {
        if (reference.external) continue;
        let spelling = reference.rawTarget.trim();
        try {spelling = decodeURIComponent(spelling);} catch { /* Match the existing host resolver's undecodable spelling. */ }
        spelling = spelling.split("#",1)[0];
        const resolved = this.app.metadataCache.getFirstLinkpathDest(spelling,path);
        if (!(targetFile ? resolved === targetFile : !resolved && this.normalizedNoteReferenceMatches(spelling,target.path)) || spellings.has(spelling)) continue;
        retainedBytes += 128 + 2 * spelling.length;
        if (retainedBytes + 4 * content.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translator("delete.cleanup.previewTooLarge"));
        spellings.add(spelling);
      }
      source.targetSpellings = [...spellings];
      const bodyLines = await this.markdownBodyReferenceLines(file,target.path,lines);
      source.bodyReferences = this.remainingBodyReferences(file,target,bodyLines).map(/** Relative positions survive an otherwise unchanged YAML rewrite. */ reference => ({...reference,line:reference.line-source.bodyStart}));
      retainedBytes += 2 * source.bodyText.length + 256 * source.bodyReferences.length;
      if (retainedBytes + 4 * content.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translator("delete.cleanup.previewTooLarge"));
      if (this.unloading || file.path !== path || this.app.vault.getFileByPath(path) !== file || this.app.metadataCache.getFileCache(file) !== cache
        || target.path !== targetPath || target.file !== targetFile || targetFile && this.app.vault.getFileByPath(targetPath) !== targetFile) throw new Error(this.translator("addRelated.endpointChanged"));
      for (const field of Object.keys(frontmatter)) {
        if (!this.valueContainsTarget(frontmatter[field],file,target)) continue;
        const payload = relationshipMetadataPayload(frontmatter,new Set([normalizeFieldName(field)]));
        if (4 * file.stat.size + 4 * payload.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error("decode-budget");
        let after: unknown, supported = true;
        try {after = this.removeTargetFromValue(frontmatter[field],file,target);} catch {supported = false;}
        const afterPayload = supported ? relationshipMetadataPayload({[field]:after},new Set([normalizeFieldName(field)])) : "";
        retainedBytes += 256 + 2 * (field.length + payload.length + afterPayload.length);
        if (retainedBytes + 2 * content.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translator("delete.cleanup.previewTooLarge"));
        const location = await this.frontmatterPropertyLineRange(file,field,lines);
        if (this.unloading || file.path !== path || this.app.vault.getFileByPath(path) !== file
          || this.app.metadataCache.getFileCache(file) !== cache || target.path !== targetPath || target.file !== targetFile
          || targetFile && this.app.vault.getFileByPath(targetPath) !== targetFile) throw new Error(this.translator("addRelated.endpointChanged"));
        source.properties.push({field, ontology: ontology.has(normalizeFieldName(field)), choice: ontology.has(normalizeFieldName(field)) && supported && (!targetFile || removeOntologyLinksOnDelete) ? "remove" : "keep",
          line: location?.start ?? 0,payload,after,supported});
      }
      preview.sources.push(source);
    }
    return preview;
  }

  /** Add configured Hidden evidence; exact deletion coordinates must not collapse distinct opaque IDs. */
  private appendHiddenReference(frontmatter: Record<string,unknown>, storage: TFile, target: GraphPage, field: string, reference: string, exactCoordinates?: readonly string[]): void {
    const wanted = normalizeFieldName(field);
    if (!this.settings.hierarchy.hidden.some(/** Consent cannot outlive actual Hidden configuration. */ key => normalizeFieldName(key) === wanted)) throw new Error(this.translator("hide.noField"));
    const keys = Object.keys(frontmatter).filter(/** Preserve physical YAML spelling and reject ambiguity. */ key => normalizeFieldName(key) === wanted);
    if (keys.length > 1) throw new Error(this.translator("explain.removeSourceChanged"));
    const key = keys[0] ?? field, value = frontmatter[key];
    let additions = [reference];
    if (exactCoordinates === undefined) {
      if (this.valueContainsTarget(value,storage,target)) return;
    } else {
      // A single streamed membership set and array assignment keep dense spelling scopes linear.
      const declared = new Set(iterateResolvedLinksFromValue(this.app,value,storage));
      additions = exactCoordinates.filter(/** Only this exact declared endpoint makes an entry redundant. */ path => !declared.has(path)).map(/** These coordinates were validated before the native callback changes any field. */ path => `[[${path}]]`);
      if (!additions.length) return;
    }
    Object.defineProperty(frontmatter,key,{value:value === undefined || value === null || value === "" ? additions : Array.isArray(value) ? [...(value as unknown[]),...additions] : [value,...additions],enumerable:true,writable:true,configurable:true});
  }

  /** Bound Hidden to approved lexical endpoints and exact own-source unresolved keys, never basename guesses. */
  private deletionHiddenCoordinates(source: DeleteSourcePreview, target: GraphPage): string[] {
    const coordinates = new Set(source.targetSpellings), approved = new Set<string>();
    let bytes = 0;
    for (const spelling of coordinates) {
      approved.add(normalizePath(spelling.split("#",1)[0].trim()).replace(/\.md$/i,""));
      bytes += 128 + 4 * spelling.length;
      if (bytes > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translator("delete.cleanup.previewTooLarge"));
    }
    const unresolved = this.app.metadataCache.unresolvedLinks?.[source.path];
    for (const key in unresolved) {
      if (!Object.prototype.hasOwnProperty.call(unresolved,key)) continue;
      bytes += 128 + 4 * key.length;
      if (bytes > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translator("delete.cleanup.previewTooLarge"));
      if (!(unresolved[key] > 0) || !approved.has(normalizePath(key.split("#",1)[0].trim()).replace(/\.md$/i,""))) continue;
      coordinates.add(key);
    }
    for (const coordinate of coordinates) {
      // A formerly resolved short spelling may now refer to another file. Declaring it Hidden
      // would change that unrelated relationship; refuse the source rather than adopt it.
      if (this.app.metadataCache.getFirstLinkpathDest(coordinate,source.path)
        || extractLinksFromValue(this.app,`[[${coordinate}]]`,source.file).join("\u0000") !== coordinate) throw new Error(this.translator("explain.removeSourceChanged"));
    }
    if (!coordinates.has(target.path)) throw new Error(this.translator("explain.removeSourceChanged"));
    return [...coordinates];
  }

  /** Apply only confirmed properties and publish successful sources; prior commits survive later failures. */
  private async removePropertyReferencesToNode(target: GraphPage, preview: DeleteNodePreview, currentTarget: () => boolean): Promise<{
    hosts: string[];
    remaining: RemainingNodeReference[];
    issues: string[];
  }> {
    const remaining: RemainingNodeReference[] = [], issues: string[] = [];
    const hiddenFields = new Set(preview.hiddenFields.map(normalizeFieldName));
    for (const source of preview.sources) {
      const {file,path} = source;
      /** Every awaited read/write retains exact source identity and the absent approved target. */
      const current = (): boolean => !this.unloading && currentTarget() && file.path === path && this.app.vault.getFileByPath(path) === file;
      if (!current()) {issues.push(this.translator("delete.cleanup.sourceFailed",{path}));continue;}
      const selected = source.properties.filter(/** Keep grants no persistence capability. */ property => property.choice !== "keep");
      try {
        if (selected.length) {
          if (!(await this.index.prepareRelationshipPair(path,target.path)) || !current()) throw new Error(this.translator("explain.removeSourceChanged"));
          const hides = selected.some(/** Hidden adds evidence while preserving the selected original property. */ property => property.choice === "hide");
          const hiddenMtime = file.stat.mtime;
          if (hides) {
            // Approval may include short body/inline spellings. Preserve their source identity
            // through FileManager's later awaited read instead of hiding newly edited links.
            if (4 * file.stat.size + 2 * source.bodyText.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error(this.translator("delete.cleanup.previewTooLarge"));
            const content = await this.app.vault.cachedRead(file), lines = content.split(/\r?\n/);
            const range = await this.frontmatterDocumentLineRange(file,lines);
            if (!current() || file.stat.mtime !== hiddenMtime || 4 * content.length + 2 * source.bodyText.length > SOURCE_DECODE_BUDGET_BYTES
              || lines.slice(range ? range.end + 1 : 0).join("\n") !== source.bodyText) throw new Error(this.translator("explain.removeSourceChanged"));
          }
          const fields = new Set(selected.map(/** Observe the approved physical field coordinates only. */ property => normalizeFieldName(property.field)));
          if (hides) for (const field of hiddenFields) fields.add(field);
          this.pruneManagedMetadataWrites();this.managedMetadataWrites.set(path,Date.now()+15000);
          await this.mutateRelationshipMetadata(file,fields,/** Native reread reauthorizes approval before assigning private transformations. */ frontmatter => {
            if (!current()) throw new Error(this.translator("explain.removeSourceChanged"));
            for (const property of selected) if (relationshipMetadataPayload(frontmatter,new Set([normalizeFieldName(property.field)])) !== property.payload
              || !Object.prototype.hasOwnProperty.call(frontmatter,property.field)) throw new Error(this.translator("explain.removeSourceChanged"));
            if (hides && relationshipMetadataPayload(frontmatter,hiddenFields) !== source.hiddenPayload) throw new Error(this.translator("explain.removeSourceChanged"));
            if (hides && file.stat.mtime !== hiddenMtime) throw new Error(this.translator("explain.removeSourceChanged"));
            const hiddenCoordinates = hides ? this.deletionHiddenCoordinates(source,target) : [];
            for (const property of selected) {
              if (property.choice !== "remove") continue;
              if (!property.supported) throw new Error(this.translator("explain.removeUnsupported"));
              if (property.after === undefined) delete frontmatter[property.field];else frontmatter[property.field]=property.after;
            }
            if (hides) this.appendHiddenReference(frontmatter,file,target,preview.hiddenField,`[[${target.path}]]`,hiddenCoordinates);
          },target.path,current);
          if (!current()) throw new SavedRelationshipPendingError(this.translator("relation.savedUpdatePending"));
          const patched = await this.index.patchMarkdownPaths([path],{isCurrent:current});
          if (patched.outcome !== "patched" || !current()) throw new SavedRelationshipPendingError(this.translator("relation.savedUpdatePending"));
        }
      } catch(error) {
        issues.push(this.translator(error instanceof SavedRelationshipPendingError ? "delete.cleanup.sourcePending" : "delete.cleanup.sourceFailed",{path}));
      }
      if (!current()) continue;
      try {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
      for (const property of source.properties) {
        if (!Object.prototype.hasOwnProperty.call(frontmatter,property.field)) continue;
        const unchanged = relationshipMetadataPayload(frontmatter,new Set([normalizeFieldName(property.field)])) === property.payload;
        if (!unchanged && !this.valueContainsTarget(frontmatter[property.field],file,target)) continue;
        const location = await this.frontmatterPropertyLineRange(file,property.field);
        if (!current()) throw new Error("source-retired");
        remaining.push({path,line:location?.start ?? property.line,label:property.field,fieldName:property.field,sourceKind:"frontmatter-ontology"});
      }
      if (source.bodyReferences.length) {
        if (4 * file.stat.size + 2 * source.bodyText.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error("decode-budget");
        const content = await this.app.vault.cachedRead(file), lines = content.split(/\r?\n/);
        if (4 * content.length + 2 * source.bodyText.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error("decode-budget");
        const documentRange = await this.frontmatterDocumentLineRange(file,lines);
        const bodyStart = documentRange ? documentRange.end + 1 : 0;
        if (!current()) throw new Error("source-retired");
        if (lines.slice(bodyStart).join("\n") !== source.bodyText) {
          issues.push(this.translator("delete.cleanup.bodyChanged",{path}));
          remaining.push({path,line:0,label:this.translator("delete.cleanup.reviewSource"),sourceKind:"obsidian-link"});
        } else remaining.push(...source.bodyReferences.map(/** Retain canonical pre-trash target attribution with current unchanged-body line coordinates. */ reference => ({...reference,line:Math.max(0,bodyStart+reference.line)})));
      }
      } catch {
        issues.push(this.translator("delete.cleanup.inspectFailed",{path}));
        remaining.push({path,line:0,label:this.translator("delete.cleanup.reviewSource"),sourceKind:"obsidian-link"});
      }
    }
    return {hosts:preview.sources.map(/** Retain displayed source coordinates instead of adopting a later rename. */ source=>source.path),remaining,issues};
  }

  /** Suggest only names absent from the native cached registry, configured roles and discovered inline/document fields. */
  private suggestHiddenOntologyField(): string | null {
    const reserved = [
      ...Object.values(this.settings.hierarchy).flatMap(/** Optional legacy role lists contribute names only when present. */ fields => fields ?? []),
      ...this.index.discoveredFields().map(/** Discovery supplies cached inline fields without reading sources. */ field => field.name),
      this.settings.noteTypeField, this.settings.primaryTagField, this.settings.thumbnailProperty, this.settings.nodeImageProperty,
      ...this.settings.nameFields.split(",").map(/** Title-property configuration is CSV; reserve full property names rather than individual characters. */ name => name.trim()).filter(Boolean),
    ];
    return suggestHiddenProperty(this.app, reserved);
  }

  /** Configure one explicitly approved unused Hidden field on the existing disk queue before publishing its semantic policy. */
  private async createHiddenOntologyField(field: string, isCurrent: () => boolean): Promise<boolean> {
    let persisted = false, configured = false, changed = false;
    try {
      await this.enqueueSettingsWrite(/** Recheck collisions and current consent when this configuration owns persistence. */ async () => {
        if (this.unloading || !isCurrent()) return;
        if (this.settings.hierarchy.hidden.some(/** Concurrent explicit setup can supply the needed capability without another assignment. */ name => name.trim())) {
          configured = true;
          return;
        }
        if (this.suggestHiddenOntologyField() !== field) { changed = true; return; }
        const source = this.settings;
        const hierarchyBefore = JSON.stringify(source.hierarchy);
        const next = { ...source, hierarchy: { ...source.hierarchy, hidden: [...source.hierarchy.hidden, field] } };
        await this.saveData(this.settingsSnapshotForPersistence(source.actionPreferencesFuture ?? source.actionPreferences, next));
        persisted = true;
        // A settings edit/import that occurred during storage owns its newer hierarchy. Never
        // restore the captured hierarchy over it or turn an already-used field into Hidden.
        if (JSON.stringify(this.settings.hierarchy) !== hierarchyBefore || this.suggestHiddenOntologyField() !== field) {
          throw new Error("Hidden field configuration changed after persistence");
        }
        this.settings.hierarchy.hidden = next.hierarchy.hidden;
        const policy = captureSettingsPolicy(this.settings);
        this.savedSettingsPolicy = { values: { ...(this.savedSettingsPolicy ?? policy).values,
          "hierarchy.hidden": policy.values["hierarchy.hidden"] } };
        this.index.invalidateSemanticPolicy();
        configured = true;
      });
      if (changed) new Notice(this.translator("hide.setup.changed"));
      if (!configured || this.unloading || !isCurrent()) return false;
      if (persisted) {
        await this.index.refreshPresentationSettings();
        await this.index.refreshSemanticSettings();
      }
      return isCurrent();
    } catch (error) {
      console.error(persisted ? "K-Plex saved Hidden configuration refresh failed" : "K-Plex Hidden configuration failed", error);
      if (!this.unloading) new Notice(this.translator(persisted ? "hide.setup.savedPending" : "hide.setup.failed"));
      return false;
    }
  }

  /** Offer explicit first-field setup, then confirm directional Hidden scope; original links and native identity fences remain intact. */
  async hideRelationship(sourcePath: string, targetPath: string, beforeMutation?: () => boolean,
    ownConfirmation?: (modal: { close(): void } | null) => void): Promise<ActionOutcome> {
    const source = this.index.get(sourcePath), target = this.index.get(targetPath);
    const fields = [...new Set(this.settings.hierarchy.hidden.filter(/** Blank configured keys are not writable choices. */ field => field.trim()))];
    if (!source || !target || source.isFolder || source.isTag || target.isFolder || target.isTag
      || source.file?.extension !== "md" && target.file?.extension !== "md") {
      return {status:"unavailable",reasonKey:"actions.target-unavailable"};
    }
    if (!fields.length) {
      const sourceRef = actionNodeRef(source), targetRef = actionNodeRef(target);
      /** Configuration consent retains exact endpoints and graph lifetime independently of later semantic-policy publication. */
      const setupCurrent = (): boolean => !this.unloading && beforeMutation?.() !== false
        && Boolean(resolveActionPage(this.index, sourceRef)) && Boolean(resolveActionPage(this.index, targetRef));
      const proposed = this.suggestHiddenOntologyField();
      const decision = await new Promise<HiddenFieldSetupChoice>(/** Native cancellation, settings navigation and surface teardown settle once. */ resolve => {
        const modal = new HiddenFieldSetupModal(this.app, proposed, resolve);
        const cancel = (): void => modal.close();
        /** Invoke the original class callback with this modal as its receiver. */
        const close = (): void => { HiddenFieldSetupModal.prototype.onClose.call(modal); };
        modal.onClose = /** Release plugin and surface ownership before continuing setup or navigation. */ (): void => {
          close(); this.relationshipWriteCancels.delete(cancel); ownConfirmation?.(null);
        };
        this.relationshipWriteCancels.add(cancel); ownConfirmation?.(modal);
        if (!setupCurrent()) { modal.close(); return; }
        modal.open();
      });
      if (!decision || !setupCurrent()) return { status: "cancelled" };
      if (decision === "settings") { this.openHiddenOntologySettings(); return { status: "cancelled" }; }
      if (!proposed || !(await this.createHiddenOntologyField(proposed, setupCurrent))) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
      // Configuration is not consent to edit a note. Recapture the current settings/endpoints
      // before the ordinary source/direction dialog and its existing pair/native write guards.
      return this.hideRelationship(sourcePath, targetPath, beforeMutation, ownConfirmation);
    }
    const affected = [actionNodeRef(source),actionNodeRef(target)];
    const normalized = new Set(fields.map(normalizeFieldName));
    const choices = [source,target].filter(/** Only physical Markdown endpoints own editable YAML. */ page => page.file?.extension === "md").map(
      /** Capture both orientations and the affected payload before consent, without reading unrelated properties. */ page => ({
        page,file:page.file!,path:page.path,other:page === source ? target : source,
        canonical:this.index.pages.get(page.path),otherCanonical:this.index.pages.get((page === source ? target : source).path),
        ref:actionNodeRef(page),otherRef:actionNodeRef(page === source ? target : source),
        otherPath:(page === source ? target : source).path,otherFile:(page === source ? target : source).file,
        payload:relationshipMetadataPayload(this.app.metadataCache.getFileCache(page.file!)?.frontmatter ?? {},normalized),
      }));
    if (!choices.length) return {status:"unavailable",reasonKey:"actions.target-unavailable"};
    const selection = await new Promise<{sourcePath:string;field:string}|null>(/** Native closure and plugin teardown both retire pending consent. */ resolve => {
      const modal = new HideRelationshipModal(this.app,choices.map(/** Picker exposes only captured writable endpoints. */ choice => choice.path),fields,[source.path,target.path],resolve);
      const cancel = (): void => modal.close();
      /** Invoke the original class callback with this modal as its receiver. */
      const close = (): void => { HideRelationshipModal.prototype.onClose.call(modal); };
      modal.onClose = /** Dispose the exact pending dialog independently of native source work. */ (): void => {close();this.relationshipWriteCancels.delete(cancel);ownConfirmation?.(null);};
      this.relationshipWriteCancels.add(cancel);ownConfirmation?.(modal);
      if (this.unloading || beforeMutation?.() === false) {modal.close();return;}
      modal.open();
    });
    if (!selection) return {status:"cancelled"};
    const choice = choices.find(/** A returned choice cannot introduce another source identity. */ item => item.path === selection.sourcePath);
    if (!choice || !fields.includes(selection.field)) return {status:"unavailable",reasonKey:"actions.target-unavailable"};
    /** Confirmation fences canonical/native incarnations while pair publication may refresh read facades. */
    const current = (): boolean => !this.unloading && beforeMutation?.() !== false && choice.file.path === choice.path
      && Boolean(resolveActionPage(this.index,choice.ref)) && Boolean(resolveActionPage(this.index,choice.otherRef))
      && this.index.pages.get(choice.path) === choice.canonical && choice.canonical?.file === choice.file
      && this.index.pages.get(choice.otherPath) === choice.otherCanonical && choice.otherCanonical?.file === choice.otherFile
      && this.app.vault.getFileByPath(choice.path) === choice.file
      && choice.other.path === choice.otherPath && this.app.vault.getFileByPath(choice.otherPath) === choice.otherFile;
    try {
      const saved = await this.index.withForegroundPriority(/** Own only pair preparation and the native write; P2 publication must not wait on this P0 lease. */ async () => {
        if (!current() || !(await this.index.prepareRelationshipPair(choice.path,choice.other.path)) || !current()) return false;
        this.pruneManagedMetadataWrites();this.managedMetadataWrites.set(choice.path,Date.now()+15000);
        await this.mutateRelationshipMetadata(choice.file,normalized,/** Native FileManager reread validates the exact approved Hidden payload. */ frontmatter => {
          if (!current() || relationshipMetadataPayload(frontmatter,normalized) !== choice.payload) throw new Error(this.translator("explain.removeSourceChanged"));
          this.appendHiddenReference(frontmatter,choice.file,choice.other,selection.field,choice.other.url ?? `[[${choice.other.path}]]`);
        },choice.other.path,current);
        return true;
      });
      if (!saved) return {status:"unavailable",reasonKey:"actions.target-unavailable"};
      if (!current()) throw new SavedRelationshipPendingError(this.translator("relation.savedUpdatePending"));
      const patched = await this.index.patchMarkdownPaths([choice.path],{isCurrent:current});
      if (patched.outcome !== "patched" || !current()) throw new SavedRelationshipPendingError(this.translator("relation.savedUpdatePending"));
      await this.publishSavedRelationship(choice.path,choice.other.path);
      return {status:"committed",affected};
    } catch(error) {
      if (error instanceof SavedRelationshipPendingError) {
        if (!error.noticeReported) new Notice(error.message);
        return {status:"saved-pending",affected,reasonKey:"actions.savedPending"};
      }
      new Notice(this.translator("delete.cleanup.sourceFailed",{path:choice.path}));
      return {status:"failed",reasonKey:"actions.target-unavailable"};
    }
  }

  /** File-trash preferences never authorize fresh changes to arbitrary properties. */
  private async confirmDeleteNode(page: GraphPage, preview?: DeleteNodePreview, hostLeaf?: WorkspaceLeaf): Promise<boolean> {
    const hasFile = Boolean(page.file);
    const firstUse = !this.settings.deletePromptInitialized;
    if (!firstUse && (!hasFile || !this.settings.confirmFileDelete) && !preview?.sources.some(/** Only arbitrary-property choices need consent beyond the legacy physical-trash preference. */ source => source.properties.some(property => !property.ontology))) return true;

    return new Promise<boolean>(/** Preference persistence failure rejects consent instead of authorizing trash. */ (resolve, reject) => {
      const modal = new DeleteNodeConfirmationModal(this.app, {
        nodeName: page.name,
        hasFile,
        firstUse,
        confirmFileDelete: this.settings.confirmFileDelete,
        preview,
        onOpenCleanupSettings: /** Settings navigation cancels the old consent; a new deletion must capture the updated policy. */ () => this.openDeleteCleanupSettings(),
        onOpenLocation: /** Inspect the source through its originating native destination. */ reference => this.openRelationshipEvidenceLocation(reference,hostLeaf),
        onConfirm: /** Only successful preference persistence approves the captured cleanup scope. */ async (confirmFileDelete) => {
          try {
            const preferenceChanged = this.settings.confirmFileDelete !== confirmFileDelete;
            if (firstUse || preferenceChanged) {
              this.settings.deletePromptInitialized = true;
              this.settings.confirmFileDelete = confirmFileDelete;
              await this.saveSettings(false, false);
            }
            resolve(true);
          } catch (error) {reject(error instanceof Error ? error : new Error(String(error)));}
        },
        onCancel: /** Native dismissal or plugin unload cancels the pending property scope. */ () => resolve(false),
      });
      const cancel = (): void => modal.close();
      /** Invoke the original class callback with this modal as its receiver. */
      const close = (): void => { DeleteNodeConfirmationModal.prototype.onClose.call(modal); };
      modal.onClose = /** Retire the exact plugin-owned pending consent before asynchronous continuation. */ (): void => {close();this.relationshipWriteCancels.delete(cancel);};
      this.relationshipWriteCancels.add(cancel);
      if (this.unloading) {modal.close();return;}
      modal.open();
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

  /** Confirm finite property scope before trash; navigation and earlier successful source commits survive later failures. */
  async deleteNode(page: GraphPage, hostLeaf?: WorkspaceLeaf, wasCenter = false): Promise<ActionOutcome> {
    const target = this.index.get(page.path);
    if (!target || target.isFolder || target.isTag || target.url || (target.file && target.file.extension !== "md")) return { status: "unavailable", reasonKey: "actions.target-unavailable" };
    const capturedFile = target.file;
    const captured = actionNodeRef(target);
    const canonicalTarget = this.index.pages.get(target.path);
    const preview = await this.captureDeleteNodePreview(target);
    if (this.unloading || resolveActionPage(this.index,captured) !== target || target.path !== captured.path || target.file !== capturedFile
      || capturedFile && this.app.vault.getFileByPath(captured.path) !== capturedFile) return {status:"unavailable",reasonKey:"actions.target-unavailable"};
    if (!(await this.confirmDeleteNode(target,preview,hostLeaf))) return { status: "cancelled" };
    // Another settings window cannot silently change the automatic cleanup policy after its
    // scope was captured. Reopening deletion prepares fresh defaults before granting trash/write consent.
    if (capturedFile && preview.removeOntologyLinksOnDelete !== (this.settings.removeOntologyLinksOnDelete !== false)) {
      new Notice(this.translator("delete.cleanup.settingsChanged"));
      return { status: "cancelled" };
    }
    if (this.unloading || resolveActionPage(this.index, captured) !== target || target.path !== captured.path || target.file !== capturedFile
      || capturedFile && this.app.vault.getFileByPath(capturedFile.path) !== capturedFile) {
      new Notice(this.translator("addRelated.endpointChanged"));
      return { status: "unavailable", reasonKey: "actions.target-unavailable" };
    }

    const path = target.path;
    if (target.file) {
      const file = target.file;
      await this.app.fileManager.trashFile(file);
      // Vault.delete normally dematerializes synchronously. Keep this idempotent fallback so the
      // workflow is correct even if an Obsidian version delivers the event on a later turn.
      if (this.app.vault.getFileByPath(path) === null && canonicalTarget && this.index.pages.get(path) === canonicalTarget
        && (canonicalTarget.file === file || canonicalTarget.file === null)) this.index.dematerializeFile(path);
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
    if (!ghost) return { status: "committed", affected: [captured] };
    /** Pair publication may replace read facades, but cleanup cannot adopt another canonical/native endpoint. */
    const currentTarget = (): boolean => Boolean(canonicalTarget) && this.index.pages.get(path) === canonicalTarget
      && canonicalTarget!.file === null && this.index.get(path)?.file === null && this.app.vault.getFileByPath(path) === null;
    const { remaining, issues } = await this.removePropertyReferencesToNode(ghost,preview,currentTarget);

    if (remaining.length || issues.length) {
      new RemainingNodeReferencesModal(
        this.app,
        ghost.name,
        remaining,
        (reference) => this.openRelationshipEvidenceLocation({ path: reference.path, line: reference.line }, hostLeaf),
        issues,
      ).open();
      return { status: "committed", affected: [captured] };
    }

    // Remaining references are handled above. Once they are gone, remove the dematerialized graph
    // endpoint when nothing else still references it; focus/history have already moved away.
    await this.index.removeVirtualPageIfUnreferencedFromSources(path);
    return { status: "committed", affected: [captured] };
  }

  /** Locate one physical YAML property with the existing grammar, sharing a captured body across finite preview fields. */
  private async frontmatterPropertyLineRange(file: TFile, fieldName: string, capturedLines?: readonly string[]): Promise<{ start: number; end: number } | null> {
    const lines = capturedLines ?? (await this.app.vault.cachedRead(file)).split(/\r?\n/);
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

  /** Recheck canonical exact pair evidence before offering destructive provenance-specific unlink. */
  async directFrontmatterUnlinkCandidate(evidenceItems: readonly RelationEvidence[]): Promise<RelationEvidence | null> {
    const first = evidenceItems[0];
    if (!first) return null;
    const sourceIdentity = this.app.vault.getFileByPath(first.sourcePath);
    const targetIdentity = this.app.vault.getFileByPath(first.targetPath);
    const storageIdentity = this.app.vault.getFileByPath(first.declaredByPath);
    /** Delayed provenance reads cannot authorize a replacement at the same physical path. */
    const current = (): boolean => this.app.vault.getFileByPath(first.sourcePath) === sourceIdentity
      && this.app.vault.getFileByPath(first.targetPath) === targetIdentity
      && this.app.vault.getFileByPath(first.declaredByPath) === storageIdentity;
    if (!(await this.index.prepareRelationshipPair(first.sourcePath, first.targetPath)) || !current()) return null;
    evidenceItems = this.index.evidenceBetween(first.sourcePath, first.targetPath);
    const frontmatter = evidenceItems.filter((item) => item.sourceKind === "frontmatter-ontology");
    if (frontmatter.length !== 1) return null;
    const candidate = frontmatter[0];
    if (!candidate.fieldName) return null;

    const storage = this.app.vault.getFileByPath(candidate.declaredByPath);
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
    return current() ? candidate : null;
  }

  /** Capture a supported exact property and both native identities before displaying confirmation. */
  captureFrontmatterUnlinkExpectation(evidence: RelationEvidence): FrontmatterUnlinkExpectation | null {
    const declarationKey = frontmatterDeclarationKey(evidence);
    if (declarationKey === null || !evidence.fieldName) return null;
    const storage = this.app.vault.getFileByPath(evidence.declaredByPath);
    const target = this.index.get(evidence.declaredTargetPath);
    if (!storage || storage.extension !== "md" || !target || target.isFolder || target.isTag) return null;
    const frontmatter: unknown = this.app.metadataCache.getFileCache(storage)?.frontmatter;
    if (!isUnknownRecord(frontmatter)) return null;
    const keys = Object.keys(frontmatter).filter(
      /** Multiple normalized YAML keys are ambiguous and cannot be silently collapsed. */
      key => normalizeFieldName(key) === normalizeFieldName(evidence.fieldName!));
    if (keys.length !== 1) return null;
    // Dry-run eligibility must honor the existing writer's admission bound before parsing or
    // copying values. This is the same inequality, not a new edit limit or a successful-write gate.
    try {
      const payload = relationshipMetadataPayload(frontmatter, new Set([normalizeFieldName(evidence.fieldName)]));
      if (4 * storage.stat.size + 4 * payload.length > SOURCE_DECODE_BUDGET_BYTES) return null;
    } catch { return null; }
    const value = frontmatter[keys[0]];
    if (!this.valueContainsTarget(value, storage, target)) return null;
    try { this.removeTargetFromValue(value, storage, target); } catch { return null; }
    return { storage, target: this.app.vault.getFileByPath(evidence.declaredTargetPath),
      storagePath: evidence.declaredByPath, targetPath: evidence.declaredTargetPath, fieldKey: keys[0], declarationKey,
      viewSourcePath: evidence.sourcePath, viewTargetPath: evidence.targetPath };
  }

  /**
   * Remove one reauthorized declaration. A details confirmation supplies pre-approval identities and
   * a mounted-generation guard; once the native mutation starts its publication is plugin-owned.
   */
  async unlinkFrontmatterEvidence(evidence: RelationEvidence, expectation?: FrontmatterUnlinkExpectation, beforeMutation?: () => boolean): Promise<boolean> {
    // Capture outside priority acquisition too: that acquisition may await and paths can be reused.
    const approved = expectation ?? this.captureFrontmatterUnlinkExpectation(evidence);
    if (!approved) return false;
    /** A rename requires a fresh displayed declaration; replacement and stale UI cannot authorize this write. */
    const current = (): boolean => beforeMutation?.() !== false
      && approved.storage.path === approved.storagePath && (!approved.target || approved.target.path === approved.targetPath)
      && approved.storagePath === evidence.declaredByPath && approved.targetPath === evidence.declaredTargetPath
      && approved.viewSourcePath === evidence.sourcePath && approved.viewTargetPath === evidence.targetPath
      && approved.declarationKey === frontmatterDeclarationKey(evidence)
      && this.app.vault.getFileByPath(approved.storagePath) === approved.storage
      && this.app.vault.getFileByPath(approved.targetPath) === approved.target;
    return this.index.withForegroundPriority(/** Own exact pair readiness and canonical publication without tying saved work to a modal. */ async () => {
      if (!current() || evidence.sourceKind !== "frontmatter-ontology" || !evidence.fieldName) return false;
      const storage = approved.storage;
      const targetIdentity = approved.target;
      const [, target] = await this.prepareRelationshipMutation(evidence.declaredByPath, evidence.declaredTargetPath, storage, targetIdentity);
      if (!current() || storage.extension !== "md" || !target) return false;
      // Raw payloads contain the whole property. Another target's legitimate edit may change that
      // payload without changing this exact declaration; owner/target/field/role/direction must match.
      /** Reauthorize the canonical declaration again inside the awaited native read callback. */
      // Reverse views invert direction without changing the physical declaring note. Reauthorize
      // in the approved view orientation so its direction remains an exact part of the tuple.
      const currentDeclaration = (): boolean => this.index.evidenceBetween(approved.viewSourcePath, approved.viewTargetPath).some(
        /** Attempt-local IDs and mutable raw property payloads are not approval coordinates. */
        item => frontmatterDeclarationKey(item) === approved.declarationKey);
      if (!currentDeclaration()) return false;

      this.pruneManagedMetadataWrites();
      this.managedMetadataWrites.set(storage.path, Date.now() + 15000);
      let changed = false;
      const wanted = normalizeFieldName(evidence.fieldName);
      await this.mutateRelationshipMetadata(storage, new Set([wanted]), /** Native reread validates the exact approved field before assigning a privately transformed value. */ (frontmatter: Record<string, unknown>) => {
        const keys = Object.keys(frontmatter).filter(/** Native read may reveal new key ambiguity after approval. */ key => normalizeFieldName(key) === wanted);
        if (!current() || !currentDeclaration() || keys.length !== 1 || keys[0] !== approved.fieldKey) throw new Error(this.translator("explain.removeSourceChanged"));
        const key = keys[0], value = frontmatter[key];
        if (!this.valueContainsTarget(value, storage, target)) throw new Error(this.translator("explain.removeSourceChanged"));
        const next = this.removeTargetFromValue(value, storage, target);
        if (this.valueContainsTarget(next, storage, target)) throw new Error(this.translator("explain.removeUnsupported"));
        if (next === undefined) delete frontmatter[key];
        else frontmatter[key] = next;
        changed = true;
      }, target.path, current);

      if (!changed) return false;
      await this.publishSavedRelationship(storage.path, target.path);
      return true;
    });
  }

  /** Resolve source locations for pair evidence while keeping actual note content untouched and localizing unavailable-source feedback. */
  async relationshipEvidenceLocations(evidence: RelationEvidence): Promise<Array<{ path: string; line: number; label: string }>> {
    const file = this.app.vault.getFileByPath(evidence.declaredByPath);
    if (!file || file.extension !== "md") return [];

    const positions: Array<{ path: string; line: number; label: string }> = [];
    const add = (line: number, label: string) => {
      const safeLine = Math.max(0, Math.floor(line));
      if (positions.some((item) => item.line === safeLine && item.label === label)) return;
      positions.push({ path: file.path, line: safeLine, label });
    };

    if (evidence.sourceKind === "inline-ontology" || evidence.sourceKind === "body-url"
      || evidence.sourceKind === "property-url" && evidence.line !== undefined) {
      if (evidence.line) add(evidence.line - 1, this.translator("evidence.navigateLine", { line: evidence.line }));
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
        matchingLines.length > 1 ? this.translator("evidence.navigateLinkNumber", { index: index + 1 }) : this.translator("evidence.navigateLink"),
      ));
      return positions;
    }

    if (evidence.sourceKind === "frontmatter-ontology" || evidence.sourceKind === "date-property" || evidence.sourceKind === "property-url") {
      const fieldName = evidence.fieldName;
      if (!fieldName) return positions;
      const propertyRange = await this.frontmatterPropertyLineRange(file, fieldName);
      if (propertyRange) add(propertyRange.start, this.translator("evidence.navigateProperty", { field: fieldName }));
    }

    return positions;
  }

  /** Acquire source sections for the requested evidence batch and preserve provenance; localize only plugin-owned fallback copy. */
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
        if ((evidence.sourceKind === "frontmatter-ontology" || evidence.sourceKind === "date-property"
          || evidence.sourceKind === "property-url" && evidence.line === undefined) && evidence.fieldName) {
          const range = propertyRange(evidence.fieldName);
          sections = range ? [make(range.start, range.end, this.translator("evidence.property", { field: evidence.fieldName }))] : [];
        } else if ((evidence.sourceKind === "inline-ontology" || evidence.sourceKind === "body-url" || evidence.sourceKind === "property-url") && evidence.line) {
          const range = paragraphRange(evidence.line - 1);
          sections = [make(range.start, range.end, this.translator("evidence.paragraphAroundLine", { line: evidence.line }))];
        } else if (evidence.sourceKind === "obsidian-link" || evidence.sourceKind === "unresolved-link") {
          const locations = await this.relationshipEvidenceLocations(evidence);
          const seen = new Set<string>();
          for (const location of locations) {
            const range = paragraphRange(location.line);
            const key = `${range.start}:${range.end}`;
            if (seen.has(key)) continue;
            seen.add(key);
            sections.push(make(range.start, range.end, locations.length > 1 ? this.translator("evidence.linkOccurrenceLine", { line: location.line + 1 }) : this.translator("evidence.linkLine", { line: location.line + 1 })));
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

  /** Create the requested physical note in its target folder and localize user-visible errors without changing vault path semantics. */
  private async createNewFileInFolder(leafName: string, kind: GhostMaterializationKind, configuredFolder: string, parentCurrent?: () => boolean): Promise<TFile | null> {
    const normalizedFolder = configuredFolder ? normalizePath(configuredFolder) : "";
    if (parentCurrent && !parentCurrent()) throw new Error(this.translator("addRelated.endpointChanged"));
    await this.ensureFolderPath(normalizedFolder);
    if (parentCurrent && !parentCurrent()) throw new Error(this.translator("addRelated.endpointChanged"));

    const proposedName = `${leafName}.md`;
    const destination = normalizePath(normalizedFolder ? `${normalizedFolder}/${proposedName}` : proposedName);
    if (kind === "markdown" && this.app.vault.getAbstractFileByPath(destination)) {
      new Notice(this.translator("file.existsAt", { path: destination }), 3000);
      return null;
    }

    // Mark the predicted path before creation because Obsidian may emit vault:create synchronously
    // inside create()/the Excalidraw API. K-Plex materializes the page itself as soon as the
    // returned TFile is available, so that event must not schedule a redundant whole-vault build.
    this.managedCreatedPaths.set(destination, Date.now() + MANAGED_CREATED_PATH_TTL_MS);
    const alternateExcalidrawPaths = kind === "excalidraw"
      ? ["excalidraw.md", "excalidraw"].map((extension) => normalizePath(normalizedFolder ? `${normalizedFolder}/${leafName}.${extension}` : `${leafName}.${extension}`))
      : [];
    for (const path of alternateExcalidrawPaths) this.managedCreatedPaths.set(path, Date.now() + MANAGED_CREATED_PATH_TTL_MS);

    if (kind === "excalidraw") {
      type RuntimePlugin = Plugin & {
        settings?: { compatibilityMode?: boolean; useExcalidrawExtension?: boolean };
        createDrawing?: (filename: string, foldername?: string) => Promise<TFile | string>;
      };
      type PluginManagerBridge = { plugins?: Record<string, RuntimePlugin> };
      const manager = (this.app as unknown as { plugins?: PluginManagerBridge }).plugins;
      const excalidraw = manager?.plugins?.["obsidian-excalidraw-plugin"];
      const compatibilityMode = excalidraw?.settings?.compatibilityMode === true;
      const useExcalidrawExtension = excalidraw?.settings?.useExcalidrawExtension !== false;
      const drawingFilename = compatibilityMode
        ? `${leafName}.excalidraw`
        : useExcalidrawExtension
          ? `${leafName}.excalidraw.md`
          : `${leafName}.md`;

      type Automate = {
        reset?: () => void;
        getAPI?: () => Automate;
        create?: (params?: { filename?: string; foldername?: string; onNewPane?: boolean; silent?: boolean }) => Promise<string>;
      };
      const globalEA = (window as unknown as { ExcalidrawAutomate?: Automate }).ExcalidrawAutomate;
      const ea = typeof globalEA?.getAPI === "function" ? globalEA.getAPI() : globalEA;

      // ExcalidrawAutomate appends `.excalidraw.md` to every explicit filename that does not end
      // in `.md`, so compatibility-mode drawings must use the plugin's lower-level creator.
      if (!compatibilityMode && ea?.create) {
        try {
          ea.reset?.();
          const createdPath = normalizePath(await ea.create({
            filename: drawingFilename,
            foldername: normalizedFolder || undefined,
            onNewPane: false,
            silent: true,
          }));
          const created = this.app.vault.getAbstractFileByPath(createdPath);
          if (!(created instanceof TFile)) throw new Error(this.translator("error.excalidrawCreatedFileMissing"));
          this.managedCreatedPaths.set(created.path, Date.now() + MANAGED_CREATED_PATH_TTL_MS);
          return this.rememberManagedCreatedFile(created);
        } catch (error) {
          this.managedCreatedPaths.delete(destination);
          for (const path of alternateExcalidrawPaths) this.managedCreatedPaths.delete(path);
          throw error;
        }
      }

      if (!excalidraw?.createDrawing) {
        this.managedCreatedPaths.delete(destination);
        for (const path of alternateExcalidrawPaths) this.managedCreatedPaths.delete(path);
        new Notice(this.translator("notice.excalidrawUnavailable"), 2200);
        return null;
      }
      try {
        const created = await excalidraw.createDrawing(drawingFilename, normalizedFolder || undefined);
        const file = typeof created === "string" ? this.app.vault.getAbstractFileByPath(normalizePath(created)) : created;
        if (!(file instanceof TFile)) throw new Error(this.translator("error.excalidrawCreatedFileMissing"));
        this.managedCreatedPaths.set(file.path, Date.now() + MANAGED_CREATED_PATH_TTL_MS);
        return this.rememberManagedCreatedFile(file);
      } catch (error) {
        this.managedCreatedPaths.delete(destination);
        for (const path of alternateExcalidrawPaths) this.managedCreatedPaths.delete(path);
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

  /** Create and materialize a folder child using the existing optimistic/index reconciliation workflow and localized feedback. */
  async createNewNodeInFolder(folder: GraphPage, rawName: string, kind: GhostMaterializationKind, capturedFolder?: TFolder): Promise<GraphPage | null> {
    return this.index.withForegroundPriority(async () => {
      if (!folder.isFolder) return null;
      const validation = this.validateRelatedNoteName(rawName);
      if (!validation.valid) {
        new Notice(validation.error ?? this.translator("note.validation.enterValid"), 2800);
        return null;
      }
      if (validation.existing) {
        new Notice(this.translator("note.existsNamed", { name: validation.stem }), 2800);
        return null;
      }

      const folderPath = folder.path === "folder:/"
        ? ""
        : folder.path.startsWith("folder:")
          ? normalizePath(folder.path.slice("folder:".length))
          : "";
      const currentFolderPath = capturedFolder?.path ?? folderPath;
      /** Check again inside queued work and after the shared file creator's awaited folder check. */
      const current = (): boolean => !this.unloading && (!capturedFolder ||
        (capturedFolder === this.app.vault.getRoot() ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(capturedFolder.path)) === capturedFolder);
      if (!current()) throw new Error(this.translator("addRelated.endpointChanged"));
      const file = await this.createNewFileInFolder(validation.stem, kind, currentFolderPath === "/" ? "" : currentFolderPath, current);
      if (!file) return null;
      const displayName = await this.writeCreatedNodeDisplayName(file, rawName);
      const displayField = this.configuredDisplayNameField();
      const normalizedDisplayField = displayField ? normalizeFieldName(displayField) : "";
      return this.index.insertCreatedFile(file, displayName && (normalizedDisplayField === "alias" || normalizedDisplayField === "aliases") ? [displayName] : []);
    });
  }

  openCreateInFolderModal(folder: GraphPage, hostLeaf?: WorkspaceLeaf): void {
    if (!folder.isFolder) return;
    new CreateFolderNoteModal(this, folder, hostLeaf).open();
  }

  private configuredDisplayNameField(): string | null {
    return this.settings.nameFields.split(",").map((field) => field.trim()).find(Boolean) ?? null;
  }

  /**
   * Observe a newly created file's presentation metadata before it is shown in the graph.
   * FileManager completion alone does not mean its changed event has arrived. The established
   * metadata/body observer owns cancellation; no timer grants write authority.
   */
  private async mutateCreatedNodeMetadata(file: TFile, fields: ReadonlySet<string>, mutate: (frontmatter: Record<string, unknown>) => void): Promise<void> {
    const path = file.path;
    await writeRelationshipMetadata(this.app, file, fields, mutate, {
      /** Keep this observer alive through creation while allowing plugin unload to cancel it. */
      own: cancel => { this.relationshipWriteCancels.add(cancel); return () => { this.relationshipWriteCancels.delete(cancel); }; },
      /** A persisted note can still be waiting for its actual MetadataCache observation. */
      pending: () => { new Notice(this.translator("note.savedMetadataPending"), 4000); },
      savedPendingMessage: () => this.translator("note.savedMetadataPending"),
      /** Creation needs the exact physical file, rather than pair authority that does not exist yet. */
      current: () => !this.unloading && file.path === path && this.app.vault.getFileByPath(path) === file,
    });
  }

  /** Persist the display title and await its current body/cache before a relationship selects this file. */
  private async writeCreatedNodeDisplayName(file: TFile, rawDisplayName: string): Promise<string> {
    const displayName = rawDisplayName;
    const configuredField = this.configuredDisplayNameField();
    if (!displayName.trim() || !configuredField || file.extension !== "md") return "";
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(file.path, Date.now() + 15000);
    await this.mutateCreatedNodeMetadata(file, new Set([normalizeFieldName(configuredField)]), /** Preserve current field spelling and alias order. */ (frontmatter: Record<string, unknown>) => {
      const normalizedConfigured = normalizeFieldName(configuredField);
      const key = Object.keys(frontmatter).find((candidate) => normalizeFieldName(candidate) === normalizedConfigured) ?? configuredField;
      if (normalizedConfigured === "alias" || normalizedConfigured === "aliases") {
        const current = frontmatter[key];
        const aliases = Array.isArray(current)
          ? current.filter((value): value is string => typeof value === "string")
          : typeof current === "string" && current.trim() ? [current] : [];
        if (!aliases.includes(displayName)) frontmatter[key] = [displayName, ...aliases];
      } else {
        frontmatter[key] = displayName;
      }
    });
    return displayName;
  }

  /** Persist an additional alias under either accepted alias field spelling and await its observation. */
  private async writeCreatedNodeAlias(file: TFile, rawAlias: string): Promise<string> {
    const alias = rawAlias.trim();
    if (file.extension !== "md") return "";
    if (!alias) return "";
    this.pruneManagedMetadataWrites();
    this.managedMetadataWrites.set(file.path, Date.now() + 15000);
    await this.mutateCreatedNodeMetadata(file, new Set(["alias", "aliases"]), /** Add the requested alias without erasing existing display aliases. */ (frontmatter: Record<string, unknown>) => {
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

  /** Create a related file for the selected origin while preserving folder/name validation and localized product feedback. */
  async createNewRelatedFileForOrigin(origin: GraphPage, rawName: string, kind: GhostMaterializationKind, rawAlias = "", selectedFolder?: string): Promise<TFile | null> {
    return this.index.withForegroundPriority(async () => {
      const destination = this.validateNoteFolderPath(selectedFolder ?? this.newRelatedNoteFolder(origin, rawName, kind));
      if (destination.error) throw new Error(destination.error);
      const validation = this.validateRelatedNoteName(rawName, destination.folderPath);
      if (!validation.valid) {
        new Notice(validation.error ?? this.translator("note.validation.enterValid"), 2800);
        return null;
      }
      if (validation.existing) {
        new Notice(this.translator("note.existsNamed", { name: validation.stem }), 2800);
        return null;
      }

      const file = await this.createNewFileInFolder(validation.stem, kind, destination.folderPath);
      if (!file) return null;
      try {
        const displayName = await this.writeCreatedNodeDisplayName(file, rawName);
        const alias = await this.writeCreatedNodeAlias(file, rawAlias);
        // A blank new Markdown file still needs its first actual cache observation before the pair
        // freezes identity. Reuse the observer for a no-op, rather than a quiet-window timeout.
        if (file.extension === "md" && !displayName && !alias) await this.mutateCreatedNodeMetadata(file, new Set(), /** Observe creation without adding properties. */ () => {});
        return file;
      } catch (error) {
        // The file is already durable. Retain its identity for recovery instead of suggesting
        // that the whole create operation can safely be retried with the same filename.
        throw new PartialRelatedFileError(file, error);
      }
    });
  }

  /**
   * Save an additive new-file relationship independently of index readiness. Exact native identities
   * protect the mutation; existing properties and template relationships survive. The committed
   * file may be opened immediately while the ordinary metadata/source lane reconciles the graph.
   */
  async linkNewRelatedFile(origin: GraphPage, semanticRole: RelationshipRole, file: TFile, selectedField: string, rawAlias = "", rawDisplayName = "", recoverMetadata = false): Promise<{ state: "saved-pending"; page: GraphPage }> {
    return this.index.withForegroundPriority(async () => {
      if (this.app.vault.getFileByPath(file.path) !== file) throw new Error(this.translator("addRelated.endpointChanged"));
      // Recovery reuses this exact durable file, completing idempotent presentation writes that
      // may have failed after creation. It never repeats physical file creation.
      if (recoverMetadata) {
        await this.writeCreatedNodeDisplayName(file, rawDisplayName);
        await this.writeCreatedNodeAlias(file, rawAlias);
      }
      // File creation already supplies the target identity. A semantic pair proof is unnecessary
      // for appending a property, and may be unavailable while unrelated indexing is refreshing.
      const alias = rawAlias.trim();
      const displayName = rawDisplayName.trim() ? rawDisplayName : "";
      const displayField = this.configuredDisplayNameField();
      const normalizedDisplayField = displayField ? normalizeFieldName(displayField) : "";
      const aliases = normalizedDisplayField === "alias" || normalizedDisplayField === "aliases"
        ? [displayName, alias].filter(Boolean)
        : alias ? [alias] : [];
      const target = this.index.insertCreatedFile(file, aliases);
      const originFile = origin.file, originPath = originFile?.path ?? origin.path, targetPath = file.path;
      /** Refuse rename/replacement during FileManager's queued read; unrelated indexing is irrelevant. */
      const current = (): boolean => !this.unloading && file.path === targetPath
        && this.app.vault.getFileByPath(targetPath) === file
        && (!originFile || originFile.path === originPath && this.app.vault.getFileByPath(originPath) === originFile);
      if (!current()) throw new Error(this.translator("addRelated.endpointChanged"));
      const storageFile = originFile?.extension === "md" ? originFile : file.extension === "md" ? file : null;
      if (!storageFile) throw new Error(this.translator("error.relationshipRequiresMarkdownEndpoint"));
      const referenced = storageFile === originFile ? target : origin;
      const field = storageFile === originFile ? selectedField : this.inverseOntologyField(selectedField, semanticRole);
      const reference = this.referenceForPage(referenced, storageFile);
      this.pruneManagedMetadataWrites();
      this.managedMetadataWrites.set(storageFile.path, Date.now() + 15000);
      await this.app.fileManager.processFrontMatter(storageFile,
        /** Native frontmatter is authoritative for this additive write; no index or body proof is needed. */
        (frontmatter: Record<string, unknown>) => {
          if (!current()) throw new Error(this.translator("addRelated.endpointChanged"));
          this.appendRelationshipReference(frontmatter, storageFile, referenced, field, reference);
        });
      // A native write already committed before a rename/replacement must never invite another create.
      if (!current()) throw new SavedRelationshipPendingError(this.translator("relation.savedUpdatePending"));
      // Publish available host facts without joining body parsing, pair preparation or full indexing.
      // A saved-pending result is a successful vault mutation; it must not block editor completion.
      let page = target;
      try {
        this.index.refreshVisibleHostMetadataPreviews(storageFile.path);
        const published = this.index.get(targetPath);
        if (published?.file === file) page = published;
      } catch (error) { console.error("K-Plex saved new-file relationship preview refresh failed", error); }
      return { state: "saved-pending", page };
    });
  }

  /** Materialize a related URL node through existing URL/relationship semantics and report localized validation feedback. */
  async createWebLinkRelatedPage(
    origin: GraphPage,
    semanticRole: RelationshipRole,
    rawUrl: string,
    rawAlias: string,
    selectedField: string,
  ): Promise<GraphPage | null> {
    return this.index.withForegroundPriority(async () => {
      if (origin.file?.extension !== "md") {
        new Notice(this.translator("notice.webLinkMarkdownOnly"), 2800);
        return null;
      }
      const url = this.normalizedWebUrl(rawUrl);
      if (!url) {
        new Notice(this.translator("notice.invalidWebLink"), 2800);
        return null;
      }
      const alias = rawAlias.trim();
      const provisional: GraphPage = {
        path: url, file: null, name: alias || url, url, isFolder: false, isTag: false, mtime: null,
        neighbours: new Map(), aliases: [], tags: [], noteType: null, primaryStyleTag: null, styleTags: [], maxLabelLength: 0,
      };
      const escapedAlias = alias.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
      const reference = alias ? `[${escapedAlias}](${url})` : url;
      if (!(await this.index.prepareRelationshipPair(origin.path, provisional.path, provisional))) throw new Error(this.translator("relation.preparingRelationship"));
      const currentOrigin = this.index.get(origin.path);
      if (currentOrigin?.file !== origin.file) throw new Error(this.translator("relation.preparingRelationship"));
      await this.writeRelationship(origin.file, provisional, selectedField, reference);
      const target = this.index.insertUrlPage(url, alias);
      await this.publishSavedRelationship(origin.path, target.path);
      return this.index.get(target.path) ?? target;
    });
  }

  /** Retain an explicitly selected unresolved destination without manufacturing native folders. */
  private placeholderPath(stem: string, folderPath = ""): string {
    // A selected destination is part of the unresolved link; no physical folder or note is created.
    return folderPath ? `${folderPath}/${stem.trim()}` : stem.trim();
  }

  /** Create an unresolved related node without manufacturing a real file; localize its product feedback. */
  async createPlaceholderRelatedPage(
    origin: GraphPage,
    semanticRole: RelationshipRole,
    rawName: string,
    selectedField: string,
    selectedFolder?: string,
    rawAlias = "",
  ): Promise<GraphPage | null> {
    return this.index.withForegroundPriority(async () => {
      const destination = selectedFolder === undefined ? null : this.validateNoteFolderPath(selectedFolder);
      if (destination?.error) throw new Error(destination.error);
      const validation = this.validateRelatedNoteName(rawName, destination?.folderPath);
      if (!validation.valid) {
        new Notice(validation.error ?? this.translator("note.validation.enterValid"), 2800);
        return null;
      }
      if (validation.existing) {
        new Notice(this.translator("note.existsNamed", { name: validation.stem }), 2800);
        return null;
      }
      if (origin.file?.extension !== "md") {
        new Notice(this.translator("notice.placeholderNeedsMarkdown"), 2800);
        return null;
      }

      const path = this.placeholderPath(validation.stem, destination?.folderPath);
      const alias = rawAlias.trim() || validation.stem;
      const reference = placeholderReference(this.app, origin.file, path, alias, this.translator("folderPicker.placeholderUnsupported"));
      const existing = this.index.get(path);
      if (existing) {
        const result = await this.createRelationToPage(origin, semanticRole, existing, selectedField, reference);
        return result.state === "saved-published" ? result.page : null;
      }

      // Write the unresolved wiki link first. Only publish the virtual page after the vault write
      // succeeds, so a failed frontmatter edit cannot leave a detached placeholder in the live graph.
      const provisional: GraphPage = {
        path, file: null, name: validation.stem, url: null, isFolder: false, isTag: false, mtime: null,
        neighbours: new Map(), aliases: [], tags: [], noteType: null, primaryStyleTag: null,
        styleTags: [], maxLabelLength: 0,
      };
      if (!(await this.index.prepareRelationshipPair(origin.path, provisional.path, provisional))) throw new Error(this.translator("relation.preparingRelationship"));
      const currentOrigin = this.index.get(origin.path);
      if (currentOrigin?.file !== origin.file) throw new Error(this.translator("relation.preparingRelationship"));
      await this.writeRelationship(origin.file, provisional, selectedField, reference);
      const target = this.index.insertVirtualPage(path);
      await this.publishSavedRelationship(origin.path, target.path);
      return this.index.get(target.path) ?? target;
    });
  }

  /** Apply explicit creation navigation only while its originating invocation remains current. */
  async finishNewRelatedNode(
    page: GraphPage,
    hostLeaf: WorkspaceLeaf | undefined,
    openForEditing: boolean,
    stillValid: () => boolean = () => true,
  ): Promise<void> {
    if (this.unloading || !stillValid()) return;
    this.notifyNavigation(page.path);
    if (!openForEditing || !page.file) return;
    const host = hostLeaf && hostLeaf.view.getViewType() !== KPLEX_SIDEPANEL_VIEW_TYPE
      ? hostLeaf
      : this.app.workspace.getLeavesOfType(KPLEX_VIEW_TYPE)[0];
    if (host) {
      if (!stillValid()) return;
      await this.openMarkdownInSidecar(host, page.file, 0, true);
      if (!this.unloading && stillValid()) this.focusAssociatedEditor(host);
      return;
    }
    await this.openInDocumentLeaf(page.file);
  }

  /** List permissible real-file locations for materializing a ghost, with localized display labels independent of physical paths. */
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
      label: folderPath || this.translator("common.vaultRoot"),
    }));
  }

  /** Validate a destination, retain accepted reference/file writes, and promote coordinates before opening only the still-current invocation. */
  private async materializeGhostPage(
    page: GraphPage,
    stem: string,
    kind: GhostMaterializationKind,
    folderPath: string,
    rawDisplayName = page.name,
    retainedFile?: TFile,
    continuation: { relocation?: PlaceholderRelocation } = {},
    current: () => boolean = () => true,
  ): Promise<boolean> {
    const retainedPlan = retainedFile ? continuation.relocation : undefined;
    const oldPath = retainedPlan?.oldPath ?? page.path;
    const destination = this.validateNoteFolderPath(folderPath);
    if (destination.error) throw new Error(destination.error);
    const originalFolder = oldPath.includes("/") ? oldPath.slice(0, oldPath.lastIndexOf("/")) : null;
    const relocates = originalFolder !== null && originalFolder !== destination.folderPath;
    const changed = this.translator("ghost.relocationChanged");
    // A pathful link cannot follow an in-memory endpoint remap. Approve exact native occurrences
    // before creation; the shared literal grammar refuses destinations it cannot represent.
    const sources = retainedPlan ? retainedPlan.sources.map(/** A retry keeps the exact originally approved source identities. */ source => source.file)
      : relocates ? this.referencingMarkdownFiles(page) : [];
    const relocation = retainedPlan ?? (relocates ? await capturePlaceholderRelocation(this.app, oldPath, sources, changed) : null);
    if (relocation) continuation.relocation = relocation;
    if (!current() && !retainedFile) return false;
    const referenceHost = relocation?.sources[0]?.file ?? retainedFile;
    if (relocates && !referenceHost) throw new Error(changed);
    if (relocates && referenceHost) placeholderReference(this.app, referenceHost,
      `${destination.folderPath ? destination.folderPath + "/" : ""}${stem}`, stem, this.translator("folderPicker.placeholderUnsupported"));
    if (this.unloading || retainedFile && this.app.vault.getFileByPath(retainedFile.path) !== retainedFile) throw new Error(changed);
    if (retainedFile && (retainedFile.parent?.path === "/" ? "" : retainedFile.parent?.path) !== destination.folderPath) throw new Error(changed);
    const file = retainedFile ?? await this.createNewFileInFolder(stem, kind, destination.folderPath);
    if (!file) return false;
    try {
      if ((file.parent?.path === "/" ? "" : file.parent?.path) !== destination.folderPath) throw new Error(changed);
      if (relocation) await applyPlaceholderRelocation(this.app, relocation, file, /** Native replacement identities never inherit a dismissed placeholder's write authority. */ () => !this.unloading
        && !this.app.metadataCache.getFirstLinkpathDest(oldPath, sources[0]?.path ?? ""), changed);
      await this.writeCreatedNodeDisplayName(file, rawDisplayName);
      await this.rememberNewNodeDefaultType(kind);
      const target = relocation?.target;
      if (target && (target.file !== file || file.path !== target.path || this.app.vault.getFileByPath(target.path) !== file)) throw new Error(changed);
      const wasCenter = this.settings.lastActivePath === oldPath;
      if (!this.index.materializeFile(oldPath, file)) throw new Error(changed);
      const navigationChanged = this.remapNavigationPaths(oldPath, file.path);
      if (wasCenter && current()) this.notifyNavigation(file.path);
      if (navigationChanged) await this.saveSettings(false, false);
      if (current()) await this.openInDocumentLeaf(file);
      return true;
    } catch (error) { throw error instanceof PartialRelatedFileError ? error : new PartialRelatedFileError(file, error); }
  }

  /** Materialize the requested ghost note through the existing vault/index workflow and localize user-visible validation and failures. */
  async createGhostNote(page: GraphPage, chooseFolder = false): Promise<void> {
    if (page.file) {
      await this.openInDocumentLeaf(page.file);
      return;
    }
    if (page.url || page.isFolder || page.isTag) return;

    const rawLeafName = page.path.split("/").pop() ?? page.name;
    const validation = this.validateRelatedNoteName(rawLeafName, "");
    if (!validation.valid) {
      new Notice(validation.error ?? this.translator("notice.placeholderInvalidName"), 3000);
      return;
    }
    const locations = this.ghostCreationLocations(page, validation.stem);
    if (!chooseFolder && locations.length === 1) {
      const existing = this.validateRelatedNoteName(rawLeafName, locations[0].folderPath).existing;
      if (existing) { await this.openInDocumentLeaf(existing); return; }
    }
    const excalidrawAvailable = this.isExcalidrawAvailable();
    const defaultKind: GhostMaterializationKind = this.settings.newNodeDefaultType === "excalidraw" && excalidrawAvailable
      ? "excalidraw"
      : "markdown";

    if (!chooseFolder && locations.length === 1 && !excalidrawAvailable) {
      await this.materializeGhostPage(page, validation.stem, "markdown", locations[0].folderPath, rawLeafName);
      return;
    }

    const continuation: { relocation?: PlaceholderRelocation } = {};
    new MaterializeGhostModal(
      this.app,
      validation.stem,
      locations,
      excalidrawAvailable,
      defaultKind,
      (kind, folderPath, retainedFile, current) => this.materializeGhostPage(page, validation.stem, kind, folderPath, rawLeafName, retainedFile, continuation, current),
      chooseFolder,
    ).open();
  }

}
