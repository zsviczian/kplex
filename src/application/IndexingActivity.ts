/**
 * Fixed-memory, session-only indexing observations at existing coarse work boundaries. Retains
 * numeric cells and fixed categories, never source identities or work owners. Existing counters
 * are sampled through trusted internal ports; no per-source accounting, timers or host reads live
 * here. Explicit capture builds a deeply frozen, privately branded public projection.
 */
import { SUPPORT_PHASES } from "./SessionEventRecorder";
export const ACTIVITY_KINDS = ["host-inventory", "local-maintenance", "structural", "full-build", "node-catalog", "hydration", "requested", "url-inventory", "unknown"] as const;
export const ACTIVITY_REASONS = ["startup-offline", "known-file", "known-topology", "known-resolver", "qualified-folder", "uncovered-non-file", "unscoped-resolved", "expired-resolver", "extra-resolved", "environment", "source-replaced", "cache-failure", "dependency-repair", "local-authority-unavailable", "policy-change", "manual", "unknown"] as const;
export const ACTIVITY_MILESTONES = ["onload", "settings-loaded", "layout-ready", "strict-ready", "on-demand-baseline-ready", "on-demand-center-requested", "on-demand-center-patched", "host-search-ready", "host-preview-ready", "first-requested-scope-authoritative", "url-background-start", "url-background-complete", "evidence-hydration-start", "evidence-hydration-end", "snapshot-catalog-read", "host-inventory-start", "host-inventory-end", "preview-available", "source-authority-await-ended", "requested-semantics-refresh-ended", "navigable-graph-published", "source-authority", "snapshot-complete", "snapshot-failed"] as const;
export const ACTIVITY_SOURCE_COLUMNS = ["checked", "reusedBodies", "legacyBodies", "vaultReads", "parses", "repaired", "resolutionRefreshes", "pendingMetadata", "failures"] as const;
export const ACTIVITY_SESSION_COLUMNS = ["sourceInventoryPasses", "fullBuildStarts", "nodeCatalogStarts", "completeSnapshotSaves", "checkpointSaves"] as const;
export const ACTIVITY_HEALTH_COLUMNS = ["demandedCenters", "scopeTasks", "onDemandTasks", "gateTasks", "handoverStarts", "handoverCompletions", "handoverFailures", "semanticRequested", "semanticPrepared", "semanticPublished", "semanticCancelled", "semanticPendingObservations", "fullBuildAdmissions", "urlActive", "urlProcessed", "urlTotal", "repoDeleteTask", "cacheWriterActive"] as const;
export const ACTIVITY_CURRENT_COLUMNS = ["pendingKnown", "knownImpactTasks", "sourceActive", "hydrationActive", "semanticActive", "buildBlocked", "repoWrites", "cacheWrites", "schedulerMutation", "schedulerCurrent", "schedulerVisible", "schedulerUrl", "schedulerBackground", "schedulerWaiting", ...ACTIVITY_SOURCE_COLUMNS, ...ACTIVITY_SESSION_COLUMNS, ...ACTIVITY_HEALTH_COLUMNS] as const;
export type ActivityKind = typeof ACTIVITY_KINDS[number];
export type ActivityReason = typeof ACTIVITY_REASONS[number];
export type ActivitySourceWork = Readonly<Record<typeof ACTIVITY_SOURCE_COLUMNS[number], number>>;
export type ActivitySessionWork = Readonly<Record<typeof ACTIVITY_SESSION_COLUMNS[number], number>>;
export type ActivityScope = "unknown" | "local" | "global";
export type ActivityOutcome = "complete" | "incomplete" | "cancelled" | "failed" | "superseded";

