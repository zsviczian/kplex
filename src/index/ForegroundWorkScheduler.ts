/**
 * Cooperative priority boundary owned by the existing GraphIndex lifecycle. Work retains its private
 * progress while higher-priority requests run. Injected host capabilities pace background lanes with
 * shared idle windows and a live host-focus hint. Inactive hosts also pace automatic view preparation;
 * admitted cache saves retain normal pacing. This owner cancels only host waits on focus/preferences,
 * foreground admission and unload. Publication
 * and freshness remain caller-owned. Checkpoints must run outside IDB transactions.
 */
/** Named cooperative lanes; lower numbers preempt higher numbers at safe task boundaries. */
export const INDEX_WORK_PRIORITY = {
  /** User-requested persistent changes and their immediate publication. */
  mutation: 0,
  /** Requested center semantics and navigation. */
  currentNode: 1,
  /** Visible neighbors, gates and presentation completion. */
  visibleNeighborhood: 2,
  /** Bounded web-link owner preparation and independent local-mode inventory. */
  urlInventory: 3,
  /** Whole-graph hydration/indexing, Eager URL inventory, source vocabulary and cache maintenance. */
  background: 4,
} as const;
export type IndexWorkPriority = typeof INDEX_WORK_PRIORITY[keyof typeof INDEX_WORK_PRIORITY];

/** Persisted scheduling preference; this never changes relationship or cache compatibility. */
export type IndexingThrottle = "responsive" | "balanced" | "faster";

/** Normalize persisted or live preferences to the responsiveness-favoring default. */
export function sanitizeIndexingThrottle(value: unknown): IndexingThrottle {
  return value === "balanced" || value === "faster" ? value : "responsive";
}

/** Relative effort is scheduling-only; zero pauses optional work without discarding its progress. */
export function sanitizeBackgroundIndexingEffort(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 10;
}

/** Narrow host capabilities keep timing deterministic in tests and independent of window globals. */
export interface IndexWorkPacing {
  now: () => number;
  setTimeout: (callback: () => void, milliseconds: number) => number;
  clearTimeout: (timer: number) => void;
  /** Host-owned cancellable short waits avoid hidden-renderer timer clamping where supported. */
  scheduleIdle?: (callback: () => void, milliseconds: number) => () => void;
  throttle: () => unknown;
  /** Live focus hint; inactive effort also applies to automatic current/visible preparation. */
  isForeground?: () => boolean;
  /** Zero pauses settled-session background work; 100 uses the selected foreground pace. */
  backgroundEffort?: () => unknown;
}

const PACING_WINDOWS: Record<IndexingThrottle, { work: number; idle: number }> = {
  responsive: { work: 6, idle: 24 },
  balanced: { work: 12, idle: 12 },
  faster: { work: 24, idle: 4 },
};

// Keep the already-tested responsive work allowance. A longer finite rest lowers inactive load
// without suspending owners, losing private progress, or changing publication/persistence deadlines.
const INACTIVE_PACING_WINDOW = { work: 6, idle: 240 };

/** Priority accounting for mutations, navigation, visible changes, indexing and maintenance. */
export class ForegroundWorkScheduler {
  private readonly active = [0, 0, 0, 0, 0];
  private readonly waiters = new Set<() => void>();
  private closed = false;
  private pauses = 0;
  private readonly pausesByLane = [0, 0, 0, 0, 0];
  private sliceStarted: number | undefined;
  private cancelIdle: (() => void) | undefined;
  private idleWait: Promise<void> | undefined;
  private releaseIdle: (() => void) | undefined;
  private idleWindows = 0;
  private readonly activityWaiters = new Set<() => void>();

  /** Hosts inject pacing; capability-free callers retain the existing priority-only contract. */
  constructor(private readonly pacing?: IndexWorkPacing) {}

