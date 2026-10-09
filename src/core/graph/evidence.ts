/**
 * Portable evidence storage and ontology precedence. Defined scalar dates retain their physical
 * source kind while sharing explicit frontmatter authority. Decisions carry stable suppression codes;
 * callers own localized explanations, cooperative scheduling and publication. Exclusively private
 * working stores may adopt a bounded exact-child delta at their synchronous commit boundary;
 * published evidence still uses immutable fork/swap generations. Private URL preparation lazily
 * activates bounded target/kind summaries and sparse selective memberships, with injected scheduling
 * and exact revision fences; ordinary graph compilers allocate none of that derived metadata.
 * Boolean endpoint existence can traverse layer path keys lazily without allocating whole-degree
 * unions; ordered declaration iteration retains its existing observable behavior.
 */
import { LinkDirection, RelationType, type Role, type SemanticRelation } from "./relations";

export type EvidenceRole = Exclude<Role, "sibling"> | "hidden";

export type EvidenceSourceKind =
  | "obsidian-link"
  | "unresolved-link"
  | "frontmatter-ontology"
  | "inline-ontology"
  | "body-url"
  | "property-url"
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

export const ONTOLOGY_PRECEDENCE_SUPPRESSION = "frontmatter-overrides-body-ontology" as const;
export type EvidenceSuppressionReason = typeof ONTOLOGY_PRECEDENCE_SUPPRESSION;