const SCOPES = ["unknown", "local", "global"] as const, OUTCOMES = ["complete", "incomplete", "cancelled", "failed", "superseded"] as const;
const HOUR = 3600000, MAX = 4294967295, ROW = 23, ACTIVE_ROW = 37, HOURS = 25, RECENT = 16;
const RECENT_OFFSET = HOURS * 12, ACTIVE_OFFSET = RECENT_OFFSET + RECENT * ROW, GLOBAL_OFFSET = ACTIVE_OFFSET + 2 * ACTIVE_ROW;
const REASONS_OFFSET = GLOBAL_OFFSET + ROW, MILESTONES_OFFSET = REASONS_OFFSET + ACTIVITY_REASONS.length;
const PHASES_OFFSET = MILESTONES_OFFSET + ACTIVITY_MILESTONES.length;
const HOUR_METRICS = [0, 7, 3, 8, 4, 9, 10, 10, 12, 11, 13, 11] as const;
export const INDEXING_ACTIVITY_CELL_CAPACITY = 1024, INDEXING_ACTIVITY_BYTE_LIMIT = 8192;
export const INDEXING_ACTIVITY_CAPTURE_ADMISSION_LIMIT = 8;
const captures = Array.from({length: INDEXING_ACTIVITY_CAPTURE_ADMISSION_LIMIT}, /** One weak key maximum per copy-boundary admission slot. */ () => new WeakSet<object>());
let captureHead = 0;
type ActivityRow = readonly (number | null)[];
export type IndexingActivityCapture = Readonly<{
  schemaVersion: 1; captureVersion: 1; status: "active" | "disposed"; ageMs: number; windowStartMs: number;
  clock: "monotonic-no-suspend-proof"; clockRegressions: number; longObservationGaps: number; saturated: boolean;
  outcomeCoverage: "complete" | "capacity-limited";
  work: "overlapping-counter-intervals"; duration: "await-inclusive-elapsed"; hoursBasis: "completion-observations";
  pendingCause: readonly (number | null)[];
  totals: readonly number[]; causes: ActivityRow; milestones: readonly (number | null)[];
  phases: Readonly<{current: readonly ActivityRow[]; counts: readonly ActivityRow[]; elapsedMs: readonly ActivityRow[]; maxMs: readonly ActivityRow[]}>;
  hours: readonly ActivityRow[]; recent: readonly ActivityRow[]; active: readonly ActivityRow[]; lastGlobal: ActivityRow | null;
  omitted: Readonly<{rotated: number; capacity: number; reportRecent: number; reportPhaseLanes: number; reportHours: number; oldHours: number}>;
  settings: Readonly<{mode: string | null; urls: string | null; pacing: string | null; build: string | null}>;
  current: readonly (number | null)[];
  columns: Readonly<{pass: readonly string[]; hour: readonly string[]; totals: readonly string[]; current: typeof ACTIVITY_CURRENT_COLUMNS;
    kinds: typeof ACTIVITY_KINDS; scopes: typeof SCOPES; outcomes: typeof OUTCOMES; causes: typeof ACTIVITY_REASONS; milestones: typeof ACTIVITY_MILESTONES; phases: typeof SUPPORT_PHASES}>;
}>;
const COLUMNS = Object.freeze({pass: Object.freeze(["kind", "scope", "startMs", "elapsedMs", "outcome", "firstCause", "selectionReason", "causeMask", ...ACTIVITY_SOURCE_COLUMNS, ...ACTIVITY_SESSION_COLUMNS, "flags"]),
  hour: Object.freeze(["hour", "localStarts", "globalStarts", "unknownStarts", "completed", "cancelled", "incompleteOrFailed", "checked", "reads", "parses", "builds", "saves"]),
  totals: Object.freeze(["starts", "complete", "incomplete", "cancelled", "failed", "superseded", "causeObservations", "unrecognized"]),
  current: Object.freeze(ACTIVITY_CURRENT_COLUMNS), kinds: Object.freeze(ACTIVITY_KINDS), scopes: Object.freeze(SCOPES), outcomes: Object.freeze(OUTCOMES),
  causes: Object.freeze(ACTIVITY_REASONS), milestones: Object.freeze(ACTIVITY_MILESTONES), phases: Object.freeze(SUPPORT_PHASES)});

/** Admit primitive numeric facts only; no coercion or arbitrary property lookup occurs. */
function count(value: unknown): number | null { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, MAX) : null; }
/** Compare fixed literal categories without touching unknown objects, proxies or coercions. */
function code<T extends string>(value: unknown, choices: readonly T[]): number { for (let index = 0; index < choices.length; index++) if (choices[index] === value) return index; return -1; }
/**
 * Admit only the latest eight captures created by this module, across recorder instances. Each
 * weak slot contains at most one DTO; replacing a slot retires its admission even if a consumer
 * retains the immutable DTO. Both synchronous exports share one current capture. This ephemeral
 * copy-boundary brand is neither persisted identity nor indexing authority. Membership checks
 * inspect no properties and remain safe for hostile/revoked proxies.
 */
export function projectIndexingActivity(value: unknown): IndexingActivityCapture | null {
  if (value === null || typeof value !== "object") return null;
  for (let index = 0; index < INDEXING_ACTIVITY_CAPTURE_ADMISSION_LIMIT; index++) if (captures[index].has(value)) return value as IndexingActivityCapture;
  return null;
}

