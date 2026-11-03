/** Explicit ontology inspection DTOs. Locations describe physical declarations in one inspected
 * saved source, never inferred relationships or historical evidence-coordinate replacement spans.
 * This host-free contract grants no file-write, source-publication or indexing capability. */

export type OntologyOccurrenceRequest = Readonly<{
  path: string;
  /** Names are looked up by the established normalized identity; results preserve physical spelling. */
  fields: readonly string[];
  limit?: number;
  /** SHA-256 of the exact previously inspected saved contents; omitted for initial inspection. */
  expectedSnapshot?: string;
}>;

export type OntologyPhysicalOccurrence = Readonly<{
  name: string;
  normalizedName: string;
  syntax: "frontmatter" | "line" | "parenthesized" | "bracketed";
  /** Half-open UTF-16 coordinates in the exact original string. YAML never fabricates text spans. */
  keyRange: Readonly<{start: number; end: number}> | null;
  /** One-based line, zero-based UTF-16 column; null for logical YAML locators. */
  line: number | null;
  column: number | null;
  /** Exact top-level property key for native processFrontMatter; no nested/path-string interpretation. */
  yamlKey: string | null;
}>;

export type OntologyInspectionUnsupported = Readonly<{
  surface: "frontmatter" | "body";
  reason: "invalid-yaml" | "non-mapping-yaml" | "yaml-limit" | "yaml-indirection" | "masked-key";
}>;

export type OntologyOccurrenceInspection = Readonly<{
  path: string;
  snapshot: Readonly<{id: string; authority: "saved"; mtime: number; size: number}>;
  occurrences: readonly OntologyPhysicalOccurrence[];
  unsupported: readonly OntologyInspectionUnsupported[];
  /** Complete describes only supported declarations in this source; never whole-vault coverage. */
  complete: boolean;
  truncated: boolean;
}>;

/** Finite request, source, YAML and result budgets enforced before the corresponding work. */
export const ONTOLOGY_OCCURRENCE_LIMITS = Object.freeze({fields:512, fieldCharacters:512,
  sourceBytes:1_048_576, sourceCharacters:1_048_576, yamlCharacters:65_536,
  yamlProperties:8_192, occurrences:1_024, defaultOccurrences:256, concurrency:1});
