/**
 * Versioned, settings-neutral source storage vocabulary and strict codecs. This legacy storage
 * boundary borrows the canonical parser's occurrence/reference grammar; it does not classify
 * relationships, resolve paths, retain arbitrary frontmatter, or own IndexedDB/lifecycle effects.
 * Inline inputs and reference explanation payloads share one framed value, not one copy per target.
 * Known parser2 primary heads require repository family authentication; parser3 alias completeness
 * is a separate capability. Known parser2 tombstones preserve retirement identity only, while
 * unknown versions remain invalid and no compatibility path rewrites a persisted head.
 */
import { normalizeFieldName, type ExtractedLinkReference, type ParsedBodyMetadata, type ParsedFileMetadata } from "../core/parser/metadata";
import { iteratePropertyValueSteps, iterateReferencePayloadChunks, iterateReferenceScanSteps } from "../core/parser/referenceValues";
import { MAX_REFERENCE_PAYLOAD_CHARS, type SourceLocation, type SourceTargetRef } from "../core/graph/source";

/** Independent versions: none is a graph snapshot schema or a semantic/settings policy revision. */
export const SOURCE_FACT_FORMAT_VERSION = 1;
export const SOURCE_FACT_COMPILER_VERSION = 1;
export const SOURCE_BODY_PARSER_VERSION = 3;
export const SOURCE_RESOLUTION_VERSION = 1;
export const SOURCE_CHUNK_TARGET_BYTES = 256 * 1024;
export const SOURCE_MAX_RECORD_BYTES = 4 * 1024 * 1024;
export const SOURCE_DECODE_BUDGET_BYTES = 8 * 1024 * 1024;
export const SOURCE_MAX_BATCH_RECORDS = 256;
export const SOURCE_FLUSH_INTERVAL_MS = 1000;
export const SOURCE_FAMILIES = ["values", "body-urls", "metadata", "resolution"] as const;
export type SourceFamily = typeof SOURCE_FAMILIES[number];

/** Path-free failure vocabulary. Raw exception messages must never become reason codes. */
export const SOURCE_REASONS = [
  "ready", "missing", "stale", "pending-metadata", "tombstone", "format-version", "invalid-head",
  "missing-chunk", "invalid-chunk", "invalid-frame", "missing-posting", "invalid-posting",
  "decode-budget", "unsupported-body-value", "storage-unavailable", "newer-database", "quota-exceeded",
  "read-error", "write-error", "cancelled", "superseded", "backpressure", "unsaved", "memory-budget",
  "catalog-uncertain", "activated", "activated-not-live",
  "dependency-pending", "dependency-invalid", "host-catalog-stale", "unsupported-scope",
] as const;
export type SourceReason = typeof SOURCE_REASONS[number];

/** A safe internal error: it carries only a stable reason and optional finite family identifier. */
export class SourceFactError extends Error {
  /** Construct an error without retaining a source value, path, or underlying exception. */
  constructor(readonly reason: SourceReason, readonly family?: SourceFamily) { super(reason); }
}

/** Observed physical facts; absent size/ctime stay absent, especially for legacy body validation. */
export type SourcePhysical = Readonly<{
  identity: string;
  path: string;
  mtime: number;
  size?: number;
  ctime?: number;
}>;

/** Host observation validity is independent of the physical acquisition and semantic policy. */
export type SourceObservation = Readonly<{ epoch: string; revision: number; environment: string }>;

/** A single original value. Inline non-reference values retain the established parser-cache scope. */
export type StoredValueHeader = Readonly<{
  kind: "reference-value" | "inline-value";
  valueId: string;
  fieldName: string;
  normalizedFieldName: string;
  surface: "frontmatter" | "inline";
  ordinal: number;
  origin: "physical" | "inline-map";
  inlineMapIndex?: number;
  syntax?: "line" | "parenthesized" | "bracketed";
  location?: SourceLocation;
}>;
export type StoredValuePayload = Readonly<{
  kind: "reference-payload" | "inline-payload";
  valueId: string;
  index: number;
  final: boolean;
  text: string;
}>;
/** All distinct lexical spellings survive, even when today's resolver merges their destinations. */
export type StoredReferenceCandidate = Readonly<{
  kind: "reference-candidate";
  valueId: string;
  ordinal: number;
  final: boolean;
  rawTarget: string;
  subpath?: string;
  external: boolean;
}>;
/** One primary URL/provenance record with independently retained search-label metadata. */
export type StoredBodyUrl = Readonly<{ kind: "body-url"; url: string; label?: string; aliases?: readonly string[]; line?: number }>;
export type StoredMetadataFact =
  | Readonly<{ kind: "alias" | "tag"; value: string }>
  | Readonly<{ kind: "file-parent"; path: string }>
  | Readonly<{ kind: "field-name"; fieldName: string; normalizedFieldName: string; surface: "frontmatter" | "inline" }>
  | Readonly<{ kind: "host-literal"; ordinal: number; rawTarget: string; location?: SourceLocation }>;
