/**
 * URL-working adjacency only. Private forks retain exact Map ordering without copying unchanged
 * neighbors. An authorized owner may consume a bounded immediate delta; otherwise its base is
 * frozen before fork publication. Public/displayed adjacency and ordinary graph maps stay native.
 * This container never proves privacy: GraphIndex must establish that independently at commit.
 * Native superclass storage holds only this layer's private delta, avoiding a second Map per
 * wrapper. Consumers use the overridden logical API; intrinsic Map calls are not a published view.
 */
/** Preserve the caller's key/value types when narrowing ordinary Map storage. */
export function isUrlAdjacencyMap<K, V>(map: Map<K, V>): map is UrlAdjacencyMap<K, V> {
  return map instanceof UrlAdjacencyMap;
}

export class UrlAdjacencyMap<K, V> extends Map<K, V> {
  private removed: Set<K> | null = null;
  private reinserted: Set<K> | null = null;
  private cleared = false;
  private frozen = false;
  private retired = false;
  private revision = 0;
  private readonly baseRevision: number;
  private count: number;

  /** Capture one exact immediate parent; construction itself grants no exclusive ownership. */
  constructor(private base: UrlAdjacencyMap<K, V> | null = null) {
    super();
    this.baseRevision = base?.revision ?? 0;
    this.count = base?.size ?? 0;
  }

  /** Copy unknown/native storage instead of assuming its external readers or writers are private. */
  static copyOf<K, V>(source: Map<K, V>): UrlAdjacencyMap<K, V> {
    const copy = new UrlAdjacencyMap<K, V>();
    for (const [key, value] of source) copy.set(key, value);
    return copy;
  }

  /** A fresh child can read only this exact parent revision until consumed or retired. */
  fork(): UrlAdjacencyMap<K, V> { this.assertReadable(); return new UrlAdjacencyMap(this); }

  /** Bound private history independently of the number of retained entries. */
  get depth(): number { this.assertReadable(); return this.base ? this.base.depth + 1 : 0; }

  /** Identity only; callers must also validate currentness and exclusive ownership. */
  isForkOf(parent: Map<K, V>): boolean { return this.base === parent; }

  /** A changed ancestor cannot silently alter a prepared view, even through a chained fork. */
  isCurrent(): boolean {
    return !this.retired && (!this.base || this.base.isCurrent() && this.base.revision === this.baseRevision);
  }

  /** Count actual replay writes, including delete/reinsert and a clear's old logical entries. */
  get replayCost(): number {
    this.assertReadable();
    return super.size + (this.removed?.size ?? 0) + (this.reinserted?.size ?? 0)
      + (this.cleared ? this.base?.size ?? 0 : 0);
  }

  /** Count retained map/set entries, not bytes; dead history cannot grow with an obsolete peak degree. */
  get retainedEntries(): number {
    this.assertReadable();
    return super.size + (this.removed?.size ?? 0) + (this.reinserted?.size ?? 0)
      + (this.base?.retainedEntries ?? 0);
  }

  /** Depth and a size-ratio bound amortize compaction over actual changes, with a small fixed floor. */
  needsCompaction(maximumDepth: number): boolean {
    return this.depth > maximumDepth || this.retainedEntries > Math.max(256, this.count * 2);
  }

  /** Constant-time current logical size; no traversal of growing neighbor maps. */
  override get size(): number { this.assertReadable(); return this.count; }

  /** Preserve undefined-valued membership as well as tombstone/clear shadows. */
  override has(key: K): boolean {
    this.assertReadable();
    return super.has(key) || !this.cleared && !this.removed?.has(key) && Boolean(this.base?.has(key));
  }

  /** Resolve staged values before the immutable captured base. */
  override get(key: K): V | undefined {
    this.assertReadable();
    if (super.has(key)) return super.get(key);
    return this.cleared || this.removed?.has(key) ? undefined : this.base?.get(key);
  }

  /** Updating a base key keeps its position; a deleted base key is appended on reinsert. */
  override set(key: K, value: V): this {
    this.assertWritable();
    const existed = this.has(key);
    if (!this.cleared && this.removed?.has(key) && this.base?.has(key)) {
      (this.reinserted ??= new Set()).add(key);
    }
    this.removed?.delete(key);
    super.set(key, value);
    if (!existed) this.count++;
    this.revision++;
    return this;
  }

  /** Remove only this layer's entry or add a base tombstone; no base enumeration occurs. */
  override delete(key: K): boolean {
    this.assertWritable();
    if (!this.has(key)) return false;
    super.delete(key); this.reinserted?.delete(key);
    if (!this.cleared && this.base?.has(key)) (this.removed ??= new Set()).add(key);
    this.count--; this.revision++;
    return true;
  }

