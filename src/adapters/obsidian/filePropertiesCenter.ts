/**
 * Follow the most recently active Plex's open editor file (otherwise its root/center) in visible native File properties
 * panes. This adapter uses the host's verified private FileView loader without opening documents,
 * emitting file-open, changing native selection/history or acquiring graph sources. Native loaders
 * are not cancellable: accepted loads are serialized and their completion repairs stale metadata
 * against fresh workspace ownership, including the host's file/modifyingFile overlap race. Each
 * unchanged ownership intent has a bounded repair budget; a non-converging host cannot spin tasks.
 */
import type { App, FileView, TFile, View, WorkspaceLeaf } from "obsidian";

/** Native Properties members verified on Obsidian 1.14.4; unavailable loaders decline safely. */
interface PropertiesView extends FileView {
  modifyingFile?: TFile | null;
  readonly isLeafBoundToFile?: boolean;
  loadFile(file: TFile | null): Promise<unknown>;
}

/** One mounted React surface supplies its live document/root without exposing the graph repository. */
interface CenterRegistration {
  leaf: WorkspaceLeaf;
  document: Document;
  readFile: () => TFile | null;
  isVisible: () => boolean;
}

/** At most one adapter-owned native load runs for a particular Properties leaf. */
interface DestinationWork {
  leaf: WorkspaceLeaf;
  view: View;
  document: Document;
  revision: number;
  accepted: boolean;
}

/** Refresh after a changed editor/root file; release when this exact React root retires or migrates. */
export interface FilePropertiesCenterLease {
  refresh(): void;
  dispose(): void;
}

const followers = new WeakMap<App, FilePropertiesFollower>();

/** Decline private APIs when a host version or another view does not supply the verified shape. */
function propertiesView(view: View): PropertiesView | null {
  if (view.getViewType() !== "file-properties" || !("file" in view)
    || !("loadFile" in view) || typeof view.loadFile !== "function") return null;
  return view as PropertiesView;
}

/** Hidden tabs/drawers must not be hydrated merely because a Plex center changes. */
function visibleLeaf(leaf: WorkspaceLeaf): boolean {
  const element = leaf.view.containerEl;
  if (!element.isConnected) return false;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (style?.display === "none" || style?.visibility === "hidden") return false;
  const bounds = element.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}

/** Native File properties edits Markdown only; attachments, Bases and empty centers have no metadata file. */
function metadataMatches(view: PropertiesView, file: TFile | null): boolean {
  return !("modifyingFile" in view) || (view.modifyingFile ?? null) === (file?.extension === "md" ? file : null);
}

/** Bound utility panes keep their native target even if binding changes during an accepted load. */
function boundLeaf(leaf: WorkspaceLeaf, view?: PropertiesView): boolean {
  const state = leaf.getViewState();
  return Boolean(state.pinned || state.group || view?.isLeafBoundToFile);
}

/** Share ownership and accepted-load queues across every Plex window in one native application. */
class FilePropertiesFollower {
  private readonly centers = new Set<CenterRegistration>();
  private recent: CenterRegistration | null = null;
  private readonly work = new Map<WorkspaceLeaf, DestinationWork>();
  private readonly failedTargets = new WeakMap<WorkspaceLeaf, { file: TFile | null; intent: number }>();
  private intent = 0;
  private releaseEvents: (() => void) | null = null;

  /** Retain only the host services needed to resolve files, existing utility panes and activation. */
  constructor(private readonly app: App) {}

  /** Register one root; a later re-registration reuses any native load already accepted before close. */
  register(registration: CenterRegistration): FilePropertiesCenterLease {
    this.centers.add(registration);
    if (!this.releaseEvents) this.listen();
    this.observeActive(this.app.workspace.getMostRecentLeaf());
    let disposed = false;
    return {
      /** A hidden/non-owning Plex cannot replace the most recently active surface's Properties. */
      refresh: (): void => { if (!disposed) this.refresh(this.recent === registration); },
      /** Pending requests retire immediately; an accepted loader still repairs genuine native ownership. */
      dispose: (): void => {
        if (disposed) return;
        disposed = true;
        this.centers.delete(registration);
        if (this.recent === registration) this.recent = null;
        this.refresh();
        if (!this.centers.size) { this.releaseEvents?.(); this.releaseEvents = null; }
      },
    };
  }

