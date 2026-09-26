/** Relationship strength. Numeric values are persisted/consumed by legacy callers and must stay stable. */
export enum RelationType {
  DEFINED = 1,
  INFERRED = 2,
}

/** Direction from the current source perspective. Numeric values are compatibility-significant. */
export enum LinkDirection {
  TO = 1,
  FROM = 2,
  BOTH = 3,
}

export type Role = "parent" | "child" | "left" | "right" | "previous" | "next" | "sibling";
export type RelationshipRole = Exclude<Role, "sibling">;

/** Host-free semantic relation flags. The target binding stays generic and is supplied by the caller. */
export type SemanticRelation<TTarget> = {
  target: TTarget;
  direction: LinkDirection | null;
  isHidden: boolean;
  isParent: boolean;
  parentType?: RelationType;
  parentTypeDefinition?: string;
  isChild: boolean;
  childType?: RelationType;
  childTypeDefinition?: string;
  isLeftFriend: boolean;
  leftFriendType?: RelationType;
  leftFriendTypeDefinition?: string;
  isRightFriend: boolean;
  rightFriendType?: RelationType;
  rightFriendTypeDefinition?: string;
  isNextFriend: boolean;
  nextFriendType?: RelationType;
  nextFriendTypeDefinition?: string;
  isPreviousFriend: boolean;
  previousFriendType?: RelationType;
  previousFriendTypeDefinition?: string;
};

/** Minimal mutable target required by the resolver; host/file identity is deliberately absent. */
export type ResolverTarget<TTarget> = {
  path: string;
  neighbours: Map<string, SemanticRelation<TTarget>>;
};
