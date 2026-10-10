/**
 * Public support-report privacy projection. Only enumerated categories and bounded counters cross
 * this application boundary, together with explicitly requested plugin/theme metadata; native
 * diagnostics remain unknown input and are never serialized intact.
 * Existing host diagnostics commands keep their own schemas. No host/API reads or effectful callbacks
 * are accepted, including own accessors and arbitrary toJSON implementations.
 */
import { projectSupportCustomizations } from "./supportCustomizationProjection";
import { SETTING_DIAGNOSTIC_KEYS } from "../core/graph/settingsPolicy";
import { supportCode, supportCount, supportDuration, supportField, SUPPORT_PHASES } from "./SessionEventRecorder";

const SOURCE_REASONS = ["ready", "missing", "stale", "pending-metadata", "tombstone", "format-version", "invalid-head", "missing-chunk", "invalid-chunk",
  "invalid-frame", "missing-posting", "invalid-posting", "decode-budget", "unsupported-body-value", "storage-unavailable", "newer-database", "quota-exceeded",
  "read-error", "write-error", "cancelled", "superseded", "backpressure", "unsaved", "memory-budget", "catalog-uncertain", "activated", "activated-not-live",
  "dependency-pending", "dependency-invalid", "host-catalog-stale", "unsupported-scope"] as const;
const DECISION_REASONS = ["source-backed-physical-baseline", "source-node-incidence-recovery", "source-node-impact-pending", "presentation-inputs-pending",
  "presentation-settings-adapted", "url-cache-stalled", "folder-structure-changed", "possible-file-rename", "non-markdown-file-added", "missing-file-binding",
  "unsupported-physical-change", "startup-host-wave-cached-presentation", "checkpoint-restored", "complete-markdown-delta", "complete-modified-markdown", "complete-restored",
  "storage-unavailable", "invalid-snapshot-metadata", "no-complete-snapshot", "source-backed-policy-baseline", "compatible", "signature-format-changed",
  "semantic-settings-changed", "signature-format-unknown", "retired-policy-reconcile", "retired-policy-no-affected-sources", "checkpoint-selected",
  "complete-snapshot-fresh", "complete-snapshot-stale", "startup-source-authority-pending", "hydration-incomplete", "restore-exception", "hydration-stalled",
  "source-changed-during-reconcile", "per-file-reconcile-complete", "snapshot-write-cancelled", "checkpoint-saved", "complete-saved"] as const;
const BUILD_PARTS = ["cold-progressive", "full-rebuild", "per-file-patch", "startup", "vault", "metadata", "kplex", "stale-snapshot", "no-snapshot",
  "partial-restore-incomplete", "post-initial-backlog", "initial-index", "create-during-rebuild", "create-markdown", "create", "delete-folder-failed", "delete",
  "rename-folder-failed", "rename-folder", "rename", "changed", "coalesced-backlog", "interval", "view-open", "direct", "unknown", "settings", "manual", "user-request"] as const;
const MILESTONES = ["onload", "settings-loaded", "layout-ready", "strict-ready", "on-demand-baseline-ready", "on-demand-center-requested", "on-demand-center-patched",
  "host-search-ready", "host-preview-ready", "first-requested-scope-authoritative", "url-background-start", "url-background-complete", "evidence-hydration-start",
  "evidence-hydration-end", "snapshot-catalog-read", "host-inventory-start", "host-inventory-end", "preview-available", "source-authority-await-ended",
  "requested-semantics-refresh-ended"] as const;
const STARTUP_COUNTERS = ["physicalRevisionComparisons", "headPageOwners", "inventoryFiles", "inventoryFolders"] as const;