  /** Native file-open can clear Properties after activating an ItemView; reconcile after listeners run. */
  private listen(): void {
    const workspace = this.app.workspace;
    const active = workspace.on("active-leaf-change", /** Capture native ownership before an older loader completes. */ leaf => this.observeActive(leaf));
    const file = workspace.on("file-open", /** Repair the host's null-file ItemView observation without emitting another event. */ () => this.refresh());
    const layout = workspace.on("layout-change", /** Newly revealed existing Properties panes adopt the current owner. */ () => this.refresh());
    this.releaseEvents = /** Release exact subscriptions when the final mounted Plex retires. */ (): void => {
      workspace.offref(active); workspace.offref(file); workspace.offref(layout);
    };
  }

  /** Utility-pane focus retains the last Plex; another native content leaf returns authority to Obsidian. */
  private observeActive(leaf: WorkspaceLeaf | null): void {
    const previous = this.recent;
    const registration = [...this.centers].find(/** Embedded content retains its enclosing Plex's Properties ownership. */ center =>
      center.leaf === leaf || Boolean(leaf && center.leaf.view.containerEl.contains(leaf.view.containerEl)));
    if (registration) this.recent = registration;
    else if (leaf?.view.getViewType() !== "file-properties") this.recent = null;
    this.refresh(this.recent !== previous);
  }

  /** Return fresh authority, including native-file fallback solely for repairing an accepted stale load. */
  private target(): { file: TFile | null; owned: boolean } {
    const center = this.recent;
    const owned = Boolean(center && this.centers.has(center) && center.isVisible()
      && center.leaf.view.containerEl.isConnected && center.leaf.view.containerEl.ownerDocument === center.document);
    const file = owned && center ? center.readFile() : this.app.workspace.getActiveFile();
    return { file: file && this.app.vault.getFileByPath(file.path) === file ? file : null, owned };
  }

  /** Coalesce notifications; only a genuine center/owner intent permits retrying an unreadable file. */
  private refresh(newIntent = false): void {
    if (newIntent) this.intent++;
    for (const pending of this.work.values()) pending.revision++;
    if (!this.target().owned) return;
    for (const leaf of this.app.workspace.getLeavesOfType("file-properties")) {
      if (!visibleLeaf(leaf) || this.work.has(leaf)) continue;
      const pending: DestinationWork = { leaf, view: leaf.view, document: leaf.view.containerEl.ownerDocument, revision: 0, accepted: false };
      this.work.set(leaf, pending);
      let completedRevision = pending.revision;
      // Native file-open listeners finish before the queued adapter inspects settled host state.
      void Promise.resolve().then(/** One destination worker owns every adapter load until settled. */ () => this.run(pending))
        .then(/** Capture the worker's terminal revision before later effects can enqueue another center. */ revision => { completedRevision = revision; })
        .catch(/** A failed optional native pane must not break Plex navigation or produce a rejected task. */ error => {
          completedRevision = pending.revision;
          console.error("K-Plex File properties synchronization failed", error);
        })
        .finally(/** Retain an in-flight queue across root replacement, then release its native leaf. */ () => {
          if (this.work.get(leaf) === pending) this.work.delete(leaf);
          if (pending.revision !== completedRevision) this.refresh();
        });
    }
  }

  /** Refuse detached/replaced/hidden or migrated utility panes at every awaited boundary. */
  private destination(pending: DestinationWork): PropertiesView | null {
    const { leaf } = pending;
    if (leaf.view !== pending.view || !visibleLeaf(leaf)
      || leaf.view.containerEl.ownerDocument !== pending.document
      || !this.app.workspace.getLeavesOfType("file-properties").includes(leaf)) return null;
    return propertiesView(leaf.view);
  }

