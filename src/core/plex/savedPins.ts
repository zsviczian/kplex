/** Portable saved-pin identity and atomic relative ordering. Saved entries, including missing
 * destinations, remain canonical; graph hydration never selects or compresses this collection.
 * This owner has no navigation, source, storage or host capabilities. */
export const PIN_PERIODS = ["day", "week", "month"] as const;
export type PinPeriod = typeof PIN_PERIODS[number];
/** Unknown future descriptor records remain inert and round-trip without becoming graph paths. */
export type SavedPin = string | Readonly<Record<string, unknown>>;
export type PeriodicPin = Readonly<{kind: "periodic"; period: PinPeriod} & Record<string, unknown>>;

/** Recognize only the three explicit symbolic descriptors; never infer a graph/file identity. */
export function isPeriodicPin(value: unknown): value is PeriodicPin {
  return !!value && typeof value === "object" && !Array.isArray(value) && "kind" in value && value.kind === "periodic"
    && "period" in value && (value.period === "day" || value.period === "week" || value.period === "month");
}

/** Preserve legacy strings and future data-only records; malformed scalars retain the old refusal. */
export function loadSavedPins(value: unknown): SavedPin[] {
  return Array.isArray(value) ? value.filter(/** A descriptor must be a record, never an executable/file-path coercion. */ (item): item is SavedPin =>
    typeof item === "string" || !!item && typeof item === "object" && !Array.isArray(item)).map(/** Own the mutable JSON settings record without dropping future keys. */ item => typeof item === "string" ? item : {...item}) : [];
}

/** Only fixed legacy paths can seed saved graph navigation or participate in physical rename. */
export function fixedPinPaths(pins: readonly SavedPin[]): string[] {return pins.filter(/** Symbolic/future descriptors have no graph NodeId authority. */ (pin): pin is string => typeof pin === "string");}

/** Presentation identity is separate from graph NodeId; an ordinal preserves legacy duplicates. */
export type SavedPinEntry = Readonly<{id: string; entry: SavedPin}>;
/** A gesture captures the complete saved order. A changed collection cancels rather than
 * resurrecting removed entries or replacing concurrent additions with an old filtered list. */
export type SavedPinMove = Readonly<{id: string; before: string | null; expected: readonly string[]}>;

/** Give each saved occurrence a stable key without querying graph or native-file availability. */
export function savedPinEntries(pins: readonly SavedPin[]): SavedPinEntry[] {
  const counts = new Map<string, number>();
  return pins.map(/** Equal legacy paths remain separately represented rather than silently deduplicated. */ entry => {
    const identity = typeof entry === "string" ? ["fixed", entry] : isPeriodicPin(entry) ? ["periodic", entry.period] : ["unsupported", entry];
    const key = JSON.stringify(identity), ordinal = counts.get(key) ?? 0;counts.set(key, ordinal + 1);
    return {id: JSON.stringify([...identity, ordinal]), entry};
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