/** Return an explicit unknown Boolean rather than treating arbitrary truthy host values as facts. */
export function supportBoolean(input: unknown): boolean | null { return typeof input === "boolean" ? input : null; }
/** Retain nonnegative finite timings with bounded precision and range; NaN/Infinity remain unknown. */
export function supportMilliseconds(input: unknown): number | null {
  return supportDuration(input);
}
/** Project a finite built-in counter list; never copy dynamic record keys from host diagnostics. */
export function supportCounters(input: unknown, names: readonly string[]): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const name of names) result[name] = supportCount(supportField(input, name));
  return result;
}
/** Recognize arrays without allowing a revoked host proxy to abort report preparation. */
function supportIsArray(input: unknown): boolean { try { return Array.isArray(input); } catch { return false; } }
/** Read an array length safely without enumerating a source collection. */
export function supportRowCount(input: unknown): number { return supportIsArray(input) ? supportCount(supportField(input, "length")) ?? 0 : 0; }
/** Read at most a fixed number of own array slots, without invoking iterators or slot accessors. */
export function supportRows(input: unknown, limit: number): unknown[] {
  if (!supportIsArray(input)) return [];
  const length = supportCount(supportField(input, "length"));
  if (length === null) return [];
  const result: unknown[] = [];
  for (let index = Math.max(0, length - limit); index < length; index++) result.push(supportField(input, String(index)));
  return result;
}
/** Recognize only current built-in diagnostic reasons, including finite composed build/stream codes. */
function supportDecisionReason(input: unknown): string {
  if (typeof input !== "string" || input.length > 240) return "unrecognized";
  if (DECISION_REASONS.some(/** Compare an enum literal, never a regular expression accepting private text. */ code => code === input)) return input;
  const stream = /^(active|checkpoint)-(pages|relations|evidence)-(storage-unavailable|missing-chunk|invalid-chunk|invalid-record|read-error|cancelled)$/.test(input);
  const write = /^(checkpoint|complete)-(storage-unavailable|cancelled|quota-exceeded|write-error|write-failed)$/.test(input);
  if (stream || write) return input;
  const parts = input.split(/[|:]/);
  return parts.length <= 16 && parts.every(/** Each composed component belongs to the fixed production boundary vocabulary. */
    part => BUILD_PARTS.some(/** Refuse arbitrary ASCII tokens even if the legacy sanitizer accepted their syntax. */ code => code === part)) ? input : "unrecognized";
}
/** Keep known changed setting key names, never their private values or arbitrary user-defined keys. */
function supportChangedKeys(input: unknown): string[] {
  const candidates = supportRows(input, SETTING_DIAGNOSTIC_KEYS.length);
  const result: string[] = [];
  for (const key of SETTING_DIAGNOSTIC_KEYS) if (candidates.includes(key)) result.push(key);
  return result;
}
/** Project active/checkpoint metadata without retaining vault/settings signatures, paths or generations. */
function supportSavedGeneration(input: unknown, checkpoint: boolean) {
  if (input === null || input === undefined) return null;
  return { createdAt: supportMilliseconds(supportField(input, "createdAt")), schema: supportCount(supportField(input, "schema")),
    ...(checkpoint ? { completedMarkdownFiles: supportCount(supportField(input, "completedMarkdownFiles")) } : {}) };
}
/** Reject excessive/malformed serialized index snapshots before parsing; no coercion/toJSON is used. */
function supportIndexInput(input: unknown): unknown {
  if (typeof input !== "string") return input;
  if (input.length > 64 * 1024) return null;
  try { return JSON.parse(input); } catch { return null; }
}
/** Rebuild the existing native index schema from explicit safe fields; unavailable input is named. */
export function projectSupportIndex(input: unknown) {
  const source = supportIndexInput(input);
  if (source === null || typeof source !== "object" || supportIsArray(source)) return { availability: "unavailable" as const };
  const status = supportField(source, "status"), graph = supportField(source, "graph"), hydration = supportField(source, "hydration");
  const saved = supportField(source, "saved"), sources = supportField(source, "sources"), plugin = supportField(source, "plugin"), device = supportField(source, "device");
  const decisions = supportRows(supportField(source, "decisions"), 20).map(/** Each retained decision is rebuilt without extra fields, raw errors or dynamic setting values. */ row => ({
    at: supportMilliseconds(supportField(row, "at")), stage: supportCode(supportField(row, "stage"), ["restore", "reconcile", "build", "persist"]),
    reason: supportDecisionReason(supportField(row, "reason")),
    ...supportCounters(row, ["added", "removed", "modified", "completedMarkdownFiles", "durationMs"]), changedKeys: supportChangedKeys(supportField(row, "changedKeys")),
  }));
  return {
    availability: "available" as const, decisionsOmitted: Math.max(0, supportRowCount(supportField(source, "decisions")) - 20), formatVersion: supportCount(supportField(source, "formatVersion")),
    generatedAt: supportIsoTime(supportField(source, "generatedAt")), plugin: { id: "k-plex", version: supportVersion(supportField(plugin, "version")) },
    platform: supportCode(supportField(source, "platform"), ["ios", "android", "desktop"]),
    device: { obsidianApiVersion: supportVersion(supportField(device, "obsidianApiVersion")), operatingSystem: supportOperatingSystem(supportField(device, "operatingSystem")),
      formFactor: supportCode(supportField(device, "formFactor"), ["phone", "tablet", "desktop"]) },
    status: { upToDate: supportBoolean(supportField(status, "upToDate")), phase: supportCode(supportField(status, "phase"), SUPPORT_PHASES),
      ...supportCounters(status, ["indexedFiles", "totalFiles"]) },
    graph: { ...supportCounters(graph, ["nodes", "publishedMarkdownFiles"]), authoritative: supportBoolean(supportField(graph, "authoritative")) },
    hydration: { ...supportCounters(hydration, ["run", "pages", "relations", "evidence"]), phase: supportCode(supportField(hydration, "phase"), SUPPORT_PHASES),
      lastActivePhase: supportCode(supportField(hydration, "lastActivePhase"), SUPPORT_PHASES), startedAt: supportMilliseconds(supportField(hydration, "startedAt")),
      phaseStartedAt: supportMilliseconds(supportField(hydration, "phaseStartedAt")), lastProgressAt: supportMilliseconds(supportField(hydration, "lastProgressAt")),
      outcome: supportCode(supportField(hydration, "outcome"), ["idle", "running", "complete", "failed", "timed-out", "cancelled"]) },
    saved: { storage: supportCode(supportField(saved, "storage"), ["unchecked", "available", "unavailable"]), invalidActive: supportBoolean(supportField(saved, "invalidActive")),
      active: supportSavedGeneration(supportField(saved, "active"), false), checkpoint: supportSavedGeneration(supportField(saved, "checkpoint"), true) },
    sources: { ...supportCounters(sources, ["formatVersion", "databaseVersion", "factFormatVersion", "factCompilerVersion", "bodyParserVersion", "resolutionVersion", "activated",
      "unsaved", "empty", "chunksWritten", "bytesWritten", "familiesReused", "readFailures", "sequenceMin", "sequenceMax", "peakDecodeBytes"]),
      storage: supportCode(supportField(sources, "storage"), ["unchecked", "available", "unavailable"]), lastReason: supportCode(supportField(sources, "lastReason"), SOURCE_REASONS),
      familyFailures: supportCounters(supportField(sources, "familyFailures"), ["values", "body-urls", "metadata", "resolution"]) }, decisions,
  };
}
/** Admit only bounded numeric product versions; account names/prerelease secrets are not copied. */
export function supportVersion(input: unknown): string {
  return typeof input === "string" && /^\d{1,5}\.\d{1,5}(?:\.\d{1,5}){0,2}$/.test(input) ? input : "unavailable";
}
/** Require an exact bounded ISO UTC capture shape; never stringify a supplied Date or host object. */
export function supportIsoTime(input: unknown): string {
  return typeof input === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input) ? input : "unavailable";
}
/** Keep only supported host families; unknown platforms remain explicit instead of guessed. */
function supportOperatingSystem(input: unknown) { return supportCode(input, ["ios", "android", "windows", "linux", "macos", "unknown"]); }
/** Project copied host metadata plus explicitly requested customization facts, never host registries. */
export function projectSupportEnvironment(input: unknown) {
  return { pluginVersion: supportVersion(supportField(input, "pluginVersion")), obsidianApiVersion: supportVersion(supportField(input, "obsidianApiVersion")),
    operatingSystem: supportOperatingSystem(supportField(input, "operatingSystem")), formFactor: supportCode(supportField(input, "formFactor"), ["phone", "tablet", "desktop"]),
    locale: supportCode(supportField(input, "locale"), ["en", "en-GB", "de", "fr", "es", "nl", "ja", "zh", "zh-CN", "zh-TW", "ru", "ar", "da", "fi", "id", "it", "ko", "no", "pl", "pt", "pt-BR", "ro", "sv", "tr", "uk", "cs", "sk", "hu", "he", "th", "vi"]),
    theme: supportCode(supportField(input, "theme"), ["light", "dark"]), surfaceKind: supportCode(supportField(input, "surfaceKind"), ["tab", "sidepanel", "popout"]),
    hostVersion: supportVersion(supportField(input, "hostVersion")), installerVersion: supportVersion(supportField(input, "installerVersion")),
    enabledPluginCount: supportCount(supportField(input, "enabledPluginCount")), ...projectSupportCustomizations(input) };
}
/** Keep actual scheduling and embedded-drawing fit preferences; unknown values never use defaults. */
export function projectSupportPreferences(input: unknown) {
  return { indexingMode: supportCode(supportField(input, "indexingMode"), ["eager", "on-demand"]),
    urlIndexingMode: supportCode(supportField(input, "urlIndexingMode"), ["on-demand", "background"]),
    indexingThrottle: supportCode(supportField(input, "indexingThrottle"), ["responsive", "balanced", "faster"]),
    excalidrawFitOnNodeOpen: supportBoolean(supportField(input, "excalidrawFitOnNodeOpen")) };
}
/** Project one current/passive phase with bounded counters and finite lane/phase vocabulary. */
function supportStartupPhase(input: unknown, detailed: boolean, lane?: "source" | "hydration") {
  return { lane: lane ?? supportCode(supportField(input, "lane"), ["source", "hydration"]), phase: supportCode(supportField(input, "phase"), SUPPORT_PHASES),
    ...supportCounters(input, ["pass", "processed", "total"]), ...(detailed ? { startedMs: supportMilliseconds(supportField(input, "startedMs")),
      endedMs: supportMilliseconds(supportField(input, "endedMs")), uniqueOwners: supportCount(supportField(input, "uniqueOwners")),
      counters: supportCounters(supportField(input, "counters"), STARTUP_COUNTERS) } : {}) };
}
/** Retain useful partial progress while explicitly distinguishing disabled timings from zero failures. */
export function projectSupportStartup(input: unknown) {
  const enabled = supportBoolean(supportField(input, "enabled")), progress = supportField(input, "progress");
  const phases = enabled === true ? supportRows(supportField(input, "phases"), 32).map(/** Rebuild a bounded phase record; private owner sets and unexpected counters are omitted. */
    row => supportStartupPhase(row, true)) : [];
  const overlaps = enabled === true ? supportRows(supportField(input, "overlaps"), 32).map(/** Export only categorical lane overlap and aggregate cardinality. */
    row => ({ first: supportCode(supportField(row, "first"), SUPPORT_PHASES), second: supportCode(supportField(row, "second"), SUPPORT_PHASES), owners: supportCount(supportField(row, "owners")) })) : [];
  const milestones: Record<string, number | null> = {};
  if (enabled === true) for (const code of MILESTONES) milestones[code] = supportMilliseconds(supportField(supportField(input, "milestones"), code));
  const source = supportField(input, "source"), semantic = supportField(input, "semantic");
  return { availability: input !== null && typeof input === "object" ? "available" : "unavailable",
    detailedTelemetry: enabled === true ? "enabled" : enabled === false ? "disabled" : "unavailable", frozen: supportBoolean(supportField(input, "frozen")),
    progress: { source: supportField(progress, "source") == null ? null : supportStartupPhase(supportField(progress, "source"), false, "source"),
      hydration: supportField(progress, "hydration") == null ? null : supportStartupPhase(supportField(progress, "hydration"), false, "hydration") },
    milestones, phases, overlaps, phasesOmitted: enabled === true ? Math.max(0, supportRowCount(supportField(input, "phases")) - 32) : 0,
    overlapsOmitted: enabled === true ? Math.max(0, supportRowCount(supportField(input, "overlaps")) - 32) : 0,
    source: supportCounters(source, ["checked", "reusedBodies", "legacyBodies", "vaultReads", "parses", "repaired", "resolutionRefreshes", "pendingMetadata", "failures"]),
    semantic: { ...supportCounters(semantic, ["policyRevision", "requested", "prepared", "published", "cancelled", "pending", "dependencyVisits", "fullBuilds"]),
      lastReason: supportCode(supportField(semantic, "lastReason"), SOURCE_REASONS) } };
}
