import { LinkDirection, RelationType, type Role, type SemanticRelation } from "./relations";

export type EvidenceRole = Exclude<Role, "sibling"> | "hidden";

export type EvidenceSourceKind =
  | "obsidian-link"
  | "unresolved-link"
  | "frontmatter-ontology"
  | "inline-ontology"
  | "body-url"
  | "date-property"
  | "file-tree"
  | "tag-tree"
  | "url-origin";

export type EvidenceProvenance = {
  sourceKind: EvidenceSourceKind;
  definition?: string;
  fieldName?: string;
  rawValue?: string;
  line?: number;
  /** Character offsets in the declaring Markdown file when the evidence came from a body field. */
  start?: number;
  end?: number;
};

export type RelationEvidence = EvidenceProvenance & {
  id: string;
  sourcePath: string;
  targetPath: string;
  role: EvidenceRole;
  relationType: RelationType;
  direction: LinkDirection;
  /** The note/node that originally declared the relationship before the inverse view was generated. */
  declaredByPath: string;
  /** The original declaration target before the inverse view was generated. */
  declaredTargetPath: string;
  declaredRole: EvidenceRole;
};

export type EvidenceDecision = {
  evidence: RelationEvidence;
  active: boolean;
  suppressionReason?: string;
};

const inverseDirection = (direction: LinkDirection): LinkDirection => {
  if (direction === LinkDirection.FROM) return LinkDirection.TO;
  if (direction === LinkDirection.TO) return LinkDirection.FROM;
  return direction;
};

const inverseRole = (role: EvidenceRole): EvidenceRole | null => {
  switch (role) {
    case "parent": return "child";
    case "child": return "parent";
    case "left": return "left";
    case "right": return "right";
    case "previous": return "next";
    case "next": return "previous";
    case "hidden": return null;
  }
};

const pairKey = (a: string, b: string): string => a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
const splitPairKey = (key: string): [string, string] => {
  const splitAt = key.indexOf("\u0000");
  return [key.slice(0, splitAt), key.slice(splitAt + 1)];
};

/**
 * Stores immutable graph evidence separately from the resolved relationship model.
 * This deliberately preserves evidence that loses a precedence decision so K-Plex can explain
 * the visible result and can later edit the original source instead of relying on hidden state.
 */
export class RelationEvidenceStore {
  private nextId: number;
  /**
   * Incremental patches stage evidence in a copy-on-write fork. Reads fall through to the previous
   * published store, while only touched pair buckets are copied locally. Publishing the fork is an
   * O(1) pointer swap, so a note with thousands of URLs never needs to mutate the live store while
   * yielding back to Obsidian.
   */
  private readonly base: RelationEvidenceStore | null;
  /** Pair buckets owned by this layer. An empty array is a tombstone that shadows a base bucket. */
  private readonly byPair = new Map<string, RelationEvidence[]>();
  /** Pair keys overridden/created by this layer, indexed by either endpoint. */
  private readonly pairsByPath = new Map<string, Set<string>>();
  private declarationTotal: number;
  private pairTotal: number;
  private readonly layerDepth: number;

  constructor(base: RelationEvidenceStore | null = null) {
    this.base = base;
    this.nextId = base?.nextId ?? 1;
    this.declarationTotal = base?.declarationCount ?? 0;
    this.pairTotal = base?.pairCount ?? 0;
    this.layerDepth = (base?.depth ?? 0) + (base ? 1 : 0);
  }

  get declarationCount(): number { return this.declarationTotal; }
  get pairCount(): number { return this.pairTotal; }
  get depth(): number { return this.layerDepth; }

  /** Start an isolated local transaction. Mutating the returned store cannot mutate this store. */
  fork(): RelationEvidenceStore { return new RelationEvidenceStore(this); }

