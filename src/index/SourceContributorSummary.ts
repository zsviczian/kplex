/**
 * Policy-neutral per-owner dependency summaries and exact local membership-delta preparation.
 * The canonical replay and its awaited stored-fact observer supply every key in four family visits;
 * no Markdown grammar, resolver, role classifier, source writer or graph mirror lives here. A ready
 * summary proves one selected read only, not host-wide impact closure or index/root publication.
 * Discovery owns persisted page authentication; SourceRepository continues to own source leases.
 */
import type { NormalizedSourceRecord, SourceEntityRef } from "../core/graph/source";
import {
  SOURCE_CHUNK_TARGET_BYTES, SOURCE_DECODE_BUDGET_BYTES, SOURCE_MAX_BATCH_RECORDS, SourceFactError, sourceCount, sourceObject, validSourceTarget,
  type StoredSourceFact,
} from "./SourceFacts";
import { CachedSourceReplay, type CachedSourceRequest, type SourceReplayRuntime, type SourceReplayWork } from "./SourceReplay";
import { selectedSourceFailure, type NeutralSourceRepository, type SelectedSourceResult } from "./SourceRepository";

/** The budget reserves encoded strings, retained UTF-16 keys and set/array bookkeeping together. */
export const CONTRIBUTOR_OWNER_SUMMARY_BUDGET = SOURCE_DECODE_BUDGET_BYTES;
/** A source-local selection, deliberately neither a graph certificate nor an absence certificate. */
export type ContributorOwnerSummary = Readonly<{
  version: 1;
  sourceId: string;
  sourceRevision: string;
  sequence: number | null;
  source: SourceEntityRef;
  keys: readonly string[];
}>;
/** Absence must come from a separate authoritative proof; a missing/corrupt summary is not absence. */
export type ContributorOwnerState = Readonly<{ kind: "present"; summary: ContributorOwnerSummary }>
  | Readonly<{ kind: "absent"; sourceId: string }>;
/**
 * A private source-local plan. Even no key change requires selecting the new summary/head together.
 * Its affected keys do not close changed host topology, resolver referrers, or other dirty owners.
 */
export type ContributorOwnerDelta = Readonly<{
  sourceId: string;
  previous: ContributorOwnerState;
  next: ContributorOwnerState;
  removedKeys: readonly string[];
  addedKeys: readonly string[];
  affectedKeys: readonly string[];
}>;

/** Exact JSON tuples keep kind and opaque identities separate, including escaped lone surrogates. */
export function contributorKey(kind: "node" | "field" | "literal" | "family" | "source" | "host" | "summary", value: string): string {
  return JSON.stringify([kind, value]);
}
/** Project canonical facts without deciding semantic roles, target precedence or tag ancestry. */
export function* contributorRecordKeys(record: NormalizedSourceRecord): IterableIterator<string> {
  if (record.kind === "entity") { yield contributorKey("node", record.entity.id); return; }
  if (record.kind === "reference-value" || record.kind === "field-name") yield contributorKey("field", record.normalizedFieldName);
  if (record.kind === "reference-candidate" || record.kind === "obsidian-link" || record.kind === "unresolved-link"
    || record.kind === "date-property" || record.kind === "body-url" || record.kind === "file-tree" || record.kind === "tag-tree") {
    yield contributorKey("node", record.target.entity.id);
    yield contributorKey("literal", record.target.rawTarget);
  }
  if (record.kind === "body-url" && record.origin) yield contributorKey("node", record.origin.entity.id);
  if (record.kind === "file-tree" || record.kind === "tag-tree") yield contributorKey("node", record.source.id);
  if (record.kind === "tag-tree") yield contributorKey("family", "tag-tree");
  if (record.kind === "date-property" && record.provenance?.normalizedFieldName) yield contributorKey("field", record.provenance.normalizedFieldName);
}
/**
 * Retain genuine spellings and selected targets hidden by normalized target deduplication. Null
 * bindings still contribute their lexical key through the stored candidate/host-literal frame.
 * These are dependency keys, not sufficient descriptors for a future warm host-validation proof.
 */
export function* contributorStoredKeys(record: StoredSourceFact): IterableIterator<string> {
  if (record.kind === "reference-candidate" || record.kind === "host-literal") yield contributorKey("literal", record.rawTarget);
  else if ((record.kind === "reference-resolution" || record.kind === "literal-resolution") && record.target) {
    yield contributorKey("node", record.target.entity.id);
  }
}
/** Charge the exact JSON encoding plus conservative retained-key and set/array storage. */
function keyReservation(key: string): number {
  return new TextEncoder().encode(JSON.stringify(key)).byteLength + key.length * 2 + 96;
}
/** Accept canonical dependency tuples only; owner/host/summary lookup keys are not memberships. */
export function validContributorMembershipKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const tuple: unknown = JSON.parse(value);
    return Array.isArray(tuple) && tuple.length === 2 && typeof tuple[0] === "string"
      && ["node", "field", "literal", "family"].includes(tuple[0])
      && typeof tuple[1] === "string" && JSON.stringify(tuple) === value;
  } catch { return false; }
}
/**
 * Validate detached/untrusted summary shape and exact sorted, unique membership coverage. This
 * checks representation, not authority: the caller must authenticate the original summary and head.
 */
