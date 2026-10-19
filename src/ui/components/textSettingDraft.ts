/**
 * Bounded text-setting draft, independent of the host or field grammar. Input never invokes the
 * durable writer synchronously; one submitted operation and the newest draft are retained. The
 * caller owns the idle clock, persistence/currentness, feedback and rendered subscriptions.
 */
export type TextDraftState = Readonly<{value: string; busy: boolean; dirty: boolean; error: "storage" | "conflict" | null}>;
type DraftPorts = Readonly<{
  read: () => string;
  normalize: (value: string) => string;
  captureOwner: () => () => boolean;
  commit: (value: string, expected: string, current: () => boolean) => Promise<{refreshPending: boolean}>;
  idle: (run: () => void) => () => void;
  failed: (kind: "storage" | "conflict" | "refresh") => void;
}>;

/** Retains a field's recoverable draft across native row replacement; dispose only at host teardown. */
export class TextSettingDraft {
  private value: string;
  private base: string;
  private owner: () => boolean;
  private error: TextDraftState["error"] = null;
  private pending: Promise<void> | null = null;
  private cancelIdle: (() => void) | null = null;
  private composing: string | null = null;
  private requestedFlush = false;
  private closed = false;
  private readonly listeners = new Set<() => void>();

  /** Initializing a control reads saved text without manufacturing a local edit. */
  constructor(private readonly ports: DraftPorts) {
    this.value = ports.read(); this.base = ports.normalize(this.value); this.owner = ports.captureOwner();
  }

  /** Expose finite immutable state; dirty compares semantic text without rewriting the active input. */
  state(): TextDraftState {return {value: this.value, busy: !!this.pending, dirty: this.ports.normalize(this.value) !== this.base, error: this.error};}

  /** Mount/reopen sees current saved data unless this owner still holds a submitted or dirty draft. */
  refresh(): void {
    if (this.closed || this.pending) return;
    if (!this.state().dirty) this.discard();
    else if (!this.owner()) this.conflict();
  }

  /** Native peers share state; releasing a row never cancels an already submitted disk operation. */
  subscribe(changed: () => void): () => void {this.listeners.add(changed); return /** Release precisely this rendered peer. */ () => {this.listeners.delete(changed);};}

  /** Publish state only to live rows; persistence remains independent of subscribers' lifetime. */
  private notify(): void {if (!this.closed) for (const listener of [...this.listeners]) listener();}

  /** Clear the exact outstanding idle task before another edit, explicit flush or teardown. */
  private clearIdle(): void {this.cancelIdle?.(); this.cancelIdle = null;}

  /** Schedule only one idle commit, never while IME preedit or a failed draft needs user recovery. */
  private schedule(): void {
    this.clearIdle();
    if (!this.closed && this.composing === null && !this.error && this.state().dirty)
      this.cancelIdle = this.ports.idle(/** The host idle boundary submits the latest complete draft. */ () => {this.cancelIdle = null; void this.flush();});
  }

  /** Capture only local text; ongoing submissions retain their own immutable value and comparison base. */
  input(value: string): void {
    if (this.closed || this.error === "conflict") return;
    if (!this.owner()) {this.conflict(); return;}
    this.value = value; this.error = null; this.requestedFlush = false; this.schedule(); this.notify();
  }

  /** No idle timer can publish an IME's transient spelling, even during a long composition. */
  compositionStart(): void {if (!this.closed && this.error !== "conflict") {this.clearIdle(); this.composing = this.value;}}

  /** Commit only the final IME text, respecting an earlier blur's explicit flush request. */
  compositionEnd(value: string): void {
    if (this.closed || this.composing === null) return;
    const flush = this.requestedFlush; this.composing = null; this.input(value);
    if (flush) void this.flush();
  }

  /** A removed row cannot leave incomplete preedit queued; retain its last confirmed text instead. */
  leave(): void {
    if (this.composing !== null) {this.value = this.composing; this.composing = null; this.notify();}
    void this.flush();
  }

  /** Refuse a superseded owner with recoverable text; only explicit discard can accept the new base. */
  private conflict(): void {
    this.clearIdle();
    if (this.error !== "conflict") {this.error = "conflict"; this.ports.failed("conflict");}
    this.notify();
  }

  /** Flush on idle/blur/exit; concurrent requests collapse to at most one latest pending draft. */
  flush(): Promise<void> {
    this.clearIdle();
    if (this.closed || this.error) return Promise.resolve();
    this.requestedFlush = true;
    if (this.composing !== null) return Promise.resolve();
    if (this.pending) return this.pending;
    if (!this.state().dirty) {this.requestedFlush = false; return Promise.resolve();}
    if (!this.owner()) {this.conflict(); return Promise.resolve();}
    const value = this.value, base = this.base, owner = this.owner;
    this.requestedFlush = false;
    // A microtask separates input delivery from snapshot preparation, including synchronous failures.
    this.pending = Promise.resolve().then(/** Teardown before submission cannot start a new host operation. */ () => this.closed ? {refreshPending: false} : this.ports.commit(value, base, owner))
      .then(/** Saved-but-refresh-pending never becomes an unsaved automatic retry. */ result => {
        if (this.closed) return;
        this.base = this.ports.normalize(value);
        if (result.refreshPending) this.ports.failed("refresh");
      }, /** Storage failure retains the complete latest draft, with no autonomous retry loop. */ error => {
        if (this.closed) return;
        if (!owner() || error instanceof Error && error.name === "SettingsConflictError") this.conflict();
        else {this.error = "storage"; this.ports.failed("storage");}
      }).finally(/** Only explicit exit or an elapsed idle task can immediately submit a newer draft. */ () => {
        this.pending = null;
        if (this.closed) return;
        if (!this.owner()) {if (this.state().dirty) this.conflict(); else this.discard();}
        else if (!this.state().dirty && this.ports.normalize(this.ports.read()) !== this.base) this.discard();
        this.notify();
        if (this.requestedFlush && !this.error && this.state().dirty) void this.flush();
      });
    this.notify(); return this.pending;
  }

  /** Storage recovery is deliberate; a conflict requires discarding/reopening against current data. */
  retry(): void {if (!this.closed && !this.pending && this.error === "storage") {this.error = null; void this.flush();}}

  /** Explicitly abandon unsubmitted text; never claim to cancel an accepted disk operation. */
  discard(): void {
    if (this.closed || this.pending) return;
    this.clearIdle(); this.composing = null; this.requestedFlush = false; this.error = null;
    this.value = this.ports.read(); this.base = this.ports.normalize(this.value); this.owner = this.ports.captureOwner(); this.notify();
  }

  /** Teardown abandons only unsubmitted work and fences late feedback/subscriber calls. */
  dispose(): void {this.closed = true; this.clearIdle(); this.listeners.clear(); this.composing = null; this.requestedFlush = false;}
}
