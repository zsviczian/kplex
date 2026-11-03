/** Portable saved-pin identity and atomic relative ordering. Saved entries, including missing
 * destinations, remain canonical; graph hydration never selects or compresses this collection.
 * This owner has no navigation, source, storage or host capabilities. */
export type SavedPin = string;

/** Presentation identity is separate from graph NodeId; an ordinal preserves legacy duplicates. */
export type SavedPinEntry = Readonly<{id: string; entry: SavedPin}>;
/** A gesture captures the complete saved order. A changed collection cancels rather than
 * resurrecting removed entries or replacing concurrent additions with an old filtered list. */
export type SavedPinMove = Readonly<{id: string; before: string | null; expected: readonly string[]}>;

/** Give each saved occurrence a stable key without querying graph or native-file availability. */
export function savedPinEntries(pins: readonly SavedPin[]): SavedPinEntry[] {
  const counts = new Map<string, number>();
  return pins.map(/** Equal legacy paths remain separately represented rather than silently deduplicated. */ entry => {
    const ordinal = counts.get(entry) ?? 0;counts.set(entry, ordinal + 1);
    return {id: JSON.stringify(["fixed", entry, ordinal]), entry};
  });
}

/** Move one occurrence before a current saved anchor (null means end). Return null for stale,
 * missing or unchanged moves. Callers publish and persist the returned collection atomically. */
export function moveSavedPin(pins: readonly SavedPin[], move: SavedPinMove): SavedPin[] | null {
  const rows = savedPinEntries(pins), ids = rows.map(/** Compare only stable saved identities, never resolved paths or availability. */ row => row.id);
  if (ids.length !== move.expected.length || ids.some((id, index) => id !== move.expected[index])) return null;
  const from = ids.indexOf(move.id);
  if (from < 0 || move.before === move.id || move.before !== null && !ids.includes(move.before)) return null;
  const remaining = rows.filter(/** Retain every other canonical entry, including unavailable rows. */ row => row.id !== move.id);
  const target = move.before === null ? remaining.length : remaining.findIndex(/** The insertion anchor is a saved occurrence. */ row => row.id === move.before);
  remaining.splice(target, 0, rows[from]);
  if (remaining.every((row, index) => row.id === ids[index])) return null;
  return remaining.map(/** Persist original entries without reconstructing them from presentation. */ row => row.entry);
}
