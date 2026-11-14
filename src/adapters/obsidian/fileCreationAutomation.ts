/** Observe the installed Templater creation handler's real completion, including its initial
 * deferred admission. Never infer completion from a quiet window or duplicate template rules.
 * This optional, guarded host seam delegates once and restores the exact method on retirement. */
import type {App, TAbstractFile, TFile} from "obsidian";
import {PartialRelatedFileError} from "./relatedFileOutcome";
import type {ExplicitCreationTemplate} from "./creationTemplates";

type Handler = (this: unknown, engine: unknown, app: App, file: TAbstractFile) => Promise<void>;
type HandlerOwner = {on_file_creation: Handler};
type Observer = (app: App, file: TAbstractFile, completion: Promise<void>) => void;
type Interceptor = (app: App, file: TAbstractFile, native: () => Promise<void>) => (() => Promise<void>) | null;
type Registration = {receive: Observer; intercept?: Interceptor};
const CREATION_HOOK = Symbol.for("k-plex:templater-creation-receipts");
type SharedCreationHook = Readonly<{protocol: 1; handler: Handler; acquire(registration: Registration): (() => void) | null}>;

/** Templater 2.27 reuses mutable function-module context across parser awaits. Serialize the
 * complete creation receipt, including its native cleanup, without patching global parser/menu APIs.
 * A failed receipt releases admission; different native engines remain independent. */
function serializeHandler(engineReceipts: WeakMap<object, Promise<void>>, engine: unknown, work: () => Promise<void>): Promise<void> {
  if (!engine || typeof engine !== "object" && typeof engine !== "function") return Promise.resolve().then(work);
  const previous = engineReceipts.get(engine), completion = previous ? previous.then(work) : Promise.resolve().then(work);
  const settled = completion.then(
    /** A sequencing tail carries completion, never the caller's recoverable result. */ () => {},
    /** A rejected native receipt must not poison admission of the next file. */ () => {},
  );
  engineReceipts.set(engine, settled);
  void settled.then(/** Retire this weak sequencing tail only if no newer receipt replaced it. */ () => {if (engineReceipts.get(engine) === settled) engineReceipts.delete(engine);});
  return completion;
}

/** The native owner carries only a temporary semantic registration. A freshly evaluated K-Plex
 * bundle must join this same receipt queue while an older bundle's native handler is draining. */
function creationHook(owner: HandlerOwner): SharedCreationHook | null {
  const existing = Object.getOwnPropertyDescriptor(owner, CREATION_HOOK);
  if (existing) {
    const value: unknown = existing.value;
    if (!value || typeof value !== "object" || Reflect.get(value, "protocol") !== 1
      || typeof Reflect.get(value, "handler") !== "function" || typeof Reflect.get(value, "acquire") !== "function") return null;
    return value as SharedCreationHook;
  }
  // Keep call() typed even when the host compiler disables strictBindCallApply.
  const original: Handler & CallableFunction = owner.on_file_creation, observers = new Set<Registration>();
  const engineReceipts = new WeakMap<object, Promise<void>>();
  let pending = 0, retired = false;
  /** Remove only our own marker/slot; a later third-party wrapper retains its ownership. */
  function retire(): void {
    retired = true;
    try {if (owner.on_file_creation === wrapped) Reflect.set(owner, "on_file_creation", original);}
    catch { /* Another integration may lock its slot; the retained retired handler stays transparent. */ }
    if (Object.getOwnPropertyDescriptor(owner, CREATION_HOOK)?.value === shared) Reflect.deleteProperty(owner, CREATION_HOOK);
  }
  /** Keep admitted native work inside this same queue after every old observer retires. */
  function releaseWhenIdle(): void {if (!retired && !observers.size && !pending) retire();}
  const wrapped: Handler = function(engine, app, file) {
    // A later third-party wrapper may retain this retired function. Remain transparent so a
    // future registration cannot enqueue recursively behind its own native receipt.
    if (retired) return original.call(this, engine, app, file);
    const replacement = [...observers].map(item => item.intercept?.(app, file, () => original.call(this, engine, app, file))).find(Boolean);
    pending++;
    const completion = serializeHandler(engineReceipts, engine, () => replacement ? replacement() : original.call(this, engine, app, file));
    /** Rejections retain their per-file receipt while releasing the next native context. */
    const finished = (): void => {pending--; releaseWhenIdle();};
    void completion.then(finished, finished);
    for (const {receive} of observers) receive(app, file, completion);
    return completion;
  };
  const shared: SharedCreationHook = {protocol: 1, handler: wrapped,
    /** Registration lifetime is independent of the bundle copy that owns the native queue. */
    acquire(registration): (() => void) | null {
      if (retired) return null;
      observers.add(registration);let live = true;
      return () => {if (!live) return;live = false;observers.delete(registration);releaseWhenIdle();};
    },
  };
  try {
    Object.defineProperty(owner, CREATION_HOOK, {value: shared, configurable: true});
    owner.on_file_creation = wrapped;
    if (owner.on_file_creation !== wrapped) {retire();return null;}
  } catch {
    // Failed installation cannot strand the marker or replace a third party's intervening slot.
    retire();return null;
  }
  return shared;
}

