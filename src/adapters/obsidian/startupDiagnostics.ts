/**
 * Passive, session-only startup measurements at existing Obsidian orchestration boundaries.
 * Phase progress is always available; detailed timing and owner overlap tracking require the native
 * test opt-in before plugin enable. No timers, I/O, authority decisions or work scheduling live here.
 * Owner identities remain private and are discarded when strict readiness freezes the report.
 */
export type StartupLane = "source" | "hydration";
export type StartupProgress = { phase: string; processed: number; total: number | null };
type Phase = StartupProgress & { lane: StartupLane; startedMs: number; endedMs: number | null; counters: Record<string, number>; uniqueOwners: number };

/** Records bounded phase boundaries without changing the production startup sequence. */
export class StartupDiagnostics {
  private enabled = false;
  private startedAt = 0;
  private frozen = false;
  private phases: Phase[] = [];
  private active = new Map<StartupLane, Phase>();
  private owners = new Map<Phase, Set<string>>();
  private milestones: Record<string, number> = {};
  private overlaps: { first: string; second: string; owners: number }[] = [];

  /** Start one plugin lifetime; only an explicit maintenance opt-in retains detailed measurements. */
  begin(enabled: boolean): void {
    this.enabled = enabled;
    this.startedAt = window.performance.now();
    this.mark("onload");
  }
  /** Record a first occurrence relative to onload, never a wall-clock or paint claim. */
  mark(name: string): void {
    if (this.enabled && !this.frozen && this.milestones[name] === undefined) this.milestones[name] = window.performance.now() - this.startedAt;
  }
  /** Close a lane's preceding phase and start actual work, with an optional real denominator. */
  phase(lane: StartupLane, phase: string, total: number | null = null): void {
    if (this.frozen) return;
    const now = this.enabled ? window.performance.now() - this.startedAt : 0;
    const previous = this.active.get(lane);
    if (previous) previous.endedMs = now;
    const row: Phase = { lane, phase, total, processed: 0, startedMs: now, endedMs: null, counters: {}, uniqueOwners: 0 };
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
    return row ? { phase: row.phase, processed: row.processed, total: row.total } : null;
  }
  /** Freeze the measured lifetime and release all private owner identities on strict readiness. */
  finish(): void {
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
    this.owners.clear();
    this.frozen = true;
  }
  /** Export aggregate copies only; overlapping lanes must not be summed as wall-clock time. */
  snapshot(): { startedAtMs: number; enabled: boolean; frozen: boolean; milestones: Record<string, number>; phases: Phase[]; overlaps: typeof this.overlaps } {
    return { startedAtMs: this.startedAt, enabled: this.enabled, frozen: this.frozen, milestones: { ...this.milestones },
      phases: this.phases.map(row => ({ ...row, counters: { ...row.counters } })), overlaps: this.overlaps.map(row => ({ ...row })) };
  }
}
