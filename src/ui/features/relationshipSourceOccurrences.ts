/** Physical-source presentation shared by Connection details and connector navigation. Only
 * caller-supplied sections are grouped; this module reads no notes and classifies no relationships. */
import type {EvidenceDecision} from "../../core/graph/evidence";

export type PhysicalSourceSection = Readonly<{path: string; startLine: number; endLine: number;
  /** Exact source offsets distinguish repeated links inside one display paragraph. */
  occurrence?: Readonly<{start: number; end: number; line: number}>; incomplete?: boolean}>;
export type PhysicalSourceOccurrence<S extends PhysicalSourceSection> = {section: S; decisions: EvidenceDecision[]; priority: number};

/** Prefer explicit ontology ranges over overlapping generic host-link paragraphs, retaining
 * distinct nonoverlapping occurrences and all evidence annotations exactly as the inspector does. */
export function groupRelationshipSourceOccurrences<S extends PhysicalSourceSection>(decisions: readonly EvidenceDecision[],
  sections: ReadonlyMap<string, readonly S[]>): {groups: PhysicalSourceOccurrence<S>[]; unlocated: EvidenceDecision[]} {
  /** Display paragraphs are deliberately wider than their physical occurrences. */
  const range = (section: S): readonly [number, number] => section.occurrence
    ? [section.occurrence.start, section.occurrence.end] : [section.startLine, section.endLine];
  const occurrences = new Map<string, PhysicalSourceOccurrence<S>>(), unlocated: EvidenceDecision[] = [];
  for (const decision of decisions) {
    const rows = sections.get(decision.evidence.id) ?? [];
    if (!rows.length) {unlocated.push(decision);continue;}
    if (rows.some(/** An ambiguous native property must not disappear behind otherwise located body cards. */ row => row.incomplete)) unlocated.push(decision);
    const kind = decision.evidence.sourceKind;
    const priority = kind === "frontmatter-ontology" || kind === "inline-ontology" ? 0
      : kind === "body-url" || kind === "property-url" || kind === "date-property" ? 1 : 2;
    for (const section of rows) {
      const key = `${section.path}\u0000${section.occurrence ? "offset" : "line"}\u0000${range(section).join(":")}`, previous = occurrences.get(key);
      if (previous) {previous.decisions.push(decision);if (priority < previous.priority) {previous.section = section;previous.priority = priority;}}
      else occurrences.set(key, {section, decisions: [decision], priority});
    }
  }
  const groups: PhysicalSourceOccurrence<S>[] = [];
  for (const group of [...occurrences.values()].sort(/** Narrow explicit coordinates absorb generic paragraph mirrors first. */ (a,b) =>
    a.priority - b.priority || range(a.section)[1] - range(a.section)[0] - (range(b.section)[1] - range(b.section)[0]) || range(a.section)[0] - range(b.section)[0])) {
    const previous = groups.find(/** Overlapping descriptions of one physical source share one inspector card. */ candidate =>
      candidate.section.path === group.section.path && Boolean(candidate.section.occurrence) === Boolean(group.section.occurrence)
        && (candidate.section.occurrence
          ? range(candidate.section)[0] < range(group.section)[1] && range(group.section)[0] < range(candidate.section)[1]
          : range(candidate.section)[0] <= range(group.section)[1] && range(group.section)[0] <= range(candidate.section)[1]));
    if (previous) previous.decisions.push(...group.decisions);else groups.push(group);
  }
  groups.sort(/** Display order is native source path then line, independently of evidence insertion. */ (a,b) => a.section.path.localeCompare(b.section.path) || a.section.startLine - b.section.startLine || a.priority - b.priority);
  return {groups, unlocated};
}