export type StoredResolutionFact =
  | Readonly<{ kind: "reference-resolution"; valueId: string; ordinal: number; target: SourceTargetRef | null; hostOccurrenceCount: number }>
  | Readonly<{ kind: "host-link"; state: "resolved" | "unresolved"; target: string; count: number }>
  | Readonly<{ kind: "literal-resolution"; ordinal: number; target: SourceTargetRef | null }>
  | Readonly<{ kind: "date-property"; fieldName: string; normalizedFieldName: string; rawValue: string; target: SourceTargetRef }>;
export type StoredSourceFact = StoredValueHeader | StoredValuePayload | StoredReferenceCandidate | StoredBodyUrl | StoredMetadataFact | StoredResolutionFact;

/** Each family has an immutable revision and its own independently repairable integrity manifest. */
export type SourceFamilyManifest = Readonly<{
  revision: string;
  chunks: number;
  records: number;
  bytes: number;
  postings: number;
  digest: string;
  postingDigest: string;
}>;
export type SourceManifest = Readonly<{
  sourceId: string;
  sourceRevision: string;
  formatVersion: number;
  compilerVersion: number;
  bodyParserVersion: number;
  resolutionVersion: number;
  physical: SourcePhysical;
  observation: SourceObservation;
  state: "complete" | "tombstone";
  families: Readonly<Partial<Record<SourceFamily, SourceFamilyManifest>>>;
}>;
/** Only committed disk heads have a positive durable sequence; memory views use a separate flag. */
export type SourceHead = SourceManifest & Readonly<{ sequence: number }>;
export type SourceChunk = Readonly<{
  sourceId: string;
  revision: string;
  family: SourceFamily;
  index: number;
  final: boolean;
  records: number;
  bytes: number;
  digest: string;
  data: string;
}>;
export type SourcePostingKind = "field" | "literal" | "target" | "family";
export type SourcePosting = Readonly<{
  sourceId: string;
  revision: string;
  family: SourceFamily;
  index: number;
  kind: SourcePostingKind;
  key: string;
}>;

