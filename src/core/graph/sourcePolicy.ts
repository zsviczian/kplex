/**
 * Canonical, portable selection of neutral property references. Full compilation and source patches
 * use this same read state BEFORE seeding/materializing any graph entity. It retains only the active
 * value's selected provenance; dormant payload chunks are validated and discarded. No host lookup,
 * Markdown parsing, persistence or publication is performed here.
 */
import { normalizeFieldName } from "../contracts/fieldName";
import type { EvidenceRole } from "./evidence";
import {
  MAX_REFERENCE_PAYLOAD_CHARS,
  type NormalizedSourceRecord,
  type ReferenceCandidate,
  type ReferenceValueFact,
} from "./source";

/** Only settings that interpret reference candidates cross this boundary. */
export type ReferencePolicy = Readonly<{
  hierarchy: Readonly<{
    hidden: readonly string[];
    parents: readonly string[];
    children: readonly string[];
    leftFriends: readonly string[];
    rightFriends: readonly string[];
    previous: readonly string[];
    next: readonly string[];
  }>;
  thumbnailProperty?: string;
  nodeImageProperty?: string;
}>;

/** Configured labels belong to interpretation, never physical source identity. */
export type ReferenceAssignment = Readonly<{
  configuredFieldName: string;
  normalizedFieldName: string;
  role: EvidenceRole;
  fieldOrder: number;
  assignmentOrder: number;
}>;

/** Shared immutable selection for every candidate in one physical value. */
export type ReferenceSelection = Readonly<{
  assignments: readonly ReferenceAssignment[];
  image: boolean;
}>;

/** A selected candidate is an internal compiler operation, not an acquired source fact. */
export type SelectedReferenceCandidate = Omit<ReferenceCandidate, "kind"> & Readonly<{
  kind: "selected-reference";
  value: ReferenceValueFact;
  selection: ReferenceSelection;
  /** Joined once for an active ontology value and shared by all of its evidence declarations. */
  rawValue?: string;
}>;

/** Inputs the graph compiler/patch seeder may consume after neutral reference selection. */
export type SelectedSourceRecord = Exclude<NormalizedSourceRecord,
  { kind: "reference-value" | "reference-payload" | "reference-candidate" }> | SelectedReferenceCandidate;

/** Capture configured group/order/multiplicity once; normalized-equivalent exact labels stay distinct. */
export class ReferencePolicySelector {
  private readonly assignmentsByField = new Map<string, ReferenceAssignment[]>();
  private readonly images = new Set<string>();

  /** Copy finite settings inputs; later in-place caller mutations cannot alter an open source read. */
  constructor(policy: ReferencePolicy) {
    const groups: ReadonlyArray<readonly [readonly string[], EvidenceRole]> = [
      [policy.hierarchy.hidden, "hidden"], [policy.hierarchy.parents, "parent"],
      [policy.hierarchy.children, "child"], [policy.hierarchy.leftFriends, "left"],
      [policy.hierarchy.rightFriends, "right"], [policy.hierarchy.previous, "previous"],
      [policy.hierarchy.next, "next"],
    ];
    const exact = new Map<string, ReferenceAssignment[]>();
    for (const [fields, role] of groups) {
      for (const configuredFieldName of fields) {
        const normalizedFieldName = normalizeFieldName(configuredFieldName);
        if (!normalizedFieldName) continue;
        let assignments = exact.get(configuredFieldName);
        if (!assignments) { assignments = []; exact.set(configuredFieldName, assignments); }
        assignments.push({ configuredFieldName, normalizedFieldName, role,
          fieldOrder: 0, assignmentOrder: assignments.length });
      }
    }
    let fieldOrder = 0;
    for (const assignments of exact.values()) {
      const normalized = assignments[0].normalizedFieldName;
      const selected = this.assignmentsByField.get(normalized) ?? [];
      for (const assignment of assignments) selected.push({ ...assignment, fieldOrder });
      this.assignmentsByField.set(normalized, selected);
      fieldOrder += 1;
    }
    for (const field of [policy.thumbnailProperty ?? "thumbnail", policy.nodeImageProperty ?? "node-image"]) {
      const normalized = normalizeFieldName(field);
      if (normalized) this.images.add(normalized);
    }
  }

  /** Select from source observations only; frontmatter precedence remains the existing resolver's job. */
  select(value: ReferenceValueFact): ReferenceSelection {
    return {
      assignments: value.origin === "inline-map" ? [] : this.assignmentsByField.get(value.normalizedFieldName) ?? [],
      image: this.images.has(value.normalizedFieldName)
        && (value.surface === "frontmatter" || value.inlineMapIndex !== undefined),
    };
  }
}

type ActiveValue = {
  value: ReferenceValueFact;
  selection: ReferenceSelection;
  chunks: string[];
  rawValue?: string;
  nextChunk: number;
  nextCandidate: number;
  payloadComplete: boolean;
  candidatesComplete: boolean;
};

export type SourceSelectionResult = Readonly<{ accepted: false }>
  | Readonly<{ accepted: true; record?: SelectedSourceRecord }>;

/** Sequential value/payload/candidate decoder for one independently fenced normalized source read. */
export class ReferenceSourcePolicyRead {
  private active?: ActiveValue;

  /** Share the compiler's captured policy while keeping payload lifetime local to this producer read. */
  constructor(private readonly selector: ReferencePolicySelector) {}

  /** Reject truncated values even when the enclosing record-count cursor has reached finality. */
  canComplete(): boolean {
    return !this.active || (this.active.payloadComplete && this.active.candidatesComplete
      && this.active.nextCandidate > 0);
  }

  /** Release the last value after finality; no neutral whole-vault representation is retained by SI2. */
  release(): void { this.active = undefined; }

  /** Validate source/value/chunk order, then select before exposing a target to any graph consumer. */
  accept(record: NormalizedSourceRecord): SourceSelectionResult {
    if (record.kind === "reference-value") {
      if (!this.canComplete() || !record.normalizedFieldName || !Number.isSafeInteger(record.ordinal) || record.ordinal < 0) return { accepted: false };
      this.active = { value: record, selection: this.selector.select(record), chunks: [],
        nextChunk: 0, nextCandidate: 0, payloadComplete: false, candidatesComplete: false };
      return { accepted: true };
    }
    if (record.kind !== "reference-payload" && record.kind !== "reference-candidate") return { accepted: true, record };
    const active = this.active;
    if (!active || record.valueId !== active.value.valueId || record.source.id !== active.value.source.id
      || record.sourceRevision !== active.value.sourceRevision) return { accepted: false };
    if (record.kind === "reference-payload") {
      if (active.payloadComplete || record.index !== active.nextChunk || record.text.length > MAX_REFERENCE_PAYLOAD_CHARS) return { accepted: false };
      active.nextChunk += 1;
      if (active.selection.assignments.length) active.chunks.push(record.text);
      if (record.final) {
        active.payloadComplete = true;
        if (active.selection.assignments.length) active.rawValue = active.chunks.join("");
        active.chunks = [];
      }
      return { accepted: true };
    }
    if (!active.payloadComplete || active.candidatesComplete || record.ordinal !== active.nextCandidate) return { accepted: false };
    active.nextCandidate += 1;
    active.candidatesComplete = record.final;
    if (!active.selection.assignments.length && !active.selection.image) return { accepted: true };
    return { accepted: true, record: { ...record, kind: "selected-reference", value: active.value,
      selection: active.selection, ...(active.rawValue === undefined ? {} : { rawValue: active.rawValue }) } };
  }
}
