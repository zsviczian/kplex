/**
 * Settings-neutral property occurrence traversal and bounded provenance serialization. This module
 * reuses the canonical reference grammar; it neither resolves destinations nor selects graph roles.
 * Callers own cooperative checkpoints between yielded scan steps/chunks and source-revision fences.
 */
import { iterateLinkReferencesFromValue, normalizeFieldName, type ExtractedLinkReference, type ParsedFileMetadata } from "./metadata";

/** Borrowed input for one value; nested raw values are never copied into an occurrence database. */
export type PropertyValueOccurrence = Readonly<{
  fieldName: string;
  normalizedFieldName: string;
  surface: "frontmatter" | "inline";
  ordinal: number;
  origin: "physical" | "inline-map";
  inlineMapIndex?: number;
  value: unknown;
  syntax?: "line" | "parenthesized" | "bracketed";
  location?: Readonly<{ line: number; start: number; end: number }>;
}>;

/**
 * Walk physical values once. Matching inline map/occurrence inputs share a value; exceptional
 * map-only values remain distinct, without fabricating a location or ontology occurrence. Only
 * per-field counters and mismatched map positions are retained, not another per-file value array.
 * Null steps keep the final matched-map scan cooperative even when it emits no more occurrences.
 */
export function* iteratePropertyValueSteps(
  metadata: Pick<ParsedFileMetadata, "frontmatter" | "inlineFields" | "inlineFieldOccurrences">,
): IterableIterator<PropertyValueOccurrence | null> {
  let ordinal = 0;
  for (const fieldName in metadata.frontmatter) {
    if (!Object.prototype.hasOwnProperty.call(metadata.frontmatter, fieldName) || fieldName === "position") continue;
    yield { fieldName, normalizedFieldName: normalizeFieldName(fieldName), surface: "frontmatter",
      ordinal: ordinal++, origin: "physical", value: metadata.frontmatter[fieldName] };
  }
  const positions = new Map<string, number>();
  const mismatches = new Map<string, Set<number>>();
  ordinal = 0;
  for (const occurrence of metadata.inlineFieldOccurrences) {
    const field = occurrence.normalizedName;
    const index = positions.get(field) ?? 0;
    positions.set(field, index + 1);
    const values = metadata.inlineFields[field];
    const matchesMap = values !== undefined && index < values.length && values[index] === occurrence.value;
    if (values && index < values.length && !matchesMap) {
      const unmatched = mismatches.get(field) ?? new Set<number>();
      unmatched.add(index);
      mismatches.set(field, unmatched);
    }
    yield { fieldName: occurrence.name, normalizedFieldName: field, surface: "inline", ordinal: ordinal++,
      origin: "physical", ...(matchesMap ? { inlineMapIndex: index } : {}), value: occurrence.value,
      syntax: occurrence.syntax, location: { line: occurrence.line, start: occurrence.start, end: occurrence.end } };
  }
  for (const field in metadata.inlineFields) {
    if (!Object.prototype.hasOwnProperty.call(metadata.inlineFields, field)) continue;
    const values = metadata.inlineFields[field];
    for (let index = 0; index < values.length; index += 1) {
      if (index < (positions.get(field) ?? 0) && !mismatches.get(field)?.has(index)) { yield null; continue; }
      yield { fieldName: field, normalizedFieldName: field, surface: "inline", ordinal: ordinal++,
        origin: "inline-map", inlineMapIndex: index, value: values[index] };
    }
  }
}

/**
 * Emit canonical grammar matches and checkpoint markers, including for non-reference leaves.
 * Walking object members lazily avoids Object.values() copies of dense nested containers.
 */
export function* iterateReferenceScanSteps(value: unknown): IterableIterator<ExtractedLinkReference | null> {
  if (Array.isArray(value)) {
    for (const nested of value) yield* iterateReferenceScanSteps(nested);
  } else if (value && typeof value === "object") {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) yield* iterateReferenceScanSteps((value as Record<string, unknown>)[key]);
    }
  } else {
    yield* iterateLinkReferencesFromValue(value);
  }
  yield null;
}

/** Serialize a JSON string in bounded pieces, preserving escaping and surrogate-pair boundaries. */
function* quotedStringPieces(value: string, size: number): IterableIterator<string> {
  yield '"';
  for (let start = 0; start < value.length;) {
    let end = Math.min(value.length, start + size);
    const code = value.charCodeAt(end - 1);
    if (end < value.length && code >= 0xd800 && code <= 0xdbff) end += 1;
    yield JSON.stringify(value.slice(start, end)).slice(1, -1);
    start = end;
  }
  yield '"';
}

/** Stream ordinary metadata's JSON representation without a second nested-value clone/string. */
function* jsonPieces(value: unknown, size: number, key = "", applyToJson = true): IterableIterator<string> {
  if (applyToJson && value && typeof value === "object" && "toJSON" in value && typeof value.toJSON === "function") {
    const toJSON = value.toJSON as (key: string) => unknown;
    yield* jsonPieces(toJSON.call(value, key), size, key, false);
  } else if (typeof value === "string") {
    yield* quotedStringPieces(value, size);
  } else if (Array.isArray(value)) {
    yield "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index) yield ",";
      yield* jsonPieces(value[index], size, String(index));
    }
    yield "]";
  } else if (value && typeof value === "object") {
    yield "{";
    let first = true;
    for (const name in value) {
      if (!Object.prototype.hasOwnProperty.call(value, name)) continue;
      const nested = (value as Record<string, unknown>)[name];
      if (nested === undefined || typeof nested === "function" || typeof nested === "symbol") continue;
      if (!first) yield ",";
      first = false;
      yield* quotedStringPieces(name, size);
      yield ":";
      yield* jsonPieces(nested, size, name);
    }
    yield "}";
  } else {
    yield JSON.stringify(value) ?? "null";
  }
}

/**
 * The legacy raw-value contract is a bare top-level string or JSON for a list/object. Emit that
 * payload once in bounded chunks. No target count affects serialization work or retained bytes.
 */
export function* iterateReferencePayloadChunks(value: unknown, size = 16 * 1024): IterableIterator<string> {
  if (!Number.isSafeInteger(size) || size < 2) throw new Error("Invalid reference payload chunk size");
  if (typeof value === "string") {
    if (!value.length) yield "";
    for (let offset = 0; offset < value.length; offset += size) yield value.slice(offset, offset + size);
    return;
  }
  let pending = "";
  for (const piece of jsonPieces(value, size)) {
    for (let offset = 0; offset < piece.length;) {
      const take = Math.min(size - pending.length, piece.length - offset);
      pending += piece.slice(offset, offset + take);
      offset += take;
      if (pending.length === size) { yield pending; pending = ""; }
    }
  }
  if (pending) yield pending;
}