/** Concurrent and reloaded K-Plex copies share one transparent native creation interception. */
function observe(owner: HandlerOwner, observer: Observer, unavailable: () => Error, intercept?: Interceptor): () => void {
  const release = creationHook(owner)?.acquire({receive: observer, intercept});
  if (!release) throw unavailable();
  return release;
}

type Messages = Readonly<{waiting(): void | (() => void); unavailable(): string; cancelled(): string}>;

/** Plugin-owned receipts follow exact native file identities through rename and retries. While a
 * K-Plex receipt owns the native creation hook, same-engine handlers share serial parser admission;
 * unrelated files acquire no recovery receipt and indexing/navigation acquire no work here. */
export class FileCreationAutomation {
  private readonly tasks = new WeakMap<TAbstractFile, Promise<void>>();
  private readonly cancels = new Set<() => void>();
  private readonly releases = new Set<() => void>();
  private readonly missingReceipts = new WeakSet<TFile>();
  private readonly explicitPaths = new Set<string>();
  private disposed = false;

  /** The application main window owns coordination independently of the invoking modal/popout. */
  constructor(private readonly app: App, private readonly messages: Messages) {}

  /** Register before native create dispatches vault:create; await only the returned file's receipt.
   * Handler lookup is intentionally version guarded: unsupported enabled integrations fail before
   * creating, rather than allowing K-Plex to corrupt unevaluated template frontmatter. */
  async create(create: () => Promise<TFile | null>, explicit?: ExplicitCreationTemplate): Promise<TFile | null> {
    if (this.disposed) throw new Error(this.messages.cancelled());
    if (explicit && this.explicitPaths.has(explicit.path)) throw new Error(this.messages.unavailable());
    const registry = this.app as App & {plugins?: {plugins?: Record<string, unknown>}};
    const plugin = registry.plugins?.plugins?.["templater-obsidian"];
    if (!plugin) {
      if (!explicit) return create();
      this.explicitPaths.add(explicit.path);let file: TFile | null = null;
      try {
        file = await create();if (!file) return null;
        if (file.path !== explicit.path || this.app.vault.getFileByPath(file.path) !== file) throw new Error(this.messages.cancelled());
        const owned = file, task = Promise.resolve().then(() => {
          if (this.disposed) throw new Error(this.messages.cancelled());
          return explicit.run(owned);
        });this.tasks.set(file, task);await this.wait(file);return file;
      } catch (error) { if (file) throw new PartialRelatedFileError(file, error);throw error; }
      finally {this.explicitPaths.delete(explicit.path);}
    }
    const engine = typeof plugin === "object" && "templater" in plugin ? plugin.templater : null;
    const owner = engine && typeof engine === "object" ? engine.constructor : null;
    if (!owner || !("on_file_creation" in owner) || typeof owner.on_file_creation !== "function") throw new Error(this.messages.unavailable());
    const receipts = new WeakMap<TAbstractFile, Promise<void>>();
    let acceptExplicit: (file: TFile | null) => void = () => {};
    // Native create itself cannot be cancelled. Preserve its eventual exact identity even on
    // disposal; resolving null early would send our queued selected file through foreign automation.
    const createdIdentity = new Promise<TFile | null>(resolve => {acceptExplicit = resolve;});
    if (explicit) this.explicitPaths.add(explicit.path);
    let file: TFile | null = null, release: (() => void) | undefined;
    try {
      release = observe(owner as HandlerOwner, (app, file, completion) => {
        if (app !== this.app) return;
        // Attach rejection handling immediately even when Vault.create has not returned its file.
        void completion.catch(() => {}); receipts.set(file, completion);
      }, () => new Error(this.messages.unavailable()), explicit ? (app, eventFile, native) => {
        if (app !== this.app || eventFile.path !== explicit.path) return null;
        return async () => {
          const owned = await createdIdentity;
          // A racing Sync/foreign creation may win the same path. It keeps its original automatic
          // processing; only the exact native file returned by our create receives the explicit choice.
          if (!owned || owned !== eventFile) return native();
          if (this.disposed || this.app.vault.getFileByPath(owned.path) !== owned) throw new Error(this.messages.cancelled());
          return explicit.run(owned);
        };
      } : undefined);
      this.releases.add(release);
      file = await create();
      if (explicit && file && file.path !== explicit.path) throw new Error(this.messages.cancelled());
      acceptExplicit(file);
      if (!file) return null;
      const task = receipts.get(file);
      if (!task) {this.missingReceipts.add(file); throw new Error(this.messages.unavailable());}
      // Retain recovery authority only for our exact result, not concurrent Sync/other-plugin files.
      this.tasks.set(file, task);
      await this.wait(file);
      return file;
    } catch (error) {
      acceptExplicit(null);
      if (file) throw new PartialRelatedFileError(file, error);
      throw error;
    } finally {release?.();if (release) this.releases.delete(release);if (explicit) this.explicitPaths.delete(explicit.path);}
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
