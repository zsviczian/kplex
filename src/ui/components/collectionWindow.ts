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

export function collectionWindow<T>(
  items: readonly T[],
  visibleLimit: number,
  pageSize: number,
): CollectionWindow<T> {
  const limit = Math.max(0, Math.floor(visibleLimit));
  const step = Math.max(1, Math.floor(pageSize));
  const visibleCount = Math.min(items.length, limit);
  const remaining = Math.max(0, items.length - visibleCount);
  return {
    visible: items.slice(0, visibleCount),
    total: items.length,
    remaining,
    nextCount: Math.min(step, remaining),
  };
}
