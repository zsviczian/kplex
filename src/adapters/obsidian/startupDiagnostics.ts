/**
 * Passive, session-only startup measurements at existing Obsidian orchestration boundaries.
 * Phase progress is always available; detailed timing and owner overlap tracking require the native
 * test opt-in before plugin enable. No timers, I/O, authority decisions or work scheduling live here.
 * Owner identities remain private and are discarded when strict readiness freezes detailed timings.
 * Fixed-size aggregate work counters continue through readiness until unload, independently of opt-in.
 * A separate fixed-memory activity owner observes coarse boundaries through the entire lifetime;
 * report capture is passive and neither per-file method adds activity instrumentation.
 */
import { IndexingActivity, ACTIVITY_CURRENT_COLUMNS, ACTIVITY_SESSION_COLUMNS, type ActivityKind, type ActivityOutcome, type ActivityReason,
  type ActivityScope, type ActivitySourceWork, type IndexingActivityCapture } from "../../application/IndexingActivity";
export type StartupLane = "source" | "hydration";
export type StartupProgress = { phase: string; pass: number; processed: number; total: number | null };
/** Constant-size lifetime counters; starts include cancelled work, saves require pointer activation. */
type StartupSessionWork = { sourceInventoryPasses: number; fullBuildStarts: number; nodeCatalogStarts: number;
  completeSnapshotSaves: number; checkpointSaves: number };
type Phase = StartupProgress & { lane: StartupLane; startedMs: number; endedMs: number | null; counters: Record<string, number>; uniqueOwners: number };

/** Records bounded phase boundaries without changing the production startup sequence. */
export class StartupDiagnostics {
  private activity: IndexingActivity | null = null;
  private enabled = false;
  private startedAt = 0;
  private frozen = false;
  private disposed = false;
  private sessionWork: StartupSessionWork = { sourceInventoryPasses: 0, fullBuildStarts: 0, nodeCatalogStarts: 0,
    completeSnapshotSaves: 0, checkpointSaves: 0 };
  private phases: Phase[] = [];
  private active = new Map<StartupLane, Phase>();
  private passes = new Map<string, number>();
  private owners = new Map<Phase, Set<string>>();
  private milestones: Record<string, number> = {};
  private overlaps: { first: string; second: string; owners: number }[] = [];

  /** Inject a monotonic clock for bounded lifecycle tests; production owns no diagnostic timer. */
  constructor(private readonly clock: () => number = () => window.performance.now()) {}