export function validContributorOwnerSummary(value: unknown): value is ContributorOwnerSummary {
  if (!sourceObject(value) || Object.keys(value).length !== 6 || value.version !== 1
    || typeof value.sourceId !== "string" || !value.sourceId || typeof value.sourceRevision !== "string" || !value.sourceRevision
    || value.sequence !== null && (!sourceCount(value.sequence) || value.sequence < 1)
    || !validSourceTarget({ entity: value.source, rawTarget: "", resolvedBy: "host" })
    || !sourceObject(value.source) || typeof value.source.id !== "string" || value.source.kind !== "document" || value.source.state !== "materialized"
    || typeof value.source.physicalPath !== "string" || !value.source.physicalPath || !Array.isArray(value.keys) || !value.keys.length) return false;
  let previous: string | undefined, reserved = 0, self = false;
  for (const key of value.keys) {
    if (!validContributorMembershipKey(key) || previous !== undefined && previous >= key) return false;
    reserved += keyReservation(key);
    if (reserved > CONTRIBUTOR_OWNER_SUMMARY_BUDGET) return false;
    self ||= key === contributorKey("node", value.source.id);
    previous = key;
  }
  return self;
}

/**
 * Prepare one complete neutral dependency set under the existing selected-head read and lease.
 * Exactly four family visits produce both normalized and otherwise dormant/duplicate lexical keys.
 * A cancelled observer, missing frame, superseded head, or exhausted budget exposes no summary.
 * Unsaved ready SI4a reads retain sequence=null; callers must reject them for durable certification.
 */
export async function summarizeContributorOwner(repository: NeutralSourceRepository, request: CachedSourceRequest,
  runtime: SourceReplayRuntime): Promise<SelectedSourceResult<Readonly<{ summary: ContributorOwnerSummary; work: SourceReplayWork }>>> {
  const keys = new Set<string>();
  let reserved = 0;
  /** Deduplicate only the dependency set; the semantic replay still receives every original record. */
  const add = (key: string): void => {
    if (keys.has(key)) return;
    reserved += keyReservation(key);
    if (reserved > CONTRIBUTOR_OWNER_SUMMARY_BUDGET) throw new SourceFactError("memory-budget");
    keys.add(key);
  };
  try {
    add(contributorKey("node", request.host.source.id));
    const selected = await new CachedSourceReplay(repository).read(request, runtime,
      /** Capture canonical normalized incidence; no records escape or outlive this bounded read. */
      (batch) => {
        for (const record of batch.records) for (const key of contributorRecordKeys(record)) add(key);
        return runtime.isCurrent() && request.host.isCurrent();
      },
      /** Capture only neutral lexical dependencies from the same validated four-family stream. */
      (_family, records) => {
        for (const record of records) for (const key of contributorStoredKeys(record)) add(key);
        return runtime.isCurrent() && request.host.isCurrent();
      });
    if (selected.outcome !== "ready") return selected;
    const summary: ContributorOwnerSummary = { version: 1, sourceId: request.sourceId,
      sourceRevision: selected.stamp.head.sourceRevision, sequence: selected.stamp.sequence,
      source: { ...request.host.source }, keys: [...keys].sort() };
    if (!validContributorOwnerSummary(summary) || summary.source.physicalPath !== selected.stamp.head.physical.path) {
      return selectedSourceFailure("dependency-invalid");
    }
    if (!runtime.isCurrent() || !request.host.isCurrent()) return selectedSourceFailure("cancelled");
    return { outcome: "ready", stamp: selected.stamp, value: { summary, work: selected.value.work } };
  } catch (error) { return selectedSourceFailure(error instanceof SourceFactError ? error.reason : "read-error"); }
}

/** Validate and copy a private state so later caller mutations cannot alter an already prepared delta. */
function copyState(state: ContributorOwnerState): ContributorOwnerState {
  if (!sourceObject(state) || Object.keys(state).length !== 2) throw new SourceFactError("dependency-invalid");
  if (state.kind === "absent" && typeof state.sourceId === "string" && state.sourceId) return { kind: "absent", sourceId: state.sourceId };
  if (state.kind !== "present" || !validContributorOwnerSummary(state.summary)) throw new SourceFactError("dependency-invalid");
  return { kind: "present", summary: { ...state.summary, source: { ...state.summary.source }, keys: [...state.summary.keys] } };
}
/** Return the explicitly supplied source identity; never infer it from a node or either path facet. */
function stateSourceId(state: ContributorOwnerState): string { return state.kind === "present" ? state.summary.sourceId : state.sourceId; }
/**
 * Merge two authenticated, sorted source-local sets in linear time without revisiting any family.
 * Deletion uses the old summary and explicit absence, so requires zero family visits. Rename is
 * two owner deltas when SourceId changes; recreation may replace an incarnation at the same SourceId.
 * Missing summaries throw rather than being treated as empty. This plan cannot retire dirty tickets
 * or certify a negative: the eventual transaction owner still owes old/new head, host, root and CAS
 * proofs, including third-party resolver/structural fan-out beyond this owner's direct keys.
 */
