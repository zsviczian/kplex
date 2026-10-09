/**
 * Defines the host-free compiler settings facade. SI1 settingsPolicy.ts owns invalidation;
 * the presentation members here remain only for finite compiler/binder compatibility until SI4.
 * Date fallback roles default to Parent for absent, historical-mode or unsupported settings.
 */
export type DatePropertyRelations = "parent" | "child" | "left" | "right" | "previous" | "next";

/** Accept supported fallback roles; interim modes and unsupported persisted values use Parent. */
export function sanitizeDatePropertyRelations(value: unknown): DatePropertyRelations {
  return value === "child" || value === "left" || value === "right" || value === "previous" || value === "next"
    ? value : "parent";
}

export type SemanticHierarchy = Readonly<{
  hidden: readonly string[];
  parents: readonly string[];
  children: readonly string[];
  leftFriends: readonly string[];
  rightFriends: readonly string[];
  previous: readonly string[];
  next: readonly string[];
  exclusions: readonly string[];
  friends?: readonly string[];
}>;

/** Historical compilation input, including prepared presentation output; not a validity signature. */
export type SemanticIndexSettings = Readonly<{
  hierarchy: SemanticHierarchy;
  inferAllLinksAsFriends: boolean;
  inverseInfer: boolean;
  datePropertyRelations?: DatePropertyRelations;
  showFullTagName: boolean;
  noteTypeField: string;
  primaryTagField: string;
  tagStyleList: readonly string[];
  maxLabelLength: number;
}>;