  /**
   * Collapse a copy-on-write chain into one standalone store. The current store remains published
   * and untouched until the caller swaps in the completed result, so cancellation cannot expose a
   * partial compaction. Pair insertion order follows the oldest layer while newer layers replace
   * values in place, matching the observable order of `allPairKeys()`.
   */
  async compactCooperative(checkpoint: () => Promise<boolean>): Promise<RelationEvidenceStore | null> {
    if (!this.base) return this;
    const layers: RelationEvidenceStore[] = [this];
    let baseLayer: RelationEvidenceStore | null = this.base;
    while (baseLayer) {
      layers.push(baseLayer);
      baseLayer = baseLayer.base;
    }
    layers.reverse();

    const latest = new Map<string, RelationEvidence[]>();
    let processed = 0;
    for (const layer of layers) {
      for (const [key, declarations] of layer.byPair) {
        latest.set(key, declarations);
        processed += 1;
        if ((processed & 255) === 0 && !(await checkpoint())) return null;
      }
    }

    const compacted = new RelationEvidenceStore();
    for (const [key, declarations] of latest) {
      if (declarations.length) compacted.writePair(key, [...declarations], 0);
      processed += declarations.length + 1;
      if ((processed & 255) === 0 && !(await checkpoint())) return null;
    }
    compacted.nextId = this.nextId;
    return compacted;
  }

  addPair(
    sourcePath: string,
    targetPath: string,
    role: Exclude<EvidenceRole, "hidden">,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
  ): void {
    if (sourcePath === targetPath) return;
    const declarationId = `ev-${this.nextId++}`;
    this.addDeclarationRecord({
      id: `${declarationId}:forward`,
      sourcePath,
      targetPath,
      role,
      relationType,
      direction,
      declaredByPath: sourcePath,
      declaredTargetPath: targetPath,
      declaredRole: role,
      ...provenance,
    });
  }

  addHidden(sourcePath: string, targetPath: string, provenance: EvidenceProvenance): void {
    if (sourcePath === targetPath) return;
    const declarationId = `ev-${this.nextId++}`;
    this.addDeclarationRecord({
      id: `${declarationId}:forward`,
      sourcePath,
      targetPath,
      role: "hidden",
      relationType: RelationType.DEFINED,
      direction: LinkDirection.FROM,
      declaredByPath: sourcePath,
      declaredTargetPath: targetPath,
      declaredRole: "hidden",
      ...provenance,
    });
  }

  /**
   * Rehydrate one original declaration from a persisted compact snapshot. Perspective-specific
   * inverse evidence remains virtual and is regenerated on demand.
   */
  addDeclaration(
    sourcePath: string,
    targetPath: string,
    role: EvidenceRole,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
  ): void {
    if (role === "hidden") {
      this.addHidden(sourcePath, targetPath, provenance);
      return;
    }
    this.addPair(sourcePath, targetPath, role, relationType, direction, provenance);
  }

  between(sourcePath: string, targetPath: string): RelationEvidence[] {
    if (sourcePath === targetPath) return [];
    const declarations = this.readPair(pairKey(sourcePath, targetPath));
    if (!declarations?.length) return [];
    const output: RelationEvidence[] = [];
    for (const item of declarations) {
      if (item.declaredByPath === sourcePath && item.declaredTargetPath === targetPath) {
        output.push(item);
        continue;
      }
      if (item.declaredByPath !== targetPath || item.declaredTargetPath !== sourcePath) continue;
      const role = inverseRole(item.declaredRole);
      if (!role) continue; // Hidden evidence is intentionally directional.
      output.push({
        ...item,
        id: item.id.replace(/:forward$/, ":reverse"),
        sourcePath,
        targetPath,
        role,
        direction: inverseDirection(item.direction),
      });
    }
    return output;
  }

  /** Original declarations for exactly one unordered pair. Useful for staged relationship work. */
  declarationsForPair(sourcePath: string, targetPath: string): RelationEvidence[] {
    return [...(this.readPair(pairKey(sourcePath, targetPath)) ?? [])];
  }

