/** Observe the installed Templater creation handler's real completion, including its initial
 * deferred admission. Never infer completion from a quiet window or duplicate template rules.
 * This optional, guarded host seam delegates once and restores the exact method on retirement. */
import type {App, TAbstractFile, TFile} from "obsidian";
import {PartialRelatedFileError} from "./relatedFileOutcome";

type Handler = (this: unknown, engine: unknown, app: App, file: TAbstractFile) => Promise<void>;
type HandlerOwner = {on_file_creation: Handler};
type Observer = (app: App, file: TAbstractFile, completion: Promise<void>) => void;
const hooks = new WeakMap<object, {observers: Set<Observer>; release(): void}>();

/** Concurrent K-Plex creations share one transparent interception, never stacked wrappers. */
function observe(owner: HandlerOwner, observer: Observer): () => void {
  let hook = hooks.get(owner);
  if (!hook) {
    const original = owner.on_file_creation, observers = new Set<Observer>();
    const wrapped: Handler = function(engine, app, file) {
      const completion = original.call(this, engine, app, file) as Promise<void>;
      for (const receive of observers) receive(app, file, completion);
      return completion;
    };
    owner.on_file_creation = wrapped;
    hook = {observers, release: () => {
      // Another integration's later wrapper owns that slot; never overwrite it on cleanup.
      if (owner.on_file_creation === wrapped) owner.on_file_creation = original;
      hooks.delete(owner);
    }};
    hooks.set(owner, hook);
  }
  const acquired = hook; acquired.observers.add(observer); let live = true;
  return () => {if (!live) return; live = false; acquired.observers.delete(observer); if (!acquired.observers.size) acquired.release();};
}

type Messages = Readonly<{waiting(): void | (() => void); unavailable(): string; cancelled(): string}>;

/** Plugin-owned receipts follow exact native file identities through rename and retries. Only
 * accepted K-Plex creates wait; unrelated vault events and indexing acquire no work here. */
export class FileCreationAutomation {
  private readonly tasks = new WeakMap<TAbstractFile, Promise<void>>();
  private readonly cancels = new Set<() => void>();
  private readonly releases = new Set<() => void>();
  private readonly missingReceipts = new WeakSet<TFile>();
  private disposed = false;

  /** The application main window owns coordination independently of the invoking modal/popout. */
  constructor(private readonly app: App, private readonly messages: Messages) {}

  /** Register before native create dispatches vault:create; await only the returned file's receipt.
   * Handler lookup is intentionally version guarded: unsupported enabled integrations fail before
   * creating, rather than allowing K-Plex to corrupt unevaluated template frontmatter. */
  async create(create: () => Promise<TFile | null>): Promise<TFile | null> {
    if (this.disposed) throw new Error(this.messages.cancelled());
    const registry = this.app as App & {plugins?: {plugins?: Record<string, unknown>}};
    const plugin = registry.plugins?.plugins?.["templater-obsidian"];
    if (!plugin) return create();
    const engine = typeof plugin === "object" && "templater" in plugin ? plugin.templater : null;
    const owner = engine && typeof engine === "object" ? engine.constructor : null;
    if (!owner || !("on_file_creation" in owner) || typeof owner.on_file_creation !== "function") throw new Error(this.messages.unavailable());
    const receipts = new WeakMap<TAbstractFile, Promise<void>>();
    const release = observe(owner as HandlerOwner, (app, file, completion) => {
      if (app !== this.app) return;
      // Attach rejection handling immediately even when Vault.create has not returned its file.
      void completion.catch(() => {}); receipts.set(file, completion);
    });
    this.releases.add(release);
    let file: TFile | null = null;
    try {
      file = await create();
      if (!file) return null;
      const task = receipts.get(file);
      if (!task) {this.missingReceipts.add(file); throw new Error(this.messages.unavailable());}
      // Retain recovery authority only for our exact result, not concurrent Sync/other-plugin files.
      this.tasks.set(file, task);
      await this.wait(file);
      return file;
    } catch (error) {
      if (file) throw new PartialRelatedFileError(file, error);
      throw error;
    } finally {release(); this.releases.delete(release);}
  }

  /** Recovery of an existing partial file must respect the same unfinished template receipt. */
  async wait(file: TFile): Promise<void> {
    if (this.disposed) throw new Error(this.messages.cancelled());
    if (this.missingReceipts.has(file)) throw new Error(this.messages.unavailable());
    const task = this.tasks.get(file);
    if (!task) return;
    let cancel!: () => void;
    const cancelled = new Promise<never>((_resolve, reject) => {cancel = () => reject(new Error(this.messages.cancelled()));});
    this.cancels.add(cancel);
    // A notice reports waiting only. It never grants write permission or ends template work.
    let stopWaiting: (() => void) | undefined;
    const timer = window.setTimeout(() => {const release = this.messages.waiting(); if (typeof release === "function") stopWaiting = release;}, 1500);
    try {
      await Promise.race([task, cancelled]);
      if (this.disposed || this.app.vault.getFileByPath(file.path) !== file) throw new Error(this.messages.cancelled());
    } finally {window.clearTimeout(timer); stopWaiting?.(); this.cancels.delete(cancel);}
  }

  /** Unloading releases waiting K-Plex operations; the independent template itself is not cancelled. */
  dispose(): void {
    this.disposed = true;
    for (const cancel of this.cancels) cancel(); this.cancels.clear();
    for (const release of this.releases) release(); this.releases.clear();
  }
}
