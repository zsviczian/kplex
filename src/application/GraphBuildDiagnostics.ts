/** Session-local receipts for actual full-graph builds. No caller identities or native data are retained. */
import type { ActivityOutcome } from "./IndexingActivity";

export const GRAPH_BUILD_LIMIT = 6;
export const GRAPH_BUILD_TRIGGERS = ["direct", "manual", "user-request", "settings", "interval", "coalesced-backlog",
  "view-open", "view-visible", "metadata:changed", "vault:create", "vault:create-markdown", "vault:delete",
  "vault:delete-folder-failed", "vault:rename-folder", "vault:rename-folder-failed", "kplex:create-during-rebuild",
  "startup:initial-index", "startup:no-snapshot", "startup:stale-snapshot", "startup:partial-restore-incomplete",
  "startup:post-initial-backlog", "startup:source-adoption", "unknown"] as const;
export const GRAPH_BUILD_PHASES = ["structure", "host-links", "foreground-preview", "body-prewarm", "notes", "verify-structure",
  "relationships", "bind-graph", "presentation", "publication"] as const;
export const GRAPH_BUILD_FAILURES = ["compiler-incomplete", "presentation-incomplete", "presentation-changed", "semantic-policy-changed", "exception"] as const;
export const GRAPH_BUILD_CANCELLATIONS = ["folder-create", "attachment-create", "folder-delete", "folder-rename", "view-closed", "view-hidden",
  "semantic-policy-changed", "cache-purge", "placeholder-materialized", "unload", "unspecified"] as const;

type Trigger = typeof GRAPH_BUILD_TRIGGERS[number];
export type GraphBuildPhase = typeof GRAPH_BUILD_PHASES[number];
export type GraphBuildFailure = typeof GRAPH_BUILD_FAILURES[number];
export type GraphBuildCancellation = typeof GRAPH_BUILD_CANCELLATIONS[number];
export type GraphBuildRequest = Readonly<{trigger: string; backlog?: readonly string[]; pendingMarkdown?: number; escalatedFromPatch?: boolean}>;
function trigger(value: unknown): Trigger {
  return GRAPH_BUILD_TRIGGERS.find(code => code === value) ?? "unknown";
}

type Receipt = {
  mode: "atomic" | "progressive";
  trigger: Trigger;
  backlog: Trigger[];
  pendingMarkdown: number | null;
  escalatedFromPatch: boolean;
  hadCompleteGraph: boolean;
  sourcePreparationActiveAtStart: boolean;
  sourceAuthorityReadyAtStart: boolean;
  inventoryPauseRequested: boolean;
  startMs: number;
  elapsedMs: number;
  phase: GraphBuildPhase;
  phaseMs: Partial<Record<GraphBuildPhase, number>>;
  processedNotes: number | null;
  totalNotes: number | null;
  outcome: ActivityOutcome | "running";
  failure: GraphBuildFailure | null;
  cancelledBy: GraphBuildCancellation | null;
  sourceChanged: boolean | null;
  topologyChanged: boolean | null;
};

/** One actual full builder owns the active slot. Phase timing is elapsed, including yields and waits. */
export class GraphBuildDiagnostics {
  private readonly recent: Receipt[] = [];
  private active: Receipt | null = null;
  private phaseStarted = 0;
  private omitted = 0;

  constructor(private readonly now: () => number) {}

  begin(mode: Receipt["mode"], request: GraphBuildRequest | undefined,
    context: Pick<Receipt, "hadCompleteGraph" | "sourcePreparationActiveAtStart" | "sourceAuthorityReadyAtStart" | "inventoryPauseRequested">): void {
    const at = this.now();
    this.active = {mode, trigger: trigger(request?.trigger ?? "direct"), backlog: [...new Set(request?.backlog?.map(trigger))],
      pendingMarkdown: request?.pendingMarkdown ?? null, escalatedFromPatch: request?.escalatedFromPatch === true, ...context,
      startMs: at, elapsedMs: 0, phase: "structure", phaseMs: {}, processedNotes: null, totalNotes: null,
      outcome: "running", failure: null, cancelledBy: null, sourceChanged: null, topologyChanged: null};
    this.phaseStarted = at;
  }

  phase(phase: GraphBuildPhase): void {
    const active = this.active;
    if (!active || active.phase === phase) return;
    const at = this.now();
    this.addPhaseTime(active, at);
    active.phase = phase;
    this.phaseStarted = at;
  }

  progress(processedNotes: number, totalNotes: number): void {
    if (this.active) {this.active.processedNotes = processedNotes; this.active.totalNotes = totalNotes;}
  }

  cancel(reason: GraphBuildCancellation): void { if (this.active) this.active.cancelledBy ??= reason; }

  finish(outcome: ActivityOutcome, failure: GraphBuildFailure | null, sourceChanged: boolean, topologyChanged: boolean): void {
    const active = this.active;
    if (!active) return;
    const at = this.now();
    this.addPhaseTime(active, at);
    Object.assign(active, {outcome, failure: outcome === "cancelled" ? null : failure, sourceChanged, topologyChanged,
      elapsedMs: Math.max(0, at - active.startMs)});
    this.active = null;
    if (this.recent.length === GRAPH_BUILD_LIMIT) {this.recent.shift(); this.omitted++;}
    this.recent.push(active);
  }

  snapshot(progress?: Readonly<{processed: number; total: number}> | null) {
    const copy = (row: Receipt): Receipt => ({...row, backlog: [...row.backlog], phaseMs: {...row.phaseMs}});
    const active = this.active ? copy(this.active) : null;
    if (active) {
      if (progress) {active.processedNotes = progress.processed; active.totalNotes = progress.total;}
      const at = this.now();
      this.addPhaseTime(active, at);
      active.elapsedMs = Math.max(0, at - active.startMs);
    }
    return {recent: this.recent.map(copy), active, omitted: this.omitted};
  }

  private addPhaseTime(row: Receipt, at: number): void {
    row.phaseMs[row.phase] = (row.phaseMs[row.phase] ?? 0) + Math.max(0, at - this.phaseStarted);
  }
}