  from(sourcePath: string): Array<{ targetPath: string; evidence: RelationEvidence[] }> {
    const output: Array<{ targetPath: string; evidence: RelationEvidence[] }> = [];
    const keys = this.pairKeysForPath(sourcePath);
    if (!keys.size) return output;
    for (const key of keys) {
      const [left, right] = splitPairKey(key);
      const targetPath = left === sourcePath ? right : left;
      const evidence = this.between(sourcePath, targetPath);
      if (evidence.length) output.push({ targetPath, evidence });
    }
    return output;
  }

  /** Original declarations whose unordered pair touches one path. */
  declarationsTouching(path: string): RelationEvidence[] {
    const output: RelationEvidence[] = [];
    for (const item of this.declarationsTouchingIterator(path)) output.push(item);
    return output;
  }

  /**
   * Rename one graph endpoint without rescanning any Markdown. Only pair buckets touching the old
   * path are rewritten, so work is proportional to the renamed note's degree rather than vault
   * size. Declaration ids and provenance are retained; a declaration that would become a self-link
   * after merging into an unresolved placeholder is dropped.
   */
  renamePath(oldPath: string, newPath: string): Set<string> {
    const touched = new Set<string>();
    if (!oldPath || !newPath || oldPath === newPath) return touched;

    const keys = [...this.pairKeysForPath(oldPath)];
    if (!keys.length) return touched;
    const declarations: RelationEvidence[] = [];
    for (const key of keys) {
      const current = this.readPair(key) ?? [];
      declarations.push(...current);
      const [left, right] = splitPairKey(key);
      touched.add(left === oldPath ? newPath : left);
      touched.add(right === oldPath ? newPath : right);
      this.writePair(key, [], current.length);
    }

    for (const item of declarations) {
      const declaredByPath = item.declaredByPath === oldPath ? newPath : item.declaredByPath;
      const declaredTargetPath = item.declaredTargetPath === oldPath ? newPath : item.declaredTargetPath;
      if (declaredByPath === declaredTargetPath) continue;
      this.addDeclarationRecord({
        ...item,
        sourcePath: item.sourcePath === oldPath ? newPath : item.sourcePath,
        targetPath: item.targetPath === oldPath ? newPath : item.targetPath,
        declaredByPath,
        declaredTargetPath,
      });
    }
    touched.delete(oldPath);
    touched.add(newPath);
    return touched;
  }

  /** Allocation-light iterator used by time-sliced incremental patches. */
  *declarationsTouchingIterator(path: string): IterableIterator<RelationEvidence> {
    for (const key of this.pairKeysForPath(path)) {
      const list = this.readPair(key);
      if (list?.length) yield* list;
    }
  }

  /** Remove complete original declarations matching a predicate. */
  removeDeclarations(predicate: (evidence: RelationEvidence) => boolean): number {
    let removed = 0;
    for (const key of this.allPairKeys()) {
      const current = this.readPair(key) ?? [];
      if (!current.length) continue;
      const next = current.filter((item) => {
        if (!predicate(item)) return true;
        removed += 1;
        return false;
      });
      if (next.length !== current.length) this.writePair(key, next, current.length);
    }
    return removed;
  }

  /** Fast path used by per-file incremental indexing. */
  removeDeclarationsTouching(path: string, predicate: (evidence: RelationEvidence) => boolean): number {
    let removed = 0;
    for (const key of this.pairKeysForPath(path)) {
      const current = this.readPair(key) ?? [];
      if (!current.length) continue;
      const next = current.filter((item) => {
        if (!predicate(item)) return true;
        removed += 1;
        return false;
      });
      if (next.length !== current.length) this.writePair(key, next, current.length);
    }
    return removed;
  }