  /** Retain one request until its idempotent release; higher-priority work never joins this owner. */
  begin(priority: IndexWorkPriority): () => void {
    if (this.closed) return () => undefined;
    this.active[priority]++;
    if (priority === INDEX_WORK_PRIORITY.mutation || priority < INDEX_WORK_PRIORITY.urlInventory && !this.pacesInactiveView()) this.finishIdle();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active[priority]--;
      for (const wake of this.waiters) wake();
    };
  }

  /** Run a named operation with exception-safe ownership; nested work is not serialized. */
  async run<T>(priority: IndexWorkPriority, work: () => Promise<T>): Promise<T> {
    // Do not let a visible-but-unfocused task publish or acquire before its first checkpoint.
    // Wait before taking its lane so a paused admission cannot obstruct an admitted cache save.
    if (!this.closed && priority !== INDEX_WORK_PRIORITY.mutation && this.pacesInactiveView()) await this.pacedCheckpoint(priority);
    const release = this.begin(priority);
    try { return await work(); } finally { release(); }
  }

  /** Pause behind higher lanes and share inactive effort without delaying focused view checkpoints.
   * An already-admitted save uses normal pacing even after focus loss or a zero-effort preference. */
  checkpoint(priority: IndexWorkPriority = INDEX_WORK_PRIORITY.background, admittedSave = false): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (!this.hasHigherPriority(priority, admittedSave)) return this.pacedCheckpoint(priority, admittedSave);
    this.pauses++;
    this.pausesByLane[priority]++;
    const wait = new Promise<void>((resolve) => {
      /** Recheck after every release because another foreground request may still own its lane. */
      const wake = (): void => {
        if (!this.closed && this.hasHigherPriority(priority, admittedSave)) return;
        this.waiters.delete(wake);
        resolve();
      };
      this.waiters.add(wake);
      wake();
    });
    return this.pacing ? wait.then(/** Recheck priority and live pacing after the request releases. */
      () => this.checkpoint(priority, admittedSave)) : wait;
  }

  /** Aggregate-only diagnostics expose scheduling activity without retaining request identities. */
  diagnostics(): Readonly<{ active: readonly number[]; waiting: number; pauses: number; pausesByLane: readonly number[];
    idleWindows: number; pacing: boolean; throttle: IndexingThrottle | null; paused: boolean; workMs: number; restMs: number }> {
    const policy = this.pacingWindow();
    return { active: [...this.active], waiting: this.waiters.size, pauses: this.pauses, pausesByLane: [...this.pausesByLane],
      idleWindows: this.idleWindows, pacing: this.idleWait !== undefined,
      paused: policy === null, workMs: policy?.work ?? 0, restMs: policy?.idle ?? 0,
      throttle: this.pacing ? sanitizeIndexingThrottle(this.pacing.throttle()) : null };
  }

  /** Unload releases every paused continuation; the caller's lifetime fence rejects late work. */
  close(): void {
    this.closed = true;
    this.finishIdle();
    for (const wake of this.waiters) wake();
    for (const wake of this.activityWaiters) wake();
  }

  /** Focus/preferences wake retained work through events, including a completely timer-free pause. */
  refreshPacing(): void {
    this.finishIdle();
    for (const wake of this.waiters) wake();
    for (const wake of this.activityWaiters) wake();
  }

  /** Share the selected foreground ceiling; logarithmic rests make the full slider useful. */
  private pacingWindow(): {work: number; idle: number} | null {
    const foreground = PACING_WINDOWS[sanitizeIndexingThrottle(this.pacing?.throttle())];
    if (this.pacing?.isForeground?.() !== false) return foreground;
    // Capability-free embedders retain the earlier finite inactive contract.
    if (!this.pacing.backgroundEffort) return INACTIVE_PACING_WINDOW;
    const effort = sanitizeBackgroundIndexingEffort(this.pacing.backgroundEffort());
    if (effort === 0) return null;
    if (effort === 100) return foreground;
    return {work: 6, idle: Math.round(2000 * Math.pow(foreground.idle / 2000, (effort - 1) / 99))};
  }

  /** Reuse one background idle window so concurrent inventories cannot create independent budgets. */
  private pacedCheckpoint(priority: IndexWorkPriority, admittedSave = false): Promise<void> {
    if (!this.pacing || priority === INDEX_WORK_PRIORITY.mutation
      || priority < INDEX_WORK_PRIORITY.urlInventory && !this.pacesInactiveView()) return Promise.resolve();
    const policy = admittedSave ? PACING_WINDOWS[sanitizeIndexingThrottle(this.pacing.throttle())] : this.pacingWindow();
    if (!policy) return new Promise<void>(/** No polling: selection, window focus, preference changes or unload release this wait. */ resolve => {
      /** Remove this receipt before the retained operation resumes or retires. */
      const wake = (): void => {this.activityWaiters.delete(wake);resolve();};
      this.activityWaiters.add(wake);
    }).then(/** Preserve priority and captured caller freshness checks after resumption. */ () => this.checkpoint(priority));
    const now = this.pacing.now();
    this.sliceStarted ??= now;
    if (!this.idleWait && now - this.sliceStarted < policy.work) return Promise.resolve();
    if (!this.idleWait) {
      this.idleWindows++;
      this.idleWait = new Promise<void>(/** Retain only the shared idle completion until resume or close. */
        resolve => { this.releaseIdle = resolve; });
      const idle = this.idleWait;
      /** A retired wait can never settle a newer idle window through a queued host callback. */
      const complete = (): void => {if (this.idleWait === idle) this.finishIdle();};
      if (this.pacing.scheduleIdle) this.cancelIdle = this.pacing.scheduleIdle(complete, policy.idle);
      else {
        const timer = this.pacing.setTimeout(complete, policy.idle);
        this.cancelIdle = () => this.pacing?.clearTimeout(timer);
      }
    }
    return this.idleWait.then(/** Foreground admission can cancel the timer; it must still preempt resumed work. */
      () => this.checkpoint(priority, admittedSave));
  }

  /** Cancel and resolve the single idle resource; caller fences remain authoritative after wakeup. */
  private finishIdle(): void {
    const cancel = this.cancelIdle;
    this.cancelIdle = undefined;
    cancel?.();
    this.sliceStarted = this.pacing?.now();
    const release = this.releaseIdle;
    this.releaseIdle = undefined;
    this.idleWait = undefined;
    release?.();
  }

  /** Only explicitly configured inactive effort restricts local view preparation. Initial startup
   * remains exempt through the host's existing foreground hint; full effort retains normal lanes. */
  private pacesInactiveView(): boolean {
    return this.pacing?.isForeground?.() === false && this.pacing.backgroundEffort !== undefined
      && sanitizeBackgroundIndexingEffort(this.pacing.backgroundEffort()) < 100;
  }

  /** Check strictly higher lanes. Policy-paused automatic owners cannot strand an admitted
   * save; mutations always preempt, and ordinary priority returns when preparation resumes. */
  private hasHigherPriority(priority: IndexWorkPriority, admittedSave = false): boolean {
    const ceiling = admittedSave && this.pacingWindow() === null
      ? Math.min(priority, this.pacesInactiveView() ? INDEX_WORK_PRIORITY.currentNode : INDEX_WORK_PRIORITY.urlInventory) : priority;
    for (let lane = 0; lane < ceiling; lane++) if (this.active[lane] > 0) return true;
    return false;
  }
}
