/**
 * Defines the host-free compiler settings facade. SI1 settingsPolicy.ts owns invalidation;
 * the presentation members here remain only for finite compiler/binder compatibility until SI4.
 */
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
  showFullTagName: boolean;
  noteTypeField: string;
  primaryTagField: string;
  tagStyleList: readonly string[];
  maxLabelLength: number;
}>;