  /** Latest authority wins even if an older native load published file B with metadata from file A. */
  private async run(pending: DestinationWork): Promise<number> {
    const { leaf } = pending;
    if (leaf.isDeferred) {
      const target = this.target();
      if (!target.owned || !visibleLeaf(leaf) || boundLeaf(leaf)) return pending.revision;
      await leaf.loadIfDeferred();
      // Loading this exact deferred leaf legitimately replaces its DeferredView.
      if (leaf.view.getViewType() !== "file-properties") return pending.revision;
      pending.view = leaf.view;
    }
    let boundTarget: TFile | null = null;
    /** A newly pinned/grouped pane may repair its own target, but must never adopt another Plex center. */
    const currentTarget = (view: PropertiesView): { file: TFile | null; owned: boolean } => {
      if (!boundLeaf(leaf, view)) { boundTarget = null; return this.target(); }
      if (view.file) boundTarget = view.file;
      return { file: boundTarget, owned: false };
    };
    let repairTarget: { file: TFile | null; owned: boolean; intent: number } | null = null;
    let repairSteps = 0;
    for (;;) {
      const view = this.destination(pending), intent = this.intent;
      if (!view || (boundLeaf(leaf, view) && !pending.accepted)) return pending.revision;
      const target = currentTarget(view);
      if ((!target.owned && !pending.accepted)
        || (target.file && this.app.vault.getFileByPath(target.file.path) !== target.file)) return pending.revision;
      if (view.file === target.file && metadataMatches(view, target.file)) {
        this.failedTargets.delete(leaf);
        return pending.revision;
      }
      const failed = this.failedTargets.get(leaf);
      if (failed?.file === target.file && failed.intent === intent) return pending.revision;
      if (!repairTarget || repairTarget.file !== target.file || repairTarget.owned !== target.owned
        || repairTarget.intent !== intent) {
        repairTarget = { ...target, intent }; repairSteps = 0;
      }
      // One initial load plus one stale-metadata clear/reload repairs the verified overlap race.
      // A resolved private loader may still refuse or fail to settle its fields; do not spin an
      // unbounded microtask chain, or restart it from its own layout/file-open notifications.
      if (repairSteps >= 3) {
        this.failedTargets.set(leaf, { file: target.file, intent });
        return pending.revision;
      }
      repairSteps++;
      pending.accepted = true;
      if (view.file === target.file) {
        // Native loadFile short-circuits same-file requests, even with an older metadata editor.
        if (!view.file) {
          // The same race can leave metadata A after a native clear already set file=null.
          // FileView's public unload hook clears that stale editor; loadFile(null) would decline.
          if (!view.modifyingFile || typeof view.onUnloadFile !== "function") return pending.revision;
          await view.onUnloadFile(view.modifyingFile);
          if (!metadataMatches(view, null)) return pending.revision;
        } else await view.loadFile(null);
        if (!this.destination(pending)) return pending.revision;
        continue; // Reacquire authority after clearing, including a newer native or Plex selection.
      }
      await view.loadFile(target.file);
      if (!this.destination(pending)) return pending.revision;
      // A foreign native loader can overlap ours without changing its file after our completion.
      const current = currentTarget(view);
      if (view.file === current.file && metadataMatches(view, current.file)) {
        this.failedTargets.delete(leaf);
        return pending.revision;
      }
      // Native loadFile catches read errors and resolves with file=null. Retry only a newer intent,
      // never header/layout/file-open noise caused by that failure, including later notifications.
      // A successful old read can leave modifyingFile=A after a competing native null clear.
      // That is the host overlap race, not a failed read: reload the still-owned A instead.
      if (view.file === null && target.file !== null && metadataMatches(view, null)) {
        this.failedTargets.set(leaf, { file: target.file, intent });
        if (current.file === target.file && current.owned === target.owned && this.intent === intent) return pending.revision;
      }
    }
  }
}

/** Lease Properties following to one mounted Plex; private native behavior stays outside React. */
export function registerFilePropertiesCenter(
  app: App, leaf: WorkspaceLeaf, readFile: () => TFile | null, isVisible: () => boolean,
): FilePropertiesCenterLease {
  let follower = followers.get(app);
  if (!follower) { follower = new FilePropertiesFollower(app); followers.set(app, follower); }
  return follower.register({ leaf, document: leaf.view.containerEl.ownerDocument, readFile, isVisible });
}
