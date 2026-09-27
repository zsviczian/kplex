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

/** Only settings that currently participate in semantic indexing/cache invalidation. */
export type SemanticIndexSettings = Readonly<{
  hierarchy: SemanticHierarchy;
  inferAllLinksAsFriends: boolean;
  inverseInfer: boolean;
  excalibrainFilepath: string;
  showFullTagName: boolean;
  noteTypeField: string;
  primaryTagField: string;
  tagStyleList: readonly string[];
  maxLabelLength: number;
}>;
