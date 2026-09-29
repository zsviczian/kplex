/**
 * Streaming semantic source equality tokens for the Obsidian builder. Reference-bearing values
 * participate regardless of current ontology/image selectors; unrelated property values stay lazy.
 * One physical payload is hashed once, never once per target or in both topology/provenance lanes.
 * The caller supplies cached observations and owns host yields, cancellation and revision fencing.
 */
import type { ParsedFileMetadata } from "../core/parser/metadata";
import { iteratePropertyValueSteps, iterateReferencePayloadChunks, iterateReferenceScanSteps } from "../core/parser/referenceValues";

export type SourceFingerprintInputs = Readonly<{
  metadata: Pick<ParsedFileMetadata, "frontmatter" | "inlineFields" | "inlineFieldOccurrences" | "urls">;
  tags: readonly string[];
  resolved: readonly unknown[];
  unresolved: readonly unknown[];
  /** Existing finite presentation/alias/tag inputs; ontology/image settings are deliberately absent. */
  frontmatterFields: ReadonlySet<string>;
  inlineFields: ReadonlySet<string>;
  isDateProperty: (fieldName: string) => boolean;
}>;

type FingerprintToken = Readonly<{ part: "topology" | "provenance"; hashFragment: string }> | Readonly<{ part: "checkpoint" }>;
const HASH_CHUNK_CHARS = 2048;

/** Four independent rolling lanes, framed per token to avoid ambiguous concatenated value boundaries. */
class StreamingFingerprint {
  private length = 0;
  private a = 2166136261 >>> 0;
  private b = 3339675911 >>> 0;
  private c = 374761393 >>> 0;
  private d = 668265263 >>> 0;

  /** Hash a small token's length and text without retaining any serialized source data. */
  token(text: string): void { this.append(`${text.length}:`); this.append(text); }

  /** Continue lane state across bounded chunks; absolute offsets are part of the wider equality token. */
  private append(text: string): void {
    for (let offset = 0; offset < text.length; offset += 1) {
      const code = text.charCodeAt(offset);
      const index = this.length++;
      this.a = Math.imul(this.a ^ code, 16777619) >>> 0;
      this.b = Math.imul(this.b ^ (code + index), 2246822519) >>> 0;
      this.c = Math.imul(this.c ^ (code + (index << 1)), 3266489917) >>> 0;
      this.d = Math.imul(this.d ^ (code + (index >>> 1)), 2654435761) >>> 0;
    }
  }

  /** Return a compact value; no fact stream or shared provenance survives fingerprinting. */
  finish(): string { return [this.length, this.a, this.b, this.c, this.d].map((value) => value.toString(36)).join(":"); }
}

/** Split even unusually large field names/URL descriptors before the cooperative hash consumes them. */
function* tokens(part: "topology" | "provenance", text: string): IterableIterator<FingerprintToken> {
  for (let start = 0; start < text.length; start += HASH_CHUNK_CHARS) yield { part, hashFragment: text.slice(start, start + HASH_CHUNK_CHARS) };
}

/**
 * Stream settings-neutral reference inputs plus retained finite metadata and host summaries. Raw
 * values are serialized only after the grammar finds a reference (or a finite metadata consumer
 * needs them). Checkpoint markers cover ignored fields and nested non-reference leaves as well.
 */
export function* iterateSourceFingerprintTokens(input: SourceFingerprintInputs): IterableIterator<FingerprintToken> {
  for (const occurrence of iteratePropertyValueSteps(input.metadata)) {
    if (!occurrence) { yield { part: "checkpoint" }; continue; }
    const relevantMetadata = occurrence.surface === "frontmatter"
      ? input.frontmatterFields.has(occurrence.normalizedFieldName) || input.isDateProperty(occurrence.fieldName)
      : input.inlineFields.has(occurrence.normalizedFieldName);
    let relevant = relevantMetadata;
    if (!relevant && occurrence.normalizedFieldName) {
      for (const reference of iterateReferenceScanSteps(occurrence.value)) {
        yield { part: "checkpoint" };
        if (reference) { relevant = true; break; }
      }
    }
    if (relevant) {
      yield* tokens("topology", JSON.stringify(["field", occurrence.surface, occurrence.origin,
        occurrence.fieldName, occurrence.normalizedFieldName, occurrence.inlineMapIndex !== undefined]));
      for (const text of iterateReferencePayloadChunks(occurrence.value, HASH_CHUNK_CHARS)) yield { part: "topology", hashFragment: text };
      yield { part: "topology", hashFragment: "end-field" };
      // Locations/syntax do not alter topology. In particular the large raw value is NOT repeated here.
      yield* tokens("provenance", JSON.stringify(["field", occurrence.surface, occurrence.origin,
        occurrence.fieldName, occurrence.syntax, occurrence.location?.line, occurrence.location?.start, occurrence.location?.end]));
    }
    yield { part: "checkpoint" };
  }
  for (const [family, values] of [["tag", input.tags], ["resolved", input.resolved], ["unresolved", input.unresolved]] as const) {
    yield { part: "topology", hashFragment: family };
    for (const value of values) yield* tokens("topology", JSON.stringify(value));
  }
  yield { part: "topology", hashFragment: "urls" };
  for (const reference of input.metadata.urls) {
    yield* tokens("topology", JSON.stringify([reference.url, reference.label ?? ""]));
    yield* tokens("provenance", JSON.stringify(["url", reference.line ?? 0]));
  }
}

/** Synchronous parity seam for compact fixtures; production acquisition uses the cooperative path. */
export function sourceFingerprint(input: SourceFingerprintInputs): string {
  const topology = new StreamingFingerprint();
  const provenance = new StreamingFingerprint();
  for (const token of iterateSourceFingerprintTokens(input)) {
    if (token.part !== "checkpoint") (token.part === "topology" ? topology : provenance).token(token.hashFragment);
  }
  return `v3:${topology.finish()}~${provenance.finish()}`;
}

/** Hash the same stream with bounded work between host checkpoints; cancellation produces no token. */
export async function sourceFingerprintCooperative(input: SourceFingerprintInputs, checkpoint: () => Promise<boolean>): Promise<string | null> {
  const topology = new StreamingFingerprint();
  const provenance = new StreamingFingerprint();
  let hashedChars = 0;
  let scanSteps = 0;
  for (const token of iterateSourceFingerprintTokens(input)) {
    if (token.part === "checkpoint") scanSteps += 1;
    else {
      (token.part === "topology" ? topology : provenance).token(token.hashFragment);
      hashedChars += token.hashFragment.length;
    }
    // Bound actual hash work without allocating a Promise for every tiny URL/metadata token.
    if (hashedChars >= HASH_CHUNK_CHARS || scanSteps >= 32) {
      if (!(await checkpoint())) return null;
      hashedChars = 0; scanSteps = 0;
    }
  }
  return await checkpoint() ? `v3:${topology.finish()}~${provenance.finish()}` : null;
}
