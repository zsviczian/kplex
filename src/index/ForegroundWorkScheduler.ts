/**
 * Cooperative priority boundary owned by the existing GraphIndex lifecycle. Work retains its private
 * progress while higher-priority requests run. Injected host capabilities pace background lanes with
 * shared idle windows; this owner cancels those timers on foreground admission and unload. Publication
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
  /** Independent web-link owner inventory and compact cache restore. */
  urlInventory: 3,
  /** Whole-graph hydration/indexing, source vocabulary and disposable-cache maintenance. */
  background: 4,
} as const;
export type IndexWorkPriority = typeof INDEX_WORK_PRIORITY[keyof typeof INDEX_WORK_PRIORITY];

/** Persisted scheduling preference; this never changes relationship or cache compatibility. */
export type IndexingThrottle = "responsive" | "balanced" | "faster";

/** Normalize persisted or live preferences to the responsiveness-favoring default. */
export function sanitizeIndexingThrottle(value: unknown): IndexingThrottle {
  return value === "balanced" || value === "faster" ? value : "responsive";
}

/** Narrow host capabilities keep timing deterministic in tests and independent of window globals. */
export interface IndexWorkPacing {
  now: () => number;
  setTimeout: (callback: () => void, milliseconds: number) => number;
  clearTimeout: (timer: number) => void;
  throttle: () => unknown;
}

const PACING_WINDOWS: Record<IndexingThrottle, { work: number; idle: number }> = {
  responsive: { work: 6, idle: 24 },
  balanced: { work: 12, idle: 12 },
  faster: { work: 24, idle: 4 },
};

/** Priority accounting for mutations, navigation, visible changes, indexing and maintenance. */
export class ForegroundWorkScheduler {
  private readonly active = [0, 0, 0, 0, 0];
  private readonly waiters = new Set<() => void>();
  private closed = false;
  private pauses = 0;
  private readonly pausesByLane = [0, 0, 0, 0, 0];
  private sliceStarted: number | undefined;
  private idleTimer: number | undefined;
  private idleWait: Promise<void> | undefined;
  private releaseIdle: (() => void) | undefined;
  private idleWindows = 0;

  /** Hosts inject pacing; capability-free callers retain the existing priority-only contract. */
  constructor(private readonly pacing?: IndexWorkPacing) {}

  /** Retain one request until its idempotent release; higher-priority work never joins this owner. */
  begin(priority: IndexWorkPriority): () => void {
    if (this.closed) return () => undefined;
    this.active[priority]++;
    if (priority < INDEX_WORK_PRIORITY.urlInventory) this.finishIdle();
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
    const release = this.begin(priority);
    try { return await work(); } finally { release(); }
  }

  /** Pause behind higher lanes and pace P3/P4 together, without delaying foreground checkpoints. */
  checkpoint(priority: IndexWorkPriority = INDEX_WORK_PRIORITY.background): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (!this.hasHigherPriority(priority)) return this.pacedCheckpoint(priority);
    this.pauses++;
    this.pausesByLane[priority]++;
    const wait = new Promise<void>((resolve) => {
      /** Recheck after every release because another foreground request may still own its lane. */
      const wake = (): void => {
        if (!this.closed && this.hasHigherPriority(priority)) return;
        this.waiters.delete(wake);
        resolve();
      };
      this.waiters.add(wake);
      wake();
    });
    return this.pacing ? wait.then(/** Recheck priority and live pacing after the request releases. */
      () => this.checkpoint(priority)) : wait;
  }

  /** Aggregate-only diagnostics expose scheduling activity without retaining request identities. */
  diagnostics(): Readonly<{ active: readonly number[]; waiting: number; pauses: number; pausesByLane: readonly number[];
    idleWindows: number; pacing: boolean; throttle: IndexingThrottle | null }> {
    return { active: [...this.active], waiting: this.waiters.size, pauses: this.pauses, pausesByLane: [...this.pausesByLane],
      idleWindows: this.idleWindows, pacing: this.idleWait !== undefined,
      throttle: this.pacing ? sanitizeIndexingThrottle(this.pacing.throttle()) : null };
  }

  /** Unload releases every paused continuation; the caller's lifetime fence rejects late work. */
  close(): void {
    this.closed = true;
    this.finishIdle();
    for (const wake of this.waiters) wake();
  }

  /** Reuse one background idle window so concurrent inventories cannot create independent budgets. */
  private pacedCheckpoint(priority: IndexWorkPriority): Promise<void> {
    if (!this.pacing || priority < INDEX_WORK_PRIORITY.urlInventory) return Promise.resolve();
    const now = this.pacing.now();
    this.sliceStarted ??= now;
    const policy = PACING_WINDOWS[sanitizeIndexingThrottle(this.pacing.throttle())];
    if (!this.idleWait && now - this.sliceStarted < policy.work) return Promise.resolve();
    if (!this.idleWait) {
      this.idleWindows++;
      this.idleWait = new Promise<void>(/** Retain only the shared idle completion until resume or close. */
        resolve => { this.releaseIdle = resolve; });
      this.idleTimer = this.pacing.setTimeout(/** Start a fresh bounded work window after host idle time. */
        () => this.finishIdle(), policy.idle);
    }
    return this.idleWait.then(/** Foreground admission can cancel the timer; it must still preempt resumed work. */
      () => this.checkpoint(priority));
  }

  /** Cancel and resolve the single idle resource; caller fences remain authoritative after wakeup. */
  private finishIdle(): void {
    if (this.idleTimer !== undefined) this.pacing?.clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    this.sliceStarted = this.pacing?.now();
    const release = this.releaseIdle;
    this.releaseIdle = undefined;
    this.idleWait = undefined;
    release?.();
  }

  /** Check only strictly higher lanes so a request can never wait for itself. */
  private hasHigherPriority(priority: IndexWorkPriority): boolean {
    for (let lane = 0; lane < priority; lane++) if (this.active[lane] > 0) return true;
    return false;
  }
}
