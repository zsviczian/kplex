/** Fixed-size, path-free recovery facts shared by both user-exported diagnostics. Raw
 * host objects, exception messages and dynamic source/ontology keys never cross this boundary. */
import {supportField, supportCode, supportCount, supportDuration} from "./SessionEventRecorder";
import {ACTIVITY_REASONS} from "./IndexingActivity";

/** Shared closed vocabulary for live and historical cache-writer receipts, excluding raw errors. */
export function projectSnapshotWriteDiagnostics(snapshot: unknown) {
  return {phase: supportCode(supportField(snapshot, "phase"), ["idle", "open", "pages", "evidence", "activate"]),
    outcome: supportCode(supportField(snapshot, "outcome"), ["idle", "running", "complete", "cancelled", "failed", "unavailable"]),
    errorName: supportCode(supportField(snapshot, "errorName"), ["none", "AbortError", "QuotaExceededError", "InvalidStateError", "DataCloneError", "TransactionInactiveError", "UnknownError", "Error", "unknown"]),
    elapsedMs: supportDuration(supportField(snapshot, "elapsedMs")),
    pageChunks: supportCount(supportField(snapshot, "pageChunks")), evidenceChunks: supportCount(supportField(snapshot, "evidenceChunks"))};
}

/** Project one bounded receipt without invoking getters, serializers or host operations. */
export function projectIndexRecoveryDiagnostics(input: unknown) {
  if (input === null || input === undefined) return null;
  const source = supportField(input, "source"), pass = supportField(source, "pass"), snapshot = supportField(input, "snapshot"), url = supportField(input, "url");
  const invalidation = supportField(source, "invalidation"), comparison = supportField(source, "metadataComparison");
  const environment = supportField(source, "environmentChange");
  const boolean = (object: unknown, key: string): boolean | null => {
    const value = supportField(object, key); return typeof value === "boolean" ? value : null;
  };
  const counters = (object: unknown, keys: readonly string[]) => Object.fromEntries(keys.map(key => [key, supportCount(supportField(object, key))]));
  return {version: 1,
    ...counters(input, ["demandedCenters", "incompleteCenters", "activeCenterTasks", "dependencyPendingCenters", "foregroundLeases"]),
    waitingForSources: boolean(input, "waitingForSources"),
    source: {...counters(source, ["pendingKnown", "pendingResolution", "knownImpactTasks", "maintenanceRevision"]),
      invalidation: {kind: supportCode(supportField(invalidation, "kind"), ["none", "source", "topology", "resolution", "environment"]),
        reason: supportCode(supportField(invalidation, "reason"), ["none", ...ACTIVITY_REASONS]),
        global: boolean(invalidation, "global"), knownFile: boolean(invalidation, "knownFile"),
        observations: supportCount(supportField(invalidation, "observations"))},
      metadataComparison: comparison === null || comparison === undefined ? null : {
        outcome: supportCode(supportField(comparison, "outcome"), ["equal", "different", "unavailable"]),
        family: supportCode(supportField(comparison, "family"), ["values", "metadata", "resolution", "body-urls"])},
      environmentChange: environment === null || environment === undefined ? null : {
        kind: supportCode(supportField(environment, "kind"), ["date-registry", "daily-notes", "unknown"]),
        fields: supportCount(supportField(environment, "fields")), scoped: boolean(environment, "scoped")},
      ...Object.fromEntries(["dependenciesReady", "localAuthorityReady", "restartChecked", "warmAuthority", "environmentPending", "resolutionUncertain", "resolutionBackpressure", "inventoryActive"].map(key => [key, boolean(source, key)])),
      pass: pass === null || pass === undefined ? null : {
        phase: supportCode(supportField(pass, "phase"), ["queued", "native-resolution", "known-impacts", "local-maintenance", "coordinates", "sources", "dependencies", "resolution", "final-proof"]),
        outcome: supportCode(supportField(pass, "outcome"), ["running", "complete", "incomplete", "cancelled", "failed"]),
        elapsedMs: supportDuration(supportField(pass, "elapsedMs")),
        ...counters(pass, ["visited", "total", "sourceChanges", "scopeChanges", "hostChanges"])}},
    url: {...counters(url, ["policyPreparations", "flushes", "pendingPaths", "maxPendingPaths"]), timerPending: boolean(url, "timerPending")},
    snapshot: projectSnapshotWriteDiagnostics(snapshot)};
}