export function prepareContributorOwnerDelta(previous: ContributorOwnerState, next: ContributorOwnerState): ContributorOwnerDelta {
  const before = copyState(previous), after = copyState(next), sourceId = stateSourceId(before);
  if (stateSourceId(after) !== sourceId) throw new SourceFactError("dependency-invalid");
  const oldKeys = before.kind === "present" ? before.summary.keys : [];
  const newKeys = after.kind === "present" ? after.summary.keys : [];
  const removedKeys: string[] = [], addedKeys: string[] = [], affectedKeys: string[] = [];
  let oldIndex = 0, newIndex = 0;
  while (oldIndex < oldKeys.length || newIndex < newKeys.length) {
    const oldKey = oldKeys[oldIndex], newKey = newKeys[newIndex];
    if (newKey === undefined || oldKey !== undefined && oldKey < newKey) {
      removedKeys.push(oldKey); affectedKeys.push(oldKey); oldIndex++;
    } else if (oldKey === undefined || newKey < oldKey) {
      addedKeys.push(newKey); affectedKeys.push(newKey); newIndex++;
    } else { affectedKeys.push(oldKey); oldIndex++; newIndex++; }
  }
  return { sourceId, previous: before, next: after, removedKeys, addedKeys, affectedKeys };
}

/** Original per-owner commitments make missing summary pages invalid rather than a smaller set. */
export type ContributorSummaryManifest = Readonly<{ pages: number; records: number; bytes: number; digest: string }>;
/** A page keeps whole exact keys; an indivisible oversized key is non-ready until C3 continuation. */
export type ContributorSummaryPage = Readonly<{ index: number; keys: readonly string[]; data: string; bytes: number }>;
/** Validate finite page/count bounds independently of the bucket manifest that stores these pages. */
export function validContributorSummaryManifest(value: unknown): value is ContributorSummaryManifest {
  return sourceObject(value) && Object.keys(value).length === 4
    && sourceCount(value.pages) && value.pages > 0 && value.pages <= CONTRIBUTOR_OWNER_SUMMARY_BUDGET / 96
    && sourceCount(value.records) && value.records >= value.pages && value.records <= value.pages * SOURCE_MAX_BATCH_RECORDS
    && sourceCount(value.bytes) && value.bytes >= value.pages * 3 && value.bytes <= Math.min(CONTRIBUTOR_OWNER_SUMMARY_BUDGET, value.pages * SOURCE_CHUNK_TARGET_BYTES)
    && typeof value.digest === "string" && /^[a-f0-9]{64}$/.test(value.digest);
}
/**
 * Partition a validated sorted owner set with both record and actual encoded-byte limits. The caller
 * reserves its row envelope, including escaped opaque SourceId, before requesting these pages.
 * This is storage paging only, not a ready-prefix/semantic-consumer continuation API.
 */
export function* contributorSummaryPages(keys: readonly string[], maximumBytes: number): IterableIterator<ContributorSummaryPage> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 2 || maximumBytes > SOURCE_CHUNK_TARGET_BYTES) throw new SourceFactError("backpressure");
  let page: string[] = [], size = 2, index = 0;
  for (const key of keys) {
    const encoded = new TextEncoder().encode(JSON.stringify(key)).byteLength;
    if (encoded + 2 > maximumBytes) throw new SourceFactError("backpressure");
    if (page.length && (page.length >= SOURCE_MAX_BATCH_RECORDS || size + encoded + 1 > maximumBytes)) {
      yield { index: index++, keys: page, data: JSON.stringify(page), bytes: size };
      page = []; size = 2;
    }
    size += encoded + (page.length ? 1 : 0); page.push(key);
  }
  if (page.length) yield { index, keys: page, data: JSON.stringify(page), bytes: size };
}
/** Bind ordered summary pages to the exact source selection, not just a surviving list of keys. */
export function contributorSummaryPageCommitment(previous: string, sourceId: string, sourceRevision: string,
  sequence: number, index: number, page: Readonly<{ digest: string; bytes: number; records: number }>): string {
  return JSON.stringify(["contributor-owner-page-v1", previous, sourceId, sourceRevision, sequence,
    index, page.digest, page.bytes, page.records]);
}