/** Bounded coarse-boundary recorder; one injected monotonic clock is its only capability. */
export class IndexingActivity {
  private readonly cells = new Float64Array(INDEXING_ACTIVITY_CELL_CAPACITY);
  private readonly totals = new Uint32Array(8);
  private readonly tokens = [0, 0];
  private readonly phases = [-1, -1];
  private readonly phaseStarts = [0, 0];
  private origin = 0; private latest = 0; private rawLatest = 0; private hour = -1;
  private nextToken = 0; private head = 0; private size = 0; private rotated = 0; private capacity = 0;
  private firstCause = -1; private causeMask = 0; private hasGlobal = false; private disposed = false;
  private saturated = false; private regressions = 0; private gaps = 0;

  /** Establish a fresh lifetime; capture never resets it and no clock-driven work is scheduled. */
  constructor(private clock: (() => number) | undefined) {
    this.origin = this.readClock(); this.rawLatest = this.origin;
    for (let slot = 0; slot < HOURS; slot++) this.cells[slot * 12] = -1;
    this.cells.fill(-1, MILESTONES_OFFSET, MILESTONES_OFFSET + ACTIVITY_MILESTONES.length);
  }
  /** Observe an actual invalidating boundary, retaining first cause and finite coalesced categories. */
  cause(reason: ActivityReason): void {
    if (this.disposed) return;
    const at = this.activityTime(), selected = this.reason(reason);
    this.increment(this.totals, 6); this.increment(this.cells, REASONS_OFFSET + selected);
    if (this.firstCause < 0) this.firstCause = selected;
    this.causeMask |= 1 << selected;
    for (let slot = 0; slot < 2; slot++) if (this.tokens[slot]) this.cells[ACTIVE_OFFSET + slot * ACTIVE_ROW + 7] |= 1 << selected;
    this.rotate(at);
  }
  /** Copy existing trusted internal counters into one active slot; neither owner is retained. */
  begin(kind: ActivityKind, scope: ActivityScope, selectionReason: ActivityReason, source?: ActivitySourceWork, session?: ActivitySessionWork): number {
    if (this.disposed) return 0;
    const at = this.activityTime(), hour = this.rotate(at), scopeIndex = Math.max(0, code(scope, SCOPES));
    this.increment(this.totals, 0); this.increment(this.cells, hour + (scopeIndex === 1 ? 1 : scopeIndex === 2 ? 2 : 3));
    const slot = this.tokens.indexOf(0);
    if (slot < 0) { this.capacity = this.add(this.capacity, 1); return 0; }
    const offset = ACTIVE_OFFSET + slot * ACTIVE_ROW, reason = this.reason(selectionReason);
    this.cells.fill(0, offset, offset + ACTIVE_ROW);
    const kindIndex = code(kind, ACTIVITY_KINDS);
    this.cells[offset] = kindIndex < 0 ? ACTIVITY_KINDS.length - 1 : kindIndex; this.cells[offset + 1] = scopeIndex;
    this.cells[offset + 2] = at; this.cells[offset + 4] = -1;
    this.cells[offset + 5] = this.firstCause < 0 ? reason : this.firstCause; this.cells[offset + 6] = reason;
    this.cells[offset + 7] = this.causeMask | 1 << reason;
    for (let index = 0; index < 14; index++) { this.cells[offset + 8 + index] = -1; this.cells[offset + ROW + index] = this.counter(index, source, session); }
    this.firstCause = -1; this.causeMask = 0;
    this.tokens[slot] = ++this.nextToken;
    return this.tokens[slot];
  }
  /** End exactly one captured pass; whole-interval deltas are not exclusive CPU/work attribution. */
  end(token: number, outcome: ActivityOutcome, source?: ActivitySourceWork, session?: ActivitySessionWork): void {
    if (this.disposed || token === 0) return;
    const slot = this.tokens.indexOf(token); if (slot < 0) return;
    const at = this.activityTime(), hour = this.rotate(at), offset = ACTIVE_OFFSET + slot * ACTIVE_ROW;
    const outcomeIndex = code(outcome, OUTCOMES); if (outcomeIndex < 0) return;
    // Source passes and hydration already own these phase lifetimes. Reuse this boundary's
    // timestamp so a cancelled/incomplete pass cannot accrue idle time or read another clock.
    if (this.cells[offset] === 0 || this.cells[offset] === 1) this.closePhase(0, at);
    else if (this.cells[offset] === 5) this.closePhase(1, at);
    this.increment(this.totals, 1 + outcomeIndex);
    this.increment(this.cells, hour + (outcomeIndex === 0 ? 4 : outcomeIndex === 2 || outcomeIndex === 4 ? 5 : 6));
    this.cells[offset + 3] = this.add(0, at - this.cells[offset + 2]); this.cells[offset + 4] = outcomeIndex;
    for (let index = 0; index < 14; index++) {
      const previous = this.cells[offset + ROW + index], current = this.counter(index, source, session);
      this.cells[offset + 8 + index] = previous < 0 || current < previous ? -1 : this.add(0, current - previous);
      if (current >= 0 && previous >= 0 && current < previous) this.cells[offset + 22] |= 1;
    }
    for (let index = 0; index < HOUR_METRICS.length; index += 2) {
      const metric = HOUR_METRICS[index], destination = HOUR_METRICS[index + 1];
      const delta = this.cells[offset + 8 + metric]; if (delta >= 0) this.increment(this.cells, hour + destination, delta);
    }
    if (this.size === RECENT) { this.head = (this.head + 1) % RECENT; this.rotated = this.add(this.rotated, 1); } else this.size++;
    this.copy(offset, RECENT_OFFSET + (this.head + this.size - 1) % RECENT * ROW);
    if (this.cells[offset + 1] === 2) { this.copy(offset, GLOBAL_OFFSET); this.hasGlobal = true; }
    this.tokens[slot] = 0;
  }
  /** Retain only the first occurrence of a known startup boundary, without detailed profiling. */
  mark(milestone: unknown): void {
    if (this.disposed) return;
    const index = code(milestone, ACTIVITY_MILESTONES); if (index < 0 || this.cells[MILESTONES_OFFSET + index] >= 0) return;
    const at = this.activityTime(); this.rotate(at);
    if (this.cells[MILESTONES_OFFSET + index] < 0) this.cells[MILESTONES_OFFSET + index] = at;
  }
  /** Count existing coarse phase transitions only; completed-source progress stays in its owner. */
  phase(lane: "source" | "hydration", phase: unknown): void {
    if (this.disposed) return;
    const laneIndex = lane === "source" ? 0 : lane === "hydration" ? 1 : -1, phaseIndex = code(phase, SUPPORT_PHASES);
    if (laneIndex < 0 || phaseIndex < 0) return;
    const at = this.activityTime(); this.rotate(at);
    this.closePhase(laneIndex, at);
    this.phases[laneIndex] = phase === "complete" || phase === "failed" || phase === "cancelled" || phase === "timed-out" || phase === "ready" || phase === "idle" ? -1 : phaseIndex;
    this.phaseStarts[laneIndex] = at;
    this.increment(this.cells, PHASES_OFFSET + laneIndex * SUPPORT_PHASES.length + phaseIndex);
  }
  /** Close a real coarse pass boundary without inventing a terminal phase/count or idle duration. */
  stopPhase(lane: "source" | "hydration"): void {
    if (this.disposed) return;
    const laneIndex = lane === "source" ? 0 : lane === "hydration" ? 1 : -1;
    if (laneIndex < 0 || this.phases[laneIndex] < 0) return;
    const at = this.activityTime(); this.rotate(at); this.closePhase(laneIndex, at);
  }
  /** Capture pure detached public data; unknown scalar arguments are never inspected/coerced.
   * Hours are projected at copy time without rotating or changing retained observations. */
  capture(mode?: unknown, urls?: unknown, pacing?: unknown, build?: unknown, ...current: unknown[]): IndexingActivityCapture {
    const at = Math.max(this.latest, Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(this.readClock() - this.origin))));
    const currentHour = Math.floor(at / HOUR), hours: ActivityRow[] = [], recent: ActivityRow[] = [], active: ActivityRow[] = [];
    for (let index = Math.max(0, currentHour - 24); index <= currentHour; index++) {
      const offset = index % HOURS * 12;
      hours.push(this.cells[offset] === index ? this.row(offset, 12) : Object.freeze([index, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    }
    for (let index = 0; index < this.size; index++) recent.push(this.row(RECENT_OFFSET + (this.head + index) % RECENT * ROW, ROW));
    for (let slot = 0; slot < 2; slot++) if (this.tokens[slot]) {
      const row = [...this.row(ACTIVE_OFFSET + slot * ACTIVE_ROW, ROW)]; row[3] = Math.min(MAX, at - (row[2] ?? at)); active.push(Object.freeze(row));
    }
    const phaseCounts = [this.row(PHASES_OFFSET, SUPPORT_PHASES.length), this.row(PHASES_OFFSET + SUPPORT_PHASES.length, SUPPORT_PHASES.length)];
    const phaseElapsed = [this.row(PHASES_OFFSET + 2 * SUPPORT_PHASES.length, SUPPORT_PHASES.length), this.row(PHASES_OFFSET + 3 * SUPPORT_PHASES.length, SUPPORT_PHASES.length)];
    const phaseMax = [this.row(PHASES_OFFSET + 4 * SUPPORT_PHASES.length, SUPPORT_PHASES.length), this.row(PHASES_OFFSET + 5 * SUPPORT_PHASES.length, SUPPORT_PHASES.length)];
    const report = {schemaVersion: 1 as const, captureVersion: 1 as const, status: this.disposed ? "disposed" as const : "active" as const,
      ageMs: at, windowStartMs: Math.max(0, (currentHour - 24) * HOUR), clock: "monotonic-no-suspend-proof" as const,
      clockRegressions: this.regressions, longObservationGaps: this.gaps, saturated: this.saturated || current.some(/** Capture-only primitive range check does not mutate saturation state. */ value => typeof value === "number" && Number.isSafeInteger(value) && value > MAX),
      outcomeCoverage: this.capacity ? "capacity-limited" as const : "complete" as const,
      work: "overlapping-counter-intervals" as const, duration: "await-inclusive-elapsed" as const, hoursBasis: "completion-observations" as const,
      pendingCause: Object.freeze([this.firstCause < 0 ? null : this.firstCause, this.causeMask]),
      totals: Object.freeze([...this.totals]), causes: this.row(REASONS_OFFSET, ACTIVITY_REASONS.length), milestones: this.row(MILESTONES_OFFSET, ACTIVITY_MILESTONES.length),
      phases: Object.freeze({current: Object.freeze(this.phases.map(/** Open phase duration is separate from completed interval aggregates. */ (value, lane) => Object.freeze([value < 0 ? null : value, value < 0 ? null : Math.min(MAX, at - this.phaseStarts[lane])]))), counts: phaseCounts, elapsedMs: phaseElapsed, maxMs: phaseMax}),
      hours, recent, active: Object.freeze(active), lastGlobal: this.hasGlobal ? this.row(GLOBAL_OFFSET, ROW) : null,
      omitted: {rotated: this.rotated, capacity: this.capacity, reportRecent: 0, reportPhaseLanes: 0, reportHours: 0, oldHours: Math.max(0, currentHour - 24)},
      settings: Object.freeze({mode: code(mode, ["eager", "on-demand"]) < 0 ? null : mode as string,
        urls: code(urls, ["on-demand", "background"]) < 0 ? null : urls as string,
        pacing: code(pacing, ["responsive", "balanced", "faster"]) < 0 ? null : pacing as string,
        build: typeof build === "string" && (build === "source-archive" || /^\d{1,5}\.\d{1,5}\.\d{1,5}(?:-(?:alpha|beta|rc)\.\d{1,5})?(?:\+(?:[a-f0-9]{12}(?:\.dirty)?|source-archive))?$/.test(build)) ? build : null}),
      current: Object.freeze(ACTIVITY_CURRENT_COLUMNS.map(/** Read the function-owned rest array, never caller collections. */ (_, index) => count(current[index]))), columns: COLUMNS};
    while (JSON.stringify(report).length > INDEXING_ACTIVITY_BYTE_LIMIT && recent.length) { recent.shift(); report.omitted.reportRecent++; }
    if (JSON.stringify(report).length > INDEXING_ACTIVITY_BYTE_LIMIT) { phaseCounts.length = 0; phaseElapsed.length = 0; phaseMax.length = 0; report.omitted.reportPhaseLanes = 2; }
    while (JSON.stringify(report).length > INDEXING_ACTIVITY_BYTE_LIMIT && hours.length > 1) { hours.shift(); report.omitted.reportHours++; }
    Object.freeze(phaseCounts); Object.freeze(phaseElapsed); Object.freeze(phaseMax); Object.freeze(hours);
    Object.freeze(recent); Object.freeze(report.omitted); Object.freeze(report);
    const admission = new WeakSet<object>(); admission.add(report); captures[captureHead] = admission;
    captureHead = (captureHead + 1) % INDEXING_ACTIVITY_CAPTURE_ADMISSION_LIMIT;
    return report;
  }
  /** Permanently retire this recorder and release every retained observation/token. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.clock = undefined; this.cells.fill(0); this.totals.fill(0); this.tokens.fill(0); this.phases.fill(-1); this.phaseStarts.fill(0);
    this.size = 0; this.head = 0; this.hasGlobal = false; this.firstCause = -1; this.causeMask = 0;
    this.cells.fill(-1, MILESTONES_OFFSET, MILESTONES_OFFSET + ACTIVITY_MILESTONES.length);
    for (let slot = 0; slot < HOURS; slot++) this.cells[slot * 12] = -1;
  }
  /** Admit a fixed reason and account for malformed runtime strings without retaining them. */
  private reason(reason: unknown): number {
    const index = code(reason, ACTIVITY_REASONS);
    if (index >= 0) return index;
    this.increment(this.totals, 7); return ACTIVITY_REASONS.length - 1;
  }
  /** Add only the completed phase interval; separate lanes may overlap in elapsed wall time. */
  private closePhase(lane: number, at: number): void {
    const previous = this.phases[lane]; if (previous < 0) return;
    const duration = this.add(0, at - this.phaseStarts[lane]);
    this.increment(this.cells, PHASES_OFFSET + 2 * SUPPORT_PHASES.length + lane * SUPPORT_PHASES.length + previous, duration);
    const maximum = PHASES_OFFSET + 4 * SUPPORT_PHASES.length + lane * SUPPORT_PHASES.length + previous;
    this.cells[maximum] = Math.max(this.cells[maximum], duration); this.phases[lane] = -1;
  }
  /** Read only trusted internal numeric counters; never retain their owner or raw failures. */
  private counter(index: number, source?: ActivitySourceWork, session?: ActivitySessionWork): number {
    try {
      const value = index < 9 ? source?.[ACTIVITY_SOURCE_COLUMNS[index]] : session?.[ACTIVITY_SESSION_COLUMNS[index - 9]];
      if (typeof value === "number" && value > MAX) { this.saturated = true; return -1; }
      return count(value) ?? -1;
    }
    catch { return -1; }
  }
  /** Read the injected clock defensively without preserving exception objects. */
  private readClock(): number {
    try { const value = this.clock?.(); return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : this.rawLatest; }
    catch { return this.rawLatest; }
  }
  /** Clock metadata changes only on real observed activity, never on copy or idle timers. */
  private activityTime(): number {
    const raw = this.readClock(); if (raw < this.rawLatest) this.regressions = this.add(this.regressions, 1);
    if (raw - this.rawLatest > HOUR) this.gaps = this.add(this.gaps, 1);
    this.rawLatest = raw; this.latest = Math.max(this.latest, Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(raw - this.origin)))); return this.latest;
  }
  /** Rotate at most 25 fixed slots, including a long idle jump; no synthetic hourly work occurs. */
  private rotate(at: number): number {
    const current = Math.floor(at / HOUR);
    if (current !== this.hour) {
      for (let slot = 0; slot < HOURS; slot++) if (this.cells[slot * 12] < current - 24) this.cells.fill(0, slot * 12, slot * 12 + 12);
      const offset = current % HOURS * 12; if (this.cells[offset] !== current) { this.cells.fill(0, offset, offset + 12); this.cells[offset] = current; }
      this.hour = current;
    }
    return current % HOURS * 12;
  }
  /** Saturate rather than wrap counters; a single flag makes the lost precision explicit. */
  private add(value: number, amount: number): number { const result = value + amount; if (result > MAX) { this.saturated = true; return MAX; } return result; }
  /** Update one fixed numeric slot without allocating event objects. */
  private increment(target: Float64Array | Uint32Array, index: number, amount = 1): void { target[index] = this.add(target[index], amount); }
  /** Copy one fixed completed row without retaining a view or temporary object. */
  private copy(source: number, destination: number): void { for (let index = 0; index < ROW; index++) this.cells[destination + index] = this.cells[source + index]; }
  /** Convert sentinel unknown values to null only during explicit report construction. */
  private row(offset: number, length: number): ActivityRow {
    return Object.freeze(Array.from({length}, /** Numeric sentinel cannot become a false zero. */ (_, index) => this.cells[offset + index] < 0 ? null : this.cells[offset + index]));
  }
}