/** Check only plain JSON-shaped objects; class instances are not valid persisted source facts. */
export function sourceObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
/** Enforce an exact field allowlist, rather than silently retaining unknown property mirrors. */
function keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}
/** Counters and frame coordinates cannot be negative, fractional, infinite, or imprecise. */
export function sourceCount(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
/** Metadata timestamps need not be integral, but must be finite non-negative observations. */
function timestamp(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0; }
/** Empty text is allowed only for fields whose contract explicitly permits it. */
function text(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
/** Reject malformed/sparse alias arrays; existing record and retained-body byte bounds reject extremes. */
function validUrlAliases(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  for (const alias of value) if (!text(alias)) return false;
  return true;
}
/** Validate optional properties without accepting a present undefined value. */
function optional(value: Record<string, unknown>, key: string, check: (value: unknown) => boolean): boolean {
  return !Object.prototype.hasOwnProperty.call(value, key) || check(value[key]);
}
/** Location records contain only genuine coordinates, never an inferred or copied raw value. */
function location(value: unknown): boolean {
  return sourceObject(value) && keys(value, [], ["line", "start", "end"])
    && optional(value, "line", (line) => sourceCount(line) && line > 0)
    && optional(value, "start", sourceCount) && optional(value, "end", sourceCount)
    && !(typeof value.start === "number" && typeof value.end === "number" && value.end < value.start);
}
/** Runtime validation for explicit host targets; there is deliberately no path normalization. */
export function validSourceTarget(value: unknown): value is SourceTargetRef {
  if (!sourceObject(value) || !keys(value, ["entity", "rawTarget", "resolvedBy"], ["subpath"]) || typeof value.rawTarget !== "string"
    || !optional(value, "subpath", text) || !["host", "unresolved", "url", "daily-notes", "structural"].includes(String(value.resolvedBy))) return false;
  const entity = value.entity;
  return sourceObject(entity) && keys(entity, ["id", "kind", "state"], ["semanticPath", "physicalPath"])
    && text(entity.id) && ["document", "attachment", "container", "tag", "url", "unresolved"].includes(String(entity.kind))
    && ["materialized", "unresolved", "missing", "deleted"].includes(String(entity.state))
    && optional(entity, "semanticPath", text) && optional(entity, "physicalPath", text);
}
/** Keep exact identity/stat observations separate from legacy body-cache validation strength. */
export function validSourcePhysical(value: unknown): value is SourcePhysical {
  return sourceObject(value) && keys(value, ["identity", "path", "mtime"], ["size", "ctime"])
    && text(value.identity) && text(value.path) && timestamp(value.mtime)
    && optional(value, "size", sourceCount) && optional(value, "ctime", timestamp);
}
/** Reject arbitrary environment/configuration mirrors in the host validity descriptor. */
function observation(value: unknown): value is SourceObservation {
  return sourceObject(value) && keys(value, ["epoch", "revision", "environment"]) && text(value.epoch)
    && sourceCount(value.revision) && typeof value.environment === "string" && /^[a-f0-9]{64}$/.test(value.environment);
}
/** Digests are SHA-256, not untrusted diagnostic text. */
function digest(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
/** Recognize exactly the four finite acquired/host-owned families. */
export function sourceFamily(value: unknown): value is SourceFamily { return SOURCE_FAMILIES.some((family) => family === value); }
/** Validate an immutable family's counts and independently version-scoped storage references. */
export function validFamilyManifest(value: unknown): value is SourceFamilyManifest {
  return sourceObject(value) && keys(value, ["revision", "chunks", "records", "bytes", "postings", "digest", "postingDigest"])
    && text(value.revision) && sourceCount(value.chunks) && value.chunks > 0 && sourceCount(value.records)
    && sourceCount(value.bytes) && sourceCount(value.postings) && digest(value.digest) && digest(value.postingDigest);
}
/**
 * Parser3 adds optional search labels without changing parser2 primary URLs or inline grammar.
 * Known complete parser2 heads remain semantic candidates, never complete-alias certificates;
 * repository pins authenticate their actual URL family before any primary-fact reuse.
 */
export function legacyPrimaryGrammarCandidate(value: SourceManifest): boolean {
  return value.bodyParserVersion === 2 && value.state === "complete";
}
/** Distinguish complete sources, the exact parser2 primary-grammar candidate, tombstones and format changes. */
export function sourceHeadReason(value: unknown): SourceReason {
  if (value === undefined || value === null) return "missing";
  if (!sourceObject(value) || !keys(value, ["sourceId", "sourceRevision", "formatVersion", "compilerVersion", "bodyParserVersion", "resolutionVersion",
    "physical", "observation", "state", "families", "sequence"]) || !text(value.sourceId) || !text(value.sourceRevision)
    || !validSourcePhysical(value.physical) || !observation(value.observation) || !sourceCount(value.sequence) || value.sequence < 1
    || (value.state !== "complete" && value.state !== "tombstone") || !sourceObject(value.families)) return "invalid-head";
  if (value.formatVersion !== SOURCE_FACT_FORMAT_VERSION || value.compilerVersion !== SOURCE_FACT_COMPILER_VERSION
    || value.resolutionVersion !== SOURCE_RESOLUTION_VERSION) return "format-version";
  if (!Object.entries(value.families).every(([key, entry]) => sourceFamily(key) && validFamilyManifest(entry))) return "invalid-head";
  if (value.state === "complete" && SOURCE_FAMILIES.some((family) => !Object.prototype.hasOwnProperty.call(value.families, family))) return "invalid-head";
  // A known retired parser2 marker preserves deletion/CAS identity but grants no semantic facts.
  const legacyRetirement = value.bodyParserVersion === 2 && value.state === "tombstone";
  if (value.bodyParserVersion !== SOURCE_BODY_PARSER_VERSION && !legacyRetirement
    && !legacyPrimaryGrammarCandidate(value as unknown as SourceHead)) return "format-version";
  return value.state === "tombstone" ? "tombstone" : "ready";
}
/** Return a typed disk head only after full shape/version validation; never coerce unknown data. */
export function decodeSourceHead(value: unknown): SourceHead | null {
  const reason = sourceHeadReason(value);
  return reason === "ready" || reason === "tombstone" ? value as SourceHead : null;
}
/** Strict envelope validation occurs before allocating encoded bytes or decoding the JSON payload. */
export function validSourceChunk(value: unknown): value is SourceChunk {
  return sourceObject(value) && keys(value, ["sourceId", "revision", "family", "index", "final", "records", "bytes", "digest", "data"])
    && text(value.sourceId) && text(value.revision) && sourceFamily(value.family) && sourceCount(value.index)
    && typeof value.final === "boolean" && sourceCount(value.records) && value.records <= SOURCE_MAX_BATCH_RECORDS
    && sourceCount(value.bytes) && value.bytes <= SOURCE_MAX_RECORD_BYTES && digest(value.digest)
    && typeof value.data === "string" && value.data.length <= SOURCE_MAX_RECORD_BYTES;
}
/** Postings contain only a lookup dependency, never a property value or active semantic role. */
export function validSourcePosting(value: unknown): value is SourcePosting {
  return sourceObject(value) && keys(value, ["sourceId", "revision", "family", "index", "kind", "key"])
    && text(value.sourceId) && text(value.revision) && sourceFamily(value.family) && sourceCount(value.index)
    && ["field", "literal", "target", "family"].includes(String(value.kind)) && typeof value.key === "string";
}
/** Validate a frame header, including the stricter shape of physical inline parser inputs. */
function validValueHeader(value: Record<string, unknown>): boolean {
  if (!keys(value, ["kind", "valueId", "fieldName", "normalizedFieldName", "surface", "ordinal", "origin"], ["inlineMapIndex", "syntax", "location"])
    || !text(value.valueId) || !text(value.fieldName) || !text(value.normalizedFieldName) || !sourceCount(value.ordinal)
    || !["frontmatter", "inline"].includes(String(value.surface)) || !["physical", "inline-map"].includes(String(value.origin))
    || !optional(value, "inlineMapIndex", (index) => sourceCount(index) && index < SOURCE_DECODE_BUDGET_BYTES / 8) || !optional(value, "location", location)
    || !optional(value, "syntax", (syntax) => syntax === "line" || syntax === "parenthesized" || syntax === "bracketed")) return false;
  if (value.surface === "frontmatter") return value.kind === "reference-value" && value.origin === "physical"
    && value.inlineMapIndex === undefined && value.location === undefined && value.syntax === undefined;
  if (value.origin === "inline-map") return value.inlineMapIndex !== undefined && value.location === undefined && value.syntax === undefined;
  return sourceObject(value.location) && keys(value.location, ["line", "start", "end"]) && value.syntax !== undefined;
}
/** Reject unknown facts at the family boundary, instead of serializing generic metadata objects. */
export function validSourceFact(value: unknown, family: SourceFamily): value is StoredSourceFact {
  if (!sourceObject(value)) return false;
  if (family === "values") {
    if (value.kind === "reference-value" || value.kind === "inline-value") return validValueHeader(value);
    if (value.kind === "reference-payload" || value.kind === "inline-payload") return keys(value, ["kind", "valueId", "index", "final", "text"])
      && text(value.valueId) && sourceCount(value.index) && typeof value.final === "boolean" && typeof value.text === "string"
      && value.text.length <= MAX_REFERENCE_PAYLOAD_CHARS;
    return value.kind === "reference-candidate" && keys(value, ["kind", "valueId", "ordinal", "final", "rawTarget", "external"], ["subpath"])
      && text(value.valueId) && sourceCount(value.ordinal) && typeof value.final === "boolean" && text(value.rawTarget)
      && typeof value.external === "boolean" && optional(value, "subpath", text);
  }
  if (family === "body-urls") return value.kind === "body-url" && keys(value, ["kind", "url"], ["label", "aliases", "line"])
    && text(value.url) && optional(value, "label", (label) => typeof label === "string")
    && optional(value, "aliases", validUrlAliases) && optional(value, "line", (line) => sourceCount(line) && line > 0);
  if (family === "metadata") {
    if (value.kind === "alias" || value.kind === "tag") return keys(value, ["kind", "value"]) && typeof value.value === "string";
    if (value.kind === "file-parent") return keys(value, ["kind", "path"]) && typeof value.path === "string";
    if (value.kind === "field-name") return keys(value, ["kind", "fieldName", "normalizedFieldName", "surface"])
      && text(value.fieldName) && text(value.normalizedFieldName) && (value.surface === "frontmatter" || value.surface === "inline");
    return value.kind === "host-literal" && keys(value, ["kind", "ordinal", "rawTarget"], ["location"])
      && sourceCount(value.ordinal) && text(value.rawTarget) && optional(value, "location", location);
  }
  if (value.kind === "host-link") return keys(value, ["kind", "state", "target", "count"])
    && (value.state === "resolved" || value.state === "unresolved") && text(value.target) && sourceCount(value.count);
  if (value.kind === "reference-resolution") return keys(value, ["kind", "valueId", "ordinal", "target", "hostOccurrenceCount"])
    && text(value.valueId) && sourceCount(value.ordinal) && sourceCount(value.hostOccurrenceCount) && (value.target === null || validSourceTarget(value.target));
  if (value.kind === "literal-resolution") return keys(value, ["kind", "ordinal", "target"]) && sourceCount(value.ordinal)
    && (value.target === null || validSourceTarget(value.target));
  return value.kind === "date-property" && keys(value, ["kind", "fieldName", "normalizedFieldName", "rawValue", "target"])
    && text(value.fieldName) && text(value.normalizedFieldName) && typeof value.rawValue === "string" && validSourceTarget(value.target);
}

/**
 * Stateful frame codec. Only one value is open; payload and candidate terminal markers are
 * mandatory, contiguous and ordered. This rejects truncated, duplicate and post-final frames even
 * when all individual records are otherwise valid. It does not retain payload strings.
 */
export class SourceFrameValidator {
  private header: StoredValueHeader | null = null;
  private payloadIndex = 0;
  private candidateOrdinal = 0;
  private payloadFinal = false;
  private candidateFinal = false;
  private readonly ids = new Set<string>();
  private readonly lexical = new Set<string>();
  private closed = false;
  private identityBytes = 0;
  private lexicalBytes = 0;
  /** A validator instance is scoped to exactly one family/revision stream. */
  constructor(private readonly family: SourceFamily) {}
  /** Validate and advance one fact, throwing only a path-free reason on rejected input. */
  accept(value: unknown): asserts value is StoredSourceFact {
    if (this.closed || !validSourceFact(value, this.family)) throw new SourceFactError("invalid-frame", this.family);
    if (this.family !== "values") return;
    if (value.kind === "reference-value" || value.kind === "inline-value") {
      if (!this.completeValue() || this.ids.has(value.valueId)) throw new SourceFactError("invalid-frame", this.family);
      this.identityBytes += value.valueId.length * 2 + 64;
      if (this.identityBytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget", this.family);
      this.ids.add(value.valueId); this.header = value; this.lexicalBytes = 0;
      this.payloadIndex = 0; this.candidateOrdinal = 0; this.payloadFinal = false; this.candidateFinal = false; this.lexical.clear();
      return;
    }
    const header = this.header;
    if (!header || !("valueId" in value) || value.valueId !== header.valueId) throw new SourceFactError("invalid-frame", this.family);
    if (value.kind === "reference-payload" || value.kind === "inline-payload") {
      if (this.payloadFinal || value.index !== this.payloadIndex++ || (header.kind === "reference-value") !== (value.kind === "reference-payload")) {
        throw new SourceFactError("invalid-frame", this.family);
      }
      this.payloadFinal = value.final;
    } else if (value.kind === "reference-candidate") {
      const key = lexicalReferenceKey(value);
      if (header.kind !== "reference-value" || !this.payloadFinal || this.candidateFinal || value.ordinal !== this.candidateOrdinal++ || this.lexical.has(key)) {
        throw new SourceFactError("invalid-frame", this.family);
      }
      this.lexicalBytes += key.length * 2 + 64;
      if (this.identityBytes + this.lexicalBytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget", this.family);
      this.lexical.add(key); this.candidateFinal = value.final;
    } else throw new SourceFactError("invalid-frame", this.family);
  }
  /** A successfully acquired empty stream is complete; an opened incomplete value never is. */
  private completeValue(): boolean { return !this.header || this.payloadFinal && (this.header.kind === "inline-value" || this.candidateFinal); }
  /** Close once at the family's final chunk and reject a truncated sequence. */
  finish(): void {
    if (this.closed || !this.completeValue()) throw new SourceFactError("invalid-frame", this.family);
    this.closed = true;
  }
}

/** Compare lexical identity only. Host-selected destination deduplication belongs to interpretation. */
export function lexicalReferenceKey(value: ExtractedLinkReference): string { return JSON.stringify([value.rawTarget, value.subpath ?? null, value.external]); }

/**
 * Enumerate all canonical lexical spellings before resolution. Null steps are cooperative work
 * checkpoints. Payloads are written once, including inline values shared by parser replay and
 * reference explanations. Non-reference frontmatter values never enter this stream.
 */
export function* sourceValueSteps(metadata: ParsedFileMetadata): IterableIterator<StoredSourceFact | null> {
  for (const occurrence of iteratePropertyValueSteps(metadata)) {
    if (!occurrence) { yield null; continue; }
    if (!occurrence.normalizedFieldName) { yield null; continue; }
    if (occurrence.surface === "inline" && typeof occurrence.value !== "string") throw new SourceFactError("unsupported-body-value", "values");
    const references = iterateReferenceScanSteps(occurrence.value);
    let first: ExtractedLinkReference | null = null;
    for (let step = references.next(); !step.done; step = references.next()) {
      if (step.value) { first = step.value; break; }
      yield null;
    }
    if (!first && occurrence.surface === "frontmatter") continue;
    const { value, ...identity } = occurrence;
    const valueId = JSON.stringify([identity.surface, identity.origin, identity.fieldName, identity.ordinal]);
    yield { kind: first ? "reference-value" : "inline-value", ...identity, valueId };
    const payloads = iterateReferencePayloadChunks(value, MAX_REFERENCE_PAYLOAD_CHARS);
    let payload = payloads.next(); let index = 0;
    while (!payload.done) {
      const next = payloads.next();
      yield { kind: first ? "reference-payload" : "inline-payload", valueId, index: index++, final: Boolean(next.done), text: payload.value };
      payload = next;
    }
    if (!first) continue;
    const seen = new Set([lexicalReferenceKey(first)]);
    let pending = first; let ordinal = 0;
    for (const reference of references) {
      if (!reference) { yield null; continue; }
      const key = lexicalReferenceKey(reference);
      if (seen.has(key)) { yield null; continue; }
      seen.add(key);
      yield { kind: "reference-candidate", valueId, ordinal: ordinal++, final: false, ...pending };
      pending = reference;
    }
    yield { kind: "reference-candidate", valueId, ordinal, final: true, ...pending };
  }
}

/** Replay only the parser's bounded, finite body inputs; frontmatter reference payloads stay encoded. */
export class SourceBodyDecoder {
  private readonly body: ParsedBodyMetadata = { inlineFields: Object.create(null) as Record<string, unknown[]>, inlineFieldOccurrences: [], urls: [] };
  private current: StoredValueHeader | null = null;
  private pieces: string[] = [];
  private retainedBytes = 0;
  /** Consume a validated record; the budget also includes assembled inline values, not just chunks. */
  accept(record: StoredSourceFact): void {
    if (record.kind === "reference-value" || record.kind === "inline-value") { this.current = record; this.pieces = []; }
    if (record.kind === "body-url") {
      // All labels count toward the existing retained-body byte bound; none are silently truncated.
      this.reserve(record.url.length * 2 + (record.label?.length ?? 0) * 2 + 64);
      for (const alias of record.aliases ?? []) this.reserve(alias.length * 2 + 16);
      this.body.urls.push({ url: record.url, ...(record.label === undefined ? {} : { label: record.label }), ...(record.aliases === undefined ? {} : { aliases: [...record.aliases] }), ...(record.line === undefined ? {} : { line: record.line }) });
    }
    if ((record.kind !== "reference-payload" && record.kind !== "inline-payload") || this.current?.surface !== "inline") return;
    this.reserve(record.text.length * 2);
    this.pieces.push(record.text);
    if (!record.final) return;
    const header = this.current;
    const value = this.pieces.join(""); this.pieces = [];
    if (header.inlineMapIndex !== undefined) {
      const values = this.body.inlineFields[header.normalizedFieldName] ??= [];
      // Mismatched physical/map inputs can fill earlier positions later in the stream.
      if (Object.prototype.hasOwnProperty.call(values, header.inlineMapIndex)) throw new SourceFactError("invalid-frame", "values");
      this.reserve(Math.max(0, header.inlineMapIndex + 1 - values.length) * 8);
      values[header.inlineMapIndex] = value;
    }
    if (header.origin === "physical") {
      const coordinates = header.location;
      if (coordinates?.line === undefined || coordinates.start === undefined || coordinates.end === undefined || !header.syntax) throw new SourceFactError("invalid-frame", "values");
      this.reserve(128 + header.fieldName.length * 2 + header.normalizedFieldName.length * 2);
      this.body.inlineFieldOccurrences.push({ name: header.fieldName, normalizedName: header.normalizedFieldName, value,
        line: coordinates.line, start: coordinates.start, end: coordinates.end, syntax: header.syntax });
    }
  }
  /** Enforce one explicit assembly budget instead of accepting an arbitrarily large decoded value. */
  private reserve(bytes: number): void {
    this.retainedBytes += bytes;
    if (this.retainedBytes > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget", "values");
  }
  /** Return a body only after the caller has validated both complete family streams. */
  finish(): ParsedBodyMetadata {
    for (const values of Object.values(this.body.inlineFields)) {
      for (let index = 0; index < values.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(values, index)) throw new SourceFactError("invalid-frame", "values");
      }
    }
    return this.body;
  }
}

/** Derive small dependency postings from finite facts; no settings selection participates. */
export function* sourcePostingKeys(record: StoredSourceFact): IterableIterator<Readonly<{ kind: SourcePostingKind; key: string }>> {
  if (record.kind === "reference-value" || record.kind === "inline-value" || record.kind === "field-name" || record.kind === "date-property") {
    yield { kind: "field", key: record.normalizedFieldName };
  }
  if (record.kind === "reference-candidate" && !record.external || record.kind === "host-literal") yield { kind: "literal", key: record.rawTarget };
  if (record.kind === "host-link") yield { kind: record.state === "resolved" ? "target" : "literal", key: record.target };
  if ((record.kind === "reference-resolution" || record.kind === "literal-resolution" || record.kind === "date-property") && record.target) {
    yield { kind: "target", key: record.target.entity.id };
  }
}

/** Copy name-only discovery using the same normalizer as the accepted metadata collector. */
export function* sourceFieldNames(metadata: ParsedFileMetadata): IterableIterator<StoredMetadataFact> {
  for (const fieldName of Object.keys(metadata.frontmatter)) {
    const normalizedFieldName = normalizeFieldName(fieldName);
    if (normalizedFieldName) yield { kind: "field-name", fieldName, normalizedFieldName, surface: "frontmatter" };
  }
  for (const occurrence of metadata.inlineFieldOccurrences) {
    const normalizedFieldName = normalizeFieldName(occurrence.name);
    if (normalizedFieldName) yield { kind: "field-name", fieldName: occurrence.name, normalizedFieldName, surface: "inline" };
  }
}

/** SI4b1 immutable dependency pages; v5 facts and candidate postings retain their original schema. */
export const SOURCE_DEPENDENCY_STORE = "sourceDependencies";
export const SOURCE_DEPENDENCY_STATE_KEY = "source-dependency-state";
export const SOURCE_DEPENDENCY_ROOT_KEY = "source-dependency-root";
export const SOURCE_DEPENDENCY_BUILD_KEY = "source-dependency-build";
export const SOURCE_DEPENDENCY_BUCKETS = 1024;
export const SOURCE_DEPENDENCY_MAX_PAGES = 256;
export const SOURCE_DEPENDENCY_ROOT_BYTES = 1024 * 1024;
export const SOURCE_DEPENDENCY_MAX_BYTES = 128 * 1024 * 1024;
/** A dependency revision includes in-progress/unsaved mutations, unlike the durable head sequence. */
export type SourceDependencyFence = Readonly<{ revision: number; sequence: number }>;
/** Two reusable slots bound on-disk generations; generation tags prevent reuse from aliasing readers. */
export type SourceDependencyBuild = SourceDependencyFence & Readonly<{ generation: string; slot: 0 | 1 }>;
export type SourceDependencyPageManifest = Readonly<{ digest: string; bytes: number; records: number }>;
export type SourceDependencyBucketManifest = SourceDependencyPageManifest & Readonly<{ pages: number }>;
export type SourceDependencyPage = SourceDependencyPageManifest & Readonly<{
  slot: 0 | 1; generation: string; bucket: number; index: number; data: string;
}>;
/** A catalog root is checked against its checksum before any bucket can prove absence. */
export type SourceDependencyRootRecord = Readonly<{
  key: typeof SOURCE_DEPENDENCY_ROOT_KEY; build: SourceDependencyBuild; data: string; digest: string;
}>;
/** Duplicate finite control fields detect damaged counters without asynchronous hashing inside IDB. */
export type SourceDependencyState = Readonly<{
  key: typeof SOURCE_DEPENDENCY_STATE_KEY; revision: number; dirty: number; guard: string;
}>;
/** Produce the small mutation control record; its revision is independent of policy/settings. */
export function sourceDependencyState(revision: number, dirty: number): SourceDependencyState {
  return { key: SOURCE_DEPENDENCY_STATE_KEY, revision, dirty, guard: JSON.stringify([revision, dirty]) };
}
/** Reject missing/corrupt control records rather than treating an uncertain catalog as empty. */
export function validSourceDependencyState(value: unknown): value is SourceDependencyState {
  return sourceObject(value) && keys(value, ["key", "revision", "dirty", "guard"])
    && value.key === SOURCE_DEPENDENCY_STATE_KEY && sourceCount(value.revision) && sourceCount(value.dirty)
    && value.guard === JSON.stringify([value.revision, value.dirty]);
}
/** Strict generation/fence coordinates never normalize or derive a source identity. */
export function validSourceDependencyBuild(value: unknown): value is SourceDependencyBuild {
  return sourceObject(value) && keys(value, ["revision", "sequence", "generation", "slot"])
    && sourceCount(value.revision) && sourceCount(value.sequence) && text(value.generation)
    && (value.slot === 0 || value.slot === 1);
}
/** Validate page framing before decoding its bounded JSON payload or trusting its checksum. */
export function validSourceDependencyPage(value: unknown): value is SourceDependencyPage {
  return sourceObject(value) && keys(value, ["slot", "generation", "bucket", "index", "data", "digest", "bytes", "records"])
    && (value.slot === 0 || value.slot === 1) && text(value.generation)
    && sourceCount(value.bucket) && value.bucket < SOURCE_DEPENDENCY_BUCKETS
    && sourceCount(value.index) && value.index < SOURCE_DEPENDENCY_MAX_PAGES
    && typeof value.data === "string" && value.data.length <= SOURCE_CHUNK_TARGET_BYTES
    && typeof value.digest === "string" && /^[a-f0-9]{64}$/.test(value.digest)
    && sourceCount(value.bytes) && value.bytes <= SOURCE_CHUNK_TARGET_BYTES
    && sourceCount(value.records) && value.records > 0 && value.records <= SOURCE_MAX_BATCH_RECORDS;
}
/** Root validation is structural only; the discovery owner also verifies the full SHA-256 digest. */
export function validSourceDependencyRoot(value: unknown): value is SourceDependencyRootRecord {
  return sourceObject(value) && keys(value, ["key", "build", "data", "digest"])
    && value.key === SOURCE_DEPENDENCY_ROOT_KEY && validSourceDependencyBuild(value.build)
    && typeof value.data === "string" && value.data.length <= SOURCE_DEPENDENCY_ROOT_BYTES
    && typeof value.digest === "string" && /^[a-f0-9]{64}$/.test(value.digest);
}
/** A non-cryptographic shard selector only; integrity comes from the independent SHA-256 manifests. */
export function sourceDependencyBucket(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  return hash >>> 0 & (SOURCE_DEPENDENCY_BUCKETS - 1);
}
