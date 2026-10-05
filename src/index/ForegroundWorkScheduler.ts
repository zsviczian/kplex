/**
 * Cooperative priority boundary owned by the existing GraphIndex lifecycle. Work retains its private
 * progress while higher-priority requests run; no publication, cancellation or timer policy lives here.
 * Foreground callers never wait for background owners, and checkpoints run outside IDB transactions.
 */
export type IndexWorkPriority = 0 | 1 | 2 | 3 | 4;

/** Priority accounting for mutations, navigation, visible changes, indexing and maintenance. */
export class ForegroundWorkScheduler {
  private readonly active = [0, 0, 0, 0, 0];
  private readonly waiters = new Set<() => void>();
  private closed = false;
  private pauses = 0;

  /** Retain one request until its idempotent release; higher-priority work never joins this owner. */
  begin(priority: IndexWorkPriority): () => void {
    if (this.closed) return () => undefined;
    this.active[priority]++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active[priority]--;
      for (const wake of this.waiters) wake();
    };
  }

  /** Run an actual foreground operation with exception-safe ownership; nested work is not serialized. */
  async run<T>(priority: IndexWorkPriority, work: () => Promise<T>): Promise<T> {
    const release = this.begin(priority);
    try { return await work(); } finally { release(); }
  }

  /** Pause at a safe boundary until higher-priority owners finish, or lifecycle cleanup wakes it. */
  checkpoint(priority: IndexWorkPriority = 3): Promise<void> {
    if (!this.hasHigherPriority(priority) || this.closed) return Promise.resolve();
    this.pauses++;
    return new Promise<void>((resolve) => {
      /** Recheck after every release because another foreground request may still own its lane. */
      const wake = (): void => {
        if (!this.closed && this.hasHigherPriority(priority)) return;
        this.waiters.delete(wake);
        resolve();
      };
      this.waiters.add(wake);
      wake();
    });
  }

  /** Aggregate-only diagnostics expose scheduling activity without retaining request identities. */
  diagnostics(): Readonly<{ active: readonly number[]; waiting: number; pauses: number }> {
    return { active: [...this.active], waiting: this.waiters.size, pauses: this.pauses };
  }

  /** Unload releases every paused continuation; the caller's lifetime fence rejects late work. */
  close(): void {
    this.closed = true;
    for (const wake of this.waiters) wake();
  }

  /** Check only strictly higher lanes so a request can never wait for itself. */
  private hasHigherPriority(priority: IndexWorkPriority): boolean {
    for (let lane = 0; lane < priority; lane++) if (this.active[lane] > 0) return true;
    return false;
  }
}