  /** Start one plugin lifetime; only an explicit maintenance opt-in retains detailed measurements. */
  begin(enabled: boolean): void {
    this.enabled = enabled;
    this.startedAt = this.clock();
    try { this.activity?.dispose(); this.activity = new IndexingActivity(this.clock); }
    catch { this.activity = null; }
    this.mark("onload");
  }
  /** Record a first occurrence relative to onload, never a wall-clock or paint claim. */
  mark(name: string): void {
    // This legacy detailed marker lives inside the bounded per-file patch loop. Do not forward
    // it to default accounting; requested-scope publication has its own coarse milestone.
    if (name !== "on-demand-center-patched") {
      try { this.activity?.mark(name); } catch { /* Optional accounting never changes indexing. */ }
    }
    if (this.enabled && !this.frozen && this.milestones[name] === undefined) this.milestones[name] = window.performance.now() - this.startedAt;
  }
  /** Close the preceding activity and count its actual pass, including retries without timing opt-in. */
  phase(lane: StartupLane, phase: string, total: number | null = null): void {
    try { this.activity?.phase(lane, phase); } catch { /* Detailed profiling and work retain their own lifetimes. */ }
    if (this.frozen) return;
    const now = this.enabled ? window.performance.now() - this.startedAt : 0;
    const previous = this.active.get(lane);
    if (previous) previous.endedMs = now;
    const key = `${lane}:${phase}`;
    const pass = (this.passes.get(key) ?? 0) + 1;
    // Production uses a finite phase vocabulary; bound unexpected diagnostic labels as well.
    if (this.passes.has(key) || this.passes.size < 128) this.passes.set(key, pass);
    const row: Phase = { lane, phase, pass, total, processed: 0, startedMs: now, endedMs: null, counters: {}, uniqueOwners: 0 };
    this.active.set(lane, row);
    if (this.enabled && this.phases.length < 128) this.phases.push(row);
  }
  /** Advance completed work; optional identities measure overlap without exporting vault paths. */
  processed(lane: StartupLane, owner?: string): void {
    if (this.frozen) return;
    const row = this.active.get(lane);
    if (!row) return;
    row.processed++;
    if (this.enabled && owner !== undefined) {
      let set = this.owners.get(row);
      if (!set) { set = new Set(); this.owners.set(row, set); }
      set.add(owner);
      row.uniqueOwners = set.size;
    }
  }
  /** Count an observed operation in its current lane; counters do not grant validation authority. */
  count(lane: StartupLane, name: string, amount = 1): void {
    const row = this.active.get(lane);
    if (this.enabled && !this.frozen && row) row.counters[name] = (row.counters[name] ?? 0) + amount;
  }
  /** Return O(1) actual progress for presentation and native counter attribution. */
  progress(lane: StartupLane): StartupProgress | null {
    const row = this.active.get(lane);
    return row ? { phase: row.phase, pass: row.pass, processed: row.processed, total: row.total } : null;
  }
  /** Count an actual existing work boundary, including work after readiness; never retain owners. */
  recordWork(kind: keyof StartupSessionWork): void {
    if (!this.disposed) this.sessionWork[kind] = Math.min(Number.MAX_SAFE_INTEGER, this.sessionWork[kind] + 1);
  }
  /** Observe only an actual coarse invalidation; source/file loops never call this owner. */
  activityCause(reason: ActivityReason): void {
    try { this.activity?.cause(reason); } catch { /* Accounting failure cannot widen or admit work. */ }
  }
  /** Capture trusted existing counters at an actual pass boundary without copying owners. */
  beginActivity(kind: ActivityKind, scope: ActivityScope, reason: ActivityReason, source?: ActivitySourceWork): number {
    try { return this.activity?.begin(kind, scope, reason, source, this.sessionWork) ?? 0; }
    catch { return 0; }
  }
  /** Close exactly the observed pass; its result is never used as source authority. */
  endActivity(token: number, outcome: ActivityOutcome, source?: ActivitySourceWork): void {
    try { this.activity?.end(token, outcome, source, this.sessionWork); } catch { /* Preserve the work owner's outcome. */ }
  }
  /** Close a real lane boundary even when bounded pass detail was omitted; closed lanes read no clock. */
  stopActivityPhase(lane: StartupLane): void {
    try { this.activity?.stopPhase(lane); } catch { /* Observation cannot change an actual pass result. */ }
  }
  /** Build an owned safe summary only on explicit report capture; unknown facts remain unavailable. */
  captureActivity(mode?: unknown, urls?: unknown, pacing?: unknown, build?: unknown, ...current: unknown[]): IndexingActivityCapture | null {
    try {
      if (!this.activity) return null;
      for (const name of ACTIVITY_SESSION_COLUMNS) current[ACTIVITY_CURRENT_COLUMNS.indexOf(name)] = this.sessionWork[name];
      return this.activity.capture(mode, urls, pacing, build, ...current);
    }
    catch { return null; }
  }
  /** Freeze the measured lifetime and release all private owner identities on strict readiness. */
  finish(): void {
    try { this.activity?.mark("strict-ready"); } catch { /* Readiness is established by the caller, not this observation. */ }
    if (!this.enabled || this.frozen) return;
    this.mark("strict-ready");
    const now = window.performance.now() - this.startedAt;
    for (const row of this.active.values()) if (row.endedMs === null) row.endedMs = now;
    const entries = [...this.owners];
    for (let a = 0; a < entries.length; a++) for (let b = a + 1; b < entries.length; b++) {
      const [first, left] = entries[a], [second, right] = entries[b];
      let owners = 0;
      for (const owner of left) if (right.has(owner)) owners++;
      this.overlaps.push({ first: first.phase, second: second.phase, owners });
    }
    this.owners.clear();
    this.frozen = true;
  }
  /** Release private owner identities on unload without claiming strict readiness. */
  dispose(): void {
    this.activity?.dispose(); this.activity = null;
    this.owners.clear();
    this.frozen = true;
    this.disposed = true;
  }
  /** Export aggregate copies only; frozen startup timings and ongoing session work have distinct lifetimes. */
  snapshot(): { startedAtMs: number; enabled: boolean; frozen: boolean; sessionWork: StartupSessionWork;
    milestones: Record<string, number>; phases: Phase[]; overlaps: typeof this.overlaps } {
    return { startedAtMs: this.startedAt, enabled: this.enabled, frozen: this.frozen, milestones: { ...this.milestones },
      sessionWork: { ...this.sessionWork },
      phases: this.phases.map(row => ({ ...row, counters: { ...row.counters } })), overlaps: this.overlaps.map(row => ({ ...row })) };
  }
}