  /** Cooperative variant for very high-degree edited notes. The store is expected to be a private
   * fork, so yields never expose a partially changed published graph. */
  async removeDeclarationsTouchingCooperative(
    path: string,
    predicate: (evidence: RelationEvidence) => boolean,
    checkpoint: () => Promise<boolean>,
  ): Promise<number | null> {
    let removed = 0;
    let processed = 0;
    for (const key of this.pairKeysForPath(path)) {
      const current = this.readPair(key) ?? [];
      if (current.length) {
        const next: RelationEvidence[] = [];
        for (const item of current) {
          if (predicate(item)) removed += 1;
          else next.push(item);
          processed += 1;
          if ((processed & 255) === 0 && !(await checkpoint())) return null;
        }
        if (next.length !== current.length) this.writePair(key, next, current.length);
      }
      processed += 1;
      if ((processed & 255) === 0 && !(await checkpoint())) return null;
    }
    return removed;
  }

  /**
   * Iterate the two possible source perspectives for every unordered pair. The arrays yielded here
   * are short-lived resolver views; only original declarations are retained by the store.
   */
  *entries(): IterableIterator<[string, string, RelationEvidence[]]> {
    for (const key of this.allPairKeys()) {
      const declarations = this.readPair(key);
      if (!declarations?.length) continue;
      const [left, right] = splitPairKey(key);
      const leftEvidence = this.between(left, right);
      if (leftEvidence.length) yield [left, right, leftEvidence];
      const rightEvidence = this.between(right, left);
      if (rightEvidence.length) yield [right, left, rightEvidence];
    }
  }

  /** Original declarations only. */
  *declarations(): IterableIterator<RelationEvidence> {
    for (const key of this.allPairKeys()) {
      const list = this.readPair(key);
      if (list?.length) yield* list;
    }
  }

  private readPair(key: string): RelationEvidence[] | undefined {
    if (this.byPair.has(key)) return this.byPair.get(key);
    return this.base?.readPair(key);
  }

  private allPairKeys(): Set<string> {
    const keys = this.base ? this.base.allPairKeys() : new Set<string>();
    for (const key of this.byPair.keys()) keys.add(key);
    return keys;
  }

  private pairKeysForPath(path: string): Set<string> {
    const keys = this.base ? this.base.pairKeysForPath(path) : new Set<string>();
    for (const key of this.pairsByPath.get(path) ?? []) keys.add(key);
    return keys;
  }

  private addDeclarationRecord(evidence: RelationEvidence): void {
    const key = pairKey(evidence.declaredByPath, evidence.declaredTargetPath);
    const current = this.readPair(key) ?? [];
    const next = [...current, evidence];
    this.writePair(key, next, current.length);
  }

  private writePair(key: string, next: RelationEvidence[], previousLength: number): void {
    const [left, right] = splitPairKey(key);
    if (!this.base && !next.length) {
      this.byPair.delete(key);
      this.unindexLocalPairKey(key);
    } else {
      this.byPair.set(key, next);
      this.indexPairKey(left, key);
      this.indexPairKey(right, key);
    }
    this.declarationTotal += next.length - previousLength;
    if (previousLength === 0 && next.length > 0) this.pairTotal += 1;
    else if (previousLength > 0 && next.length === 0) this.pairTotal = Math.max(0, this.pairTotal - 1);
  }

  private indexPairKey(path: string, key: string): void {
    const keys = this.pairsByPath.get(path) ?? new Set<string>();
    keys.add(key);
    this.pairsByPath.set(path, keys);
  }

  private unindexLocalPairKey(key: string): void {
    const [left, right] = splitPairKey(key);
    for (const path of [left, right]) {
      const keys = this.pairsByPath.get(path);
      if (!keys) continue;
      keys.delete(key);
      if (!keys.size) this.pairsByPath.delete(path);
    }
  }
}

/**
 * K-Plex's deliberate compatibility deviation: frontmatter ontology wins when body ontology on
 * the same declaring note conflicts for the same target. Importantly, body evidence is retained
 * and merely marked suppressed; it is never discarded from the evidence store.
 */
