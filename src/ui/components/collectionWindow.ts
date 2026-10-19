/**
 * Shared headless mechanics for bounded manager lists. Callers own filtering, sorting, labels,
 * validation and mutations; this helper only decides which already-ranked items are rendered.
 */
export type CollectionWindow<T> = Readonly<{
  visible: readonly T[];
  total: number;
  remaining: number;
  nextCount: number;
}>;

/** Clamp an indexed scroll window without copying or resolving the caller's complete collection. */
export function collectionRange(total: number, start: number, count: number): {start: number; end: number} {
  const size = Math.max(0, Math.floor(total));
  const from = Math.max(0, Math.min(size, Math.floor(start)));
  return {start: from, end: Math.min(size, from + Math.max(0, Math.floor(count)))};
}

export function collectionWindow<T>(
  items: readonly T[],
  visibleLimit: number,
  pageSize: number,
): CollectionWindow<T> {
  const limit = Math.max(0, Math.floor(visibleLimit));
  const step = Math.max(1, Math.floor(pageSize));
  const visibleCount = collectionRange(items.length, 0, limit).end;
  const remaining = Math.max(0, items.length - visibleCount);
  return {
    visible: items.slice(0, visibleCount),
    total: items.length,
    remaining,
    nextCount: Math.min(step, remaining),
  };
}