  /** Shadow the entire captured base in O(1), preserving native insertion order after clear. */
  override clear(): void {
    this.assertWritable();
    super.clear(); this.removed = null; this.reinserted = null;
    this.cleared = true; this.count = 0; this.revision++;
  }

  /** Yield original base positions first, then new/reinserted entries in their actual local order. */
  override *entries(): IterableIterator<[K, V]> {
    this.assertReadable();
    if (this.base && !this.cleared) for (const [key, value] of this.base) {
      this.assertReadable();
      if (this.cleared) break;
      if (this.removed?.has(key) || this.reinserted?.has(key)) continue;
      yield [key, super.has(key) ? super.get(key)! : value];
      this.assertReadable();
    }
    for (const [key, value] of super.entries()) {
      this.assertReadable();
      if (!this.cleared && this.base?.has(key) && !this.reinserted?.has(key)) continue;
      yield [key, value];
      this.assertReadable();
    }
  }

  /** Match ordinary Map key order without materializing entries. */
  override *keys(): IterableIterator<K> { for (const [key] of this.entries()) yield key; }

  /** Match ordinary Map value order without materializing entries. */
  override *values(): IterableIterator<V> { for (const [, value] of this.entries()) yield value; }

  /** All normal iterable consumers observe the same ordered Map view. */
  override [Symbol.iterator](): IterableIterator<[K, V]> { return this.entries(); }

  /** Preserve the callback receiver and original map argument. */
  override forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
    for (const [key, value] of this.entries()) callbackfn.call(thisArg, value, key, this);
  }

  /** Validate replay without mutation; a standalone map is not evidence that its owner is private. */
  canAdopt(child: UrlAdjacencyMap<K, V>, maximum: number): boolean {
    return this.isCurrent() && !this.frozen && child.isCurrent() && child.base === this
      && !child.frozen && Number.isSafeInteger(maximum) && maximum >= 0 && child.replayCost <= maximum;
  }

  /**
   * Consume a bounded immediate delta only after the caller independently proves privacy.
   * No await/base-wide pass occurs. The consumed wrapper is invalidated and drops its parent;
   * retaining it cannot create a readable view through a parent changed by a later commit.
   */
  adopt(child: UrlAdjacencyMap<K, V>, maximum: number): boolean {
    if (!this.canAdopt(child, maximum)) return false;
    if (child.cleared) this.clear();
    else for (const key of child.removed ?? []) this.delete(key);
    for (const [key, value] of child.localEntries()) {
      if (child.reinserted?.has(key)) this.delete(key);
      this.set(key, value);
    }
    this.releaseClearedHistory();
    child.discard();
    return true;
  }

  /** Freeze a fallback's exact base before publishing that child as the next working map. */
  freezeBase(): void {
    this.assertReadable();
    this.base?.freeze();
    this.releaseClearedHistory();
  }

  /** A replaced working map remains an immutable retained generation even after a compacted swap. */
  freeze(): void { this.assertReadable(); this.frozen = true; }

  /** Cancelled/consumed private wrappers release parent/value ownership and reject every read. */
  discard(): void {
    this.retired = true; this.base = null; super.clear(); this.removed = null; this.reinserted = null;
  }

  /** Compact privately with unchanged old storage on cancellation; the owner later swaps the result. */
  async flattenCooperative(checkpoint: () => Promise<boolean>): Promise<UrlAdjacencyMap<K, V> | null> {
    const flattened = new UrlAdjacencyMap<K, V>();
    let processed = 0;
    for (const [key, value] of this) {
      flattened.set(key, value);
      if ((++processed & 255) === 0 && !(await checkpoint())) return null;
    }
    return await checkpoint() ? flattened : null;
  }

  /** Iterate only native local writes after adoption has validated this exact child and its budget.
   * The logical entries() view includes inherited adjacency and must never be used for replay. */
  private localEntries(): IterableIterator<[K, V]> { return super.entries(); }

  /** Never silently read through a parent changed after preparation or a retired stage. */
  private assertReadable(): void {
    if (!this.isCurrent()) throw new Error("Retired or stale private URL adjacency");
  }

  /** Frozen fallback bases cannot be mutated by accidental later private adoption. */
  private assertWritable(): void {
    this.assertReadable();
    if (this.frozen) throw new Error("Immutable URL adjacency base");
  }

  /** Once committed, a clear can release its entirely shadowed history without changing values/order. */
  private releaseClearedHistory(): void {
    if (!this.cleared) return;
    this.base = null; this.cleared = false;
  }
}