export function applyOntologyPrecedence(evidence: RelationEvidence[]): EvidenceDecision[] {
  // K-Plex intentionally differs from classic ExcaliBrain here: explicit YAML/frontmatter is the
  // authoritative ontology tier for a note pair. Keep all body evidence for explainability, but
  // suppress a conflicting inline ontology whenever either declaring note supplies a frontmatter
  // role for this same relationship. `item.role` is already normalized to the current source
  // perspective, so this also works when the YAML declaration lives in the opposite note.
  const frontmatterRoles = new Set<EvidenceRole>();
  for (const item of evidence) {
    if (item.sourceKind === "frontmatter-ontology" && item.relationType === RelationType.DEFINED) frontmatterRoles.add(item.role);
  }

  return evidence.map((item) => {
    if (item.sourceKind !== "inline-ontology" || item.relationType !== RelationType.DEFINED || !frontmatterRoles.size || frontmatterRoles.has(item.role)) {
      return { evidence: item, active: true };
    }
    return {
      evidence: item,
      active: false,
      suppressionReason: "Conflicting body ontology is overridden by frontmatter ontology for this note pair.",
    };
  });
}

const concatDefinition = (newDef?: string, current?: string): string | undefined => {
  if (!newDef) return current;
  if (!current) return newDef;
  const values = new Set(current.split(",").map((x) => x.trim()).filter(Boolean));
  values.add(newDef);
  return [...values].join(", ");
};

const directionToSet = (current: LinkDirection | null, incoming: LinkDirection): LinkDirection => {
  if (!current) return incoming;
  if (current === LinkDirection.BOTH || current === incoming) return current;
  return LinkDirection.BOTH;
};

const relationTypeToSet = (current: RelationType | undefined, incoming: RelationType): RelationType => {
  if (current === RelationType.DEFINED || incoming === RelationType.DEFINED) return RelationType.DEFINED;
  return incoming;
};

export const emptyRelation = <TTarget>(): Omit<SemanticRelation<TTarget>, "target"> => ({
  direction: null,
  isHidden: false,
  isParent: false,
  isChild: false,
  isLeftFriend: false,
  isRightFriend: false,
  isNextFriend: false,
  isPreviousFriend: false,
});

export function applyEvidenceToRelation<TTarget>(relation: SemanticRelation<TTarget>, decision: EvidenceDecision): void {
  if (!decision.active) return;
  const item = decision.evidence;
  if (item.role === "hidden") {
    relation.isHidden = true;
    return;
  }
  relation.direction = directionToSet(relation.direction, item.direction);
  const definition = item.definition ?? item.fieldName;
  switch (item.role) {
    case "parent":
      relation.isParent = true;
      relation.parentType = relationTypeToSet(relation.parentType, item.relationType);
      relation.parentTypeDefinition = concatDefinition(definition, relation.parentTypeDefinition);
      break;
    case "child":
      relation.isChild = true;
      relation.childType = relationTypeToSet(relation.childType, item.relationType);
      relation.childTypeDefinition = concatDefinition(definition, relation.childTypeDefinition);
      break;
    case "left":
      relation.isLeftFriend = true;
      relation.leftFriendType = relationTypeToSet(relation.leftFriendType, item.relationType);
      relation.leftFriendTypeDefinition = concatDefinition(definition, relation.leftFriendTypeDefinition);
      break;
    case "right":
      relation.isRightFriend = true;
      relation.rightFriendType = relationTypeToSet(relation.rightFriendType, item.relationType);
      relation.rightFriendTypeDefinition = concatDefinition(definition, relation.rightFriendTypeDefinition);
      break;
    case "previous":
      relation.isPreviousFriend = true;
      relation.previousFriendType = relationTypeToSet(relation.previousFriendType, item.relationType);
      relation.previousFriendTypeDefinition = concatDefinition(definition, relation.previousFriendTypeDefinition);
      break;
    case "next":
      relation.isNextFriend = true;
      relation.nextFriendType = relationTypeToSet(relation.nextFriendType, item.relationType);
      relation.nextFriendTypeDefinition = concatDefinition(definition, relation.nextFriendTypeDefinition);
      break;
  }
}