export type EvidenceDecision = {
  evidence: RelationEvidence;
  active: boolean;
  /** Stable machine reason; presentation copy belongs to the host language catalog. */
  suppressionReason?: EvidenceSuppressionReason;
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

/** Compact counts retain no duplicate declarations; at most two endpoints × ten kinds per pair. */
type PairKindSummary = ReadonlyArray<readonly [string, EvidenceSourceKind, number]>;
/** Lazily activated derived facts. Forks override only changed pairs/counts/memberships. */
type DeclaredTargetIndex = {
  base: DeclaredTargetIndex | null;
  summaries: Map<string, PairKindSummary>;
  counts: Map<EvidenceSourceKind, Map<string, number>>;
  members: Map<EvidenceSourceKind, Map<string, Map<string, boolean>>>;
  ordinals: Map<string, number>;
  nextOrdinal: number;
};

/** Add one already visited record to its bounded pair summary without rescanning a bucket. */
function accumulateKind(summary: Array<[string, EvidenceSourceKind, number]>, item: RelationEvidence): void {
  const entry = summary.find(/** Pair summaries have a fixed bound; match exact declared identity and source kind. */
    ([target, kind]) => target === item.declaredTargetPath && kind === item.sourceKind);
  if (entry) entry[2]++;
  else summary.push([item.declaredTargetPath, item.sourceKind, 1]);
}

/** Read one inherited absolute count override; zero shadows a base contribution. */
function indexedCount(index: DeclaredTargetIndex | null, target: string, kind: EvidenceSourceKind): number {
  return index?.counts.get(kind)?.get(target) ?? (index?.base ? indexedCount(index.base, target, kind) : 0);
}

/** Write an absolute count override, releasing zero-only standalone entries without losing base shadows. */
function writeIndexedCount(index: DeclaredTargetIndex, target: string, kind: EvidenceSourceKind, count: number): void {
  const counts = index.counts.get(kind) ?? new Map<string, number>();
  if (!count && !index.base) counts.delete(target);
  else counts.set(target, count);
  if (counts.size) index.counts.set(kind, counts);
  else index.counts.delete(kind);
}

/** Sparse selected-kind membership; standalone removals release keys, inherited removals retain false shadows. */
function writeIndexedMembership(index: DeclaredTargetIndex, target: string, kind: EvidenceSourceKind, key: string, present: boolean): void {
  const targets = index.members.get(kind);
  if (!targets) return;
  const pairs = targets.get(target) ?? new Map<string, boolean>();
  if (!present && !index.base) pairs.delete(key);
  else pairs.set(key, present);
  if (pairs.size) targets.set(target, pairs);
  else targets.delete(target);
}

/** Read the inherited immutable bounded summary for one pair. */
function indexedSummary(index: DeclaredTargetIndex | null, key: string): PairKindSummary {
  return index?.summaries.get(key) ?? (index?.base ? indexedSummary(index.base, key) : []);
}

/** Read a pair's original insertion rank, including a retained tombstone's rank. */
function indexedOrdinal(index: DeclaredTargetIndex | null, key: string): number | undefined {
  return index?.ordinals.get(key) ?? (index?.base ? indexedOrdinal(index.base, key) : undefined);
}

/** Empty COW metadata; only explicitly requested kinds receive sparse membership collections. */
function createTargetIndex(base: DeclaredTargetIndex | null, kinds: Iterable<EvidenceSourceKind>): DeclaredTargetIndex {
  const members = new Map<EvidenceSourceKind, Map<string, Map<string, boolean>>>();
  for (const kind of kinds) members.set(kind, new Map());
  return { base, summaries: new Map(), counts: new Map(), members, ordinals: new Map(), nextOrdinal: base?.nextOrdinal ?? 0 };
}

/** Stable private merge ordering yields during copies and comparisons; cancellation never changes input. */
async function orderPrivateCooperative<T>(
  input: readonly T[], compare: (left: T, right: T) => number, checkpoint: () => Promise<boolean>,
): Promise<T[] | null> {
  let processed = 0;
  let source: T[] = [];
  for (const value of input) {
    source.push(value);
    if ((++processed & 255) === 0 && !(await checkpoint())) return null;
  }
  let target = new Array<T>(source.length);
  for (let width = 1; width < source.length; width *= 2) {
    for (let start = 0; start < source.length; start += width * 2) {
      const middle = Math.min(start + width, source.length), end = Math.min(start + width * 2, source.length);
      let left = start, right = middle;
      for (let output = start; output < end; output++) {
        target[output] = left < middle && (right >= end || compare(source[left], source[right]) <= 0)
          ? source[left++] : source[right++];
        if ((++processed & 255) === 0 && !(await checkpoint())) return null;
      }
    }
    const previous = source; source = target; target = previous;
  }
  return source;
}

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
  /** A child can be consumed only while its exact parent has not changed since staging began. */
  private mutationRevision = 0;
  private readonly baseMutationRevision: number;
  /** Null in ordinary compilers. Only an exclusively private preparation owner activates facts. */
  private targetIndex: DeclaredTargetIndex | null = null;

  /** Start a standalone store or capture the exact parent generation for private fork staging. */
  constructor(base: RelationEvidenceStore | null = null) {
    this.base = base;
    if (base?.targetIndex) this.targetIndex = createTargetIndex(base.targetIndex, base.targetIndex.members.keys());
    this.baseMutationRevision = base?.mutationRevision ?? 0;
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
   * Consume one bounded immediate child's pair delta into this exclusively private working store.
   * The caller must own both stores and discard the child after success; this store must not be a
   * published snapshot or the base of any retained read generation. No await or base-wide scan
   * occurs. Changed-base, unrelated and over-limit children leave both stores untouched.
   *
   * @param child Exact fork staged against this store's current mutation revision and compatible activated index.
   * @param maximumPairs Maximum synchronous bucket writes allowed by the publication owner.
   * @returns Whether adoption succeeded; false retains the ordinary immutable fork/swap option.
   */
  adoptPrivateFork(child: RelationEvidenceStore, maximumPairs: number): boolean {
    if (child.base !== this || child.baseMutationRevision !== this.mutationRevision
      || !Number.isSafeInteger(maximumPairs) || maximumPairs < 0 || child.byPair.size > maximumPairs
      || (!!child.targetIndex !== !!this.targetIndex)
      || (child.targetIndex && child.targetIndex.base !== this.targetIndex)) return false;
    for (const [key, declarations] of child.byPair) {
      this.writePair(key, declarations, this.readPair(key)?.length ?? 0, true, child.targetIndex ? indexedSummary(child.targetIndex, key) : []);
    }
    this.nextId = child.nextId;
    if (this.targetIndex && child.targetIndex) this.targetIndex.nextOrdinal = child.targetIndex.nextOrdinal;
    return true;
  }

  /**
   * Collapse a copy-on-write chain into one standalone store. The current store remains published
   * and untouched until the caller swaps in the completed result, so cancellation cannot expose a
   * partial compaction. Activated summaries accumulate during the existing cooperative record copy.
   * Pair insertion order follows the oldest layer while newer layers replace values in place,
   * matching the observable order of `allPairKeys()`.
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
    if (this.targetIndex) compacted.targetIndex = createTargetIndex(null, this.targetIndex.members.keys());
    for (const [key, declarations] of latest) {
      if (declarations.length) {
        const copied: RelationEvidence[] = [];
        const summary: Array<[string, EvidenceSourceKind, number]> = [];
        for (const declaration of declarations) {
          copied.push(declaration);
          if (compacted.targetIndex) accumulateKind(summary, declaration);
          if ((++processed & 255) === 0 && !(await checkpoint())) return null;
        }
        compacted.writePair(key, copied, 0, false, summary);
      }
      processed += 1;
      if ((processed & 255) === 0 && !(await checkpoint())) return null;
    }
    compacted.nextId = this.nextId;
    return compacted;
  }

  /**
   * Stably reorder private compiler declarations without building another source/graph model.
   * A bottom-up merge yields during dense pair buckets rather than hiding an unbounded native sort.
   * This is deliberately unavailable on published copy-on-write forks; normal patch publication
   * receives an already ordered standalone compilation and retains its established store behavior.
   * Starting a bucket reorder retires prior child-adoption validity, including cancelled reorders.
   * Private copy/merge ordering leaves a cancelled bucket intact, keeping activated counts/IDs valid.
   */
  async orderDeclarationsCooperative(
    compare: (left: RelationEvidence, right: RelationEvidence) => number,
    checkpoint: () => Promise<boolean>,
  ): Promise<boolean> {
    if (this.base) throw new Error("Declaration ordering requires a private standalone evidence store");
    let processed = 0;
    for (const [key, original] of this.byPair) {
      if (original.length > 1) {
        this.mutationRevision++;
        const ordered = await orderPrivateCooperative(original, compare, checkpoint);
        if (!ordered) return false;
        this.byPair.set(key, ordered);
      }
      processed += 1;
      if ((processed & 255) === 0 && !(await checkpoint())) return false;
    }
    return checkpoint();
  }

  /** Store one original relationship and allocate its stable declaration ID; active indexes update incrementally. */
  addPair(
    sourcePath: string,
    targetPath: string,
    role: Exclude<EvidenceRole, "hidden">,
    relationType: RelationType,
    direction: LinkDirection,
    provenance: EvidenceProvenance,
  ): string | null {
    if (sourcePath === targetPath) return null;
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
    return `${declarationId}:forward`;
  }

  /** Store directional hidden evidence with the same original-declaration/index contract as visible pairs. */
  addHidden(sourcePath: string, targetPath: string, provenance: EvidenceProvenance): string | null {
    if (sourcePath === targetPath) return null;
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
    return `${declarationId}:forward`;
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

  /**
   * Test whether any original declaration touches either endpoint without materializing a union
   * of inherited path-key sets. Read candidates against this exact generation, so empty current
   * tombstones shadow every inherited occurrence. No ordering/deduplication is needed for boolean
   * existence. Temporary layer revisions fence every awaited slice against intervening mutations.
   * Positive results stop immediately; dense negative scans use the existing256-key
   * checkpoint cadence. Null means cancellation, never proof of absence. The caller owns private
   * preparation/finality and retained published generations remain untouched.
   */
  async hasDeclarationsTouchingCooperative(path: string, checkpoint: () => Promise<boolean>): Promise<boolean | null> {
    const revisions: Array<[RelationEvidenceStore, number]> = [[this, this.mutationRevision]];
    for (let layer = this.base; layer; layer = layer.base) revisions.push([layer, layer.mutationRevision]);
    let processed = 0;
    for (const key of this.lazyPairKeysForPath(path)) {
      if (this.readPair(key)?.length) return true;
      if ((++processed & 255) === 0) {
        if (!(await checkpoint()) || !revisions.every(/** An awaited negative scan cannot adopt changed buckets. */
          ([layer, revision]) => layer.mutationRevision === revision)) return null;
      }
    }
    return false;
  }

  /** Yield existing path-key sets directly, newest layer first, without allocating a whole-degree Set. */
  private *lazyPairKeysForPath(path: string): IterableIterator<string> {
    for (const key of this.pairsByPath.get(path) ?? []) yield key;
    for (let layer = this.base; layer; layer = layer.base) {
      for (const key of layer.pairsByPath.get(path) ?? []) yield key;
    }
  }

  /** Remove matching originals, accumulating activated summaries during the existing filter pass. */
  removeDeclarations(predicate: (evidence: RelationEvidence) => boolean): number {
    let removed = 0;
    for (const key of this.allPairKeys()) {
      const current = this.readPair(key) ?? [];
      if (!current.length) continue;
      const summary: Array<[string, EvidenceSourceKind, number]> = [];
      const next = current.filter((item) => {
        if (!predicate(item)) {
          if (this.targetIndex) accumulateKind(summary, item);
          return true;
        }
        removed += 1;
        return false;
      });
      if (next.length !== current.length) this.writePair(key, next, current.length, false, summary);
    }
    return removed;
  }

  /** Per-file filter updates activated summaries during the existing record visits. */
  removeDeclarationsTouching(path: string, predicate: (evidence: RelationEvidence) => boolean): number {
    let removed = 0;
    for (const key of this.pairKeysForPath(path)) {
      const current = this.readPair(key) ?? [];
      if (!current.length) continue;
      const summary: Array<[string, EvidenceSourceKind, number]> = [];
      const next = current.filter((item) => {
        if (!predicate(item)) {
          if (this.targetIndex) accumulateKind(summary, item);
          return true;
        }
        removed += 1;
        return false;
      });
      if (next.length !== current.length) this.writePair(key, next, current.length, false, summary);
    }
    return removed;
  }

  /** Cooperative variant for very high-degree edited notes. The store is expected to be a private
   * fork, so yields never expose a partially changed published graph. Summaries accumulate while
   * records are already visited; cancelled dense buckets do not update their metadata. */
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
        const summary: Array<[string, EvidenceSourceKind, number]> = [];
        for (const item of current) {
          if (predicate(item)) removed += 1;
          else { next.push(item); if (this.targetIndex) accumulateKind(summary, item); }
          processed += 1;
          if ((processed & 255) === 0 && !(await checkpoint())) return null;
        }
        if (next.length !== current.length) this.writePair(key, next, current.length, false, summary);
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

  /**
   * Activate generic derived counts and requested selective memberships on an exclusively private
   * store. Ordinary compilers allocate no metadata. Collection visits layers/records cooperatively;
   * cancellation or mutation of any captured layer rejects the private result before installation.
   * Never call this to mutate a retained published parent. A newly activated child of an inactive
   * parent deliberately cannot be synchronously adopted; its owner must use the normal pointer swap.
   */
  async ensureDeclaredTargetIndexCooperative(
    kinds: Iterable<EvidenceSourceKind>, checkpoint: () => Promise<boolean>,
  ): Promise<boolean> {
    const requested = new Set(kinds);
    for (const kind of this.targetIndex?.members.keys() ?? []) requested.add(kind);
    if (this.targetIndex && [...requested].every(/** Requested kinds are the finite source-kind union. */ kind => this.targetIndex!.members.has(kind))) return true;
    const layers: Array<[RelationEvidenceStore, number]> = [];
    layers.push([this, this.mutationRevision]);
    for (let layer = this.base; layer; layer = layer.base) layers.push([layer, layer.mutationRevision]);
    /** Every captured evidence layer must still be the exact revision used for derived facts. */
    const current = (): boolean => layers.every(/** Metadata may install only against the exact captured evidence revisions. */
      ([layer, revision]) => layer.mutationRevision === revision);
    /** Caller cancellation and generation mutation both retire this uninstalled activation result. */
    const check = async (): Promise<boolean> => await checkpoint() && current();
    const latest = new Map<string, RelationEvidence[]>();
    let processed = 0;
    for (let n = layers.length - 1; n >= 0; n--) {
      for (const [key, declarations] of layers[n][0].byPair) {
        latest.set(key, declarations);
        if ((++processed & 255) === 0 && !(await check())) return false;
      }
    }
    const index = createTargetIndex(null, requested);
    for (const [key, declarations] of latest) {
      const summary: Array<[string, EvidenceSourceKind, number]> = [];
      for (const item of declarations) {
        accumulateKind(summary, item);
        if ((++processed & 255) === 0 && !(await check())) return false;
      }
      index.ordinals.set(key, index.nextOrdinal++);
      this.replaceIndexedSummary(key, summary, false, index);
      if ((++processed & 255) === 0 && !(await check())) return false;
    }
    if (!(await check())) return false;
    this.targetIndex = index;
    return true;
  }

  /** O(depth) original-declaration count, without scanning unrelated incoming evidence. Requires activation. */
  declaredTargetCount(target: string, kind: EvidenceSourceKind): number {
    if (!this.targetIndex) throw new Error("Declared-target facts require private cooperative activation");
    return indexedCount(this.targetIndex, target, kind);
  }

  /**
   * Visit every original matching declaration in existing pair/declaration order. Only selected-kind
   * pair memberships are enumerated; unrelated incoming buckets are never opened. Dense mixed
   * buckets and large matching collections remain cooperatively cancellable.
   */
  async visitDeclaredTargetKindCooperative(
    target: string, kind: EvidenceSourceKind, visit: (item: RelationEvidence) => void, checkpoint: () => Promise<boolean>,
  ): Promise<boolean> {
    const keys = await this.selectedPairKeysCooperative(target, kind, checkpoint);
    if (!keys) return false;
    let processed = 0;
    for (const key of keys) {
      for (const item of this.readPair(key) ?? []) {
        if (item.declaredTargetPath === target && item.sourceKind === kind) visit(item);
        if ((++processed & 255) === 0 && !(await checkpoint())) return false;
      }
      if ((++processed & 255) === 0 && !(await checkpoint())) return false;
    }
    return true;
  }

  /** Remove matching originals from only selected pairs on a private store; dense filtering yields. */
  async removeDeclaredTargetKindCooperative(
    target: string, kind: EvidenceSourceKind, checkpoint: () => Promise<boolean>,
  ): Promise<number | null> {
    const keys = await this.selectedPairKeysCooperative(target, kind, checkpoint);
    if (!keys) return null;
    let removed = 0, processed = 0;
    for (const key of keys) {
      const current = this.readPair(key) ?? [], next: RelationEvidence[] = [];
      const summary: Array<[string, EvidenceSourceKind, number]> = [];
      for (const item of current) {
        if (item.declaredTargetPath === target && item.sourceKind === kind) removed++;
        else { next.push(item); accumulateKind(summary, item); }
        if ((++processed & 255) === 0 && !(await checkpoint())) return null;
      }
      if (next.length !== current.length) this.writePair(key, next, current.length, false, summary);
      if ((++processed & 255) === 0 && !(await checkpoint())) return null;
    }
    return removed;
  }

  /** Sparse COW membership union, ordered by canonical pair insertion rank rather than kind arrival. */
  private async selectedPairKeysCooperative(
    target: string, kind: EvidenceSourceKind, checkpoint: () => Promise<boolean>,
  ): Promise<string[] | null> {
    const index = this.targetIndex;
    if (!index?.members.has(kind)) throw new Error("Selective kind requires private cooperative activation");
    const layers: DeclaredTargetIndex[] = [];
    for (let layer: DeclaredTargetIndex | null = index; layer; layer = layer.base) layers.push(layer);
    const members = new Map<string, boolean>();
    let processed = 0;
    for (let n = layers.length - 1; n >= 0; n--) {
      for (const [key, present] of layers[n].members.get(kind)?.get(target) ?? []) {
        members.set(key, present);
        if ((++processed & 255) === 0 && !(await checkpoint())) return null;
      }
    }
    const keys: string[] = [];
    for (const [key, present] of members) {
      if (present) keys.push(key);
      if ((++processed & 255) === 0 && !(await checkpoint())) return null;
    }
    return orderPrivateCooperative(keys, /** Selective membership arrival never changes canonical pair insertion order. */
      (a, b) => indexedOrdinal(index, a)! - indexedOrdinal(index, b)!, checkpoint);
  }

  /**
   * Replay bounded pair-summary differences without examining any declaration array. Counts are
   * absolute COW overrides, memberships contain only queried kinds, and tombstones keep ordinals.
   */
  private replaceIndexedSummary(
    key: string, summary: PairKindSummary, deleteOrdinal: boolean, index = this.targetIndex!,
  ): void {
    const previous = indexedSummary(index, key);
    for (const [target, kind, count] of previous) {
      writeIndexedCount(index, target, kind, indexedCount(index, target, kind) - count);
      writeIndexedMembership(index, target, kind, key, false);
    }
    for (const [target, kind, count] of summary) {
      writeIndexedCount(index, target, kind, indexedCount(index, target, kind) + count);
      writeIndexedMembership(index, target, kind, key, true);
    }
    if (!summary.length && !index.base) index.summaries.delete(key);
    else index.summaries.set(key, summary);
    if (deleteOrdinal) index.ordinals.delete(key);
    else if (indexedOrdinal(index, key) === undefined) index.ordinals.set(key, index.nextOrdinal++);
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

  /** Append one original, updating only its bounded summary when private facts are active. */
  private addDeclarationRecord(evidence: RelationEvidence): void {
    const key = pairKey(evidence.declaredByPath, evidence.declaredTargetPath);
    const current = this.readPair(key) ?? [];
    const next = [...current, evidence];
    const summary: Array<[string, EvidenceSourceKind, number]> = [];
    if (this.targetIndex) {
      for (const [target, kind, count] of indexedSummary(this.targetIndex, key)) summary.push([target, kind, count]);
      accumulateKind(summary, evidence);
    }
    this.writePair(key, next, current.length, false, summary);
  }

  /**
   * Replace one pair bucket and maintain exact aggregate/path/activated target indexes without record rescans. Consumed child tombstones
   * retain insertion positions even in a standalone private layer, preserving later re-add order.
   */
  private writePair(
    key: string, next: RelationEvidence[], previousLength: number, preserveTombstone = false, summary: PairKindSummary = [],
  ): void {
    this.mutationRevision++;
    if (this.targetIndex) this.replaceIndexedSummary(key, summary, !this.base && !next.length && !preserveTombstone);
    const [left, right] = splitPairKey(key);
    if (!this.base && !next.length && !preserveTombstone) {
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
 * K-Plex's deliberate compatibility deviation: explicit frontmatter ontology, including configured
 * DEFINED configured/fallback dates, wins when body ontology conflicts for the same target. Body evidence is retained
 * and merely marked suppressed; it is never discarded from the evidence store.
 */
export function applyOntologyPrecedence(evidence: RelationEvidence[]): EvidenceDecision[] {
  // K-Plex gives explicit YAML/frontmatter precedence: it is the
  // authoritative ontology tier for a note pair. Keep all body evidence for explainability, but
  // suppress a conflicting inline ontology whenever either declaring note supplies a frontmatter
  // role for this same relationship. `item.role` is already normalized to the current source
  // perspective, so this also works when the YAML declaration lives in the opposite note.
  const frontmatterRoles = new Set<EvidenceRole>();
  for (const item of evidence) {
    if ((item.sourceKind === "frontmatter-ontology" || item.sourceKind === "date-property")
      && item.relationType === RelationType.DEFINED) frontmatterRoles.add(item.role);
  }

  return evidence.map((item) => {
    if (item.sourceKind !== "inline-ontology" || item.relationType !== RelationType.DEFINED || !frontmatterRoles.size || frontmatterRoles.has(item.role)) {
      return { evidence: item, active: true };
    }
    return {
      evidence: item,
      active: false,
      suppressionReason: ONTOLOGY_PRECEDENCE_SUPPRESSION,
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
