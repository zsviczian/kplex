/** Calendar-only local dates and nearest journal selection. These helpers own no host inventory,
 * relationship classification, settings or persistence; callers supply observed date identities. */
export type JournalDirection = "previous" | "next";

/** Parse a strict four-digit local calendar day at noon, avoiding midnight DST transitions. */
export function calendarDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number), date = new Date(0);
  date.setFullYear(year, month - 1, day); date.setHours(12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Encode a local day without converting through UTC or changing the device timezone. */
export function calendarDayKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Move by whole calendar days, preserving local dates through leap years and DST changes. */
export function shiftCalendarDay(value: string, days: number): string {
  const date = calendarDay(value); if (!date) return value;
  date.setDate(date.getDate() + days);
  const key = calendarDayKey(date); return calendarDay(key) ? key : value;
}

/** Anchor month changes to their first day so January 31 never skips February. */
export function shiftCalendarMonth(value: string, months: number): string {
  const date = calendarDay(value); if (!date) return value;
  date.setDate(1); date.setMonth(date.getMonth() + months);
  const key = calendarDayKey(date); return calendarDay(key) ? key : value;
}

/** Six complete weeks keep popup dimensions stable while month boundaries remain selectable. */
export function calendarMonthDays(value: string, weekStart: number): string[] {
  const date = calendarDay(value); if (!date) return [];
  date.setDate(1); const offset = (date.getDay() - weekStart + 7) % 7;
  const first = shiftCalendarDay(calendarDayKey(date), -offset);
  return Array.from({length: 42}, /** Each displayed day has an exact chronological identity. */ (_, index) => shiftCalendarDay(first, index));
}

/** Existing links suppress their chronological side regardless of the chosen ontology role. */
export function missingJournalDirections(date: string, linkedDates: Iterable<string>): JournalDirection[] {
  let previous = false, next = false;
  for (const linked of linkedDates) { if (linked < date) previous = true; if (linked > date) next = true; }
  return [...previous ? [] : ["previous" as const], ...next ? [] : ["next" as const]];
}

/** Pick the closest existing day in one direction; same-day duplicates use stable supplied order. */
export function adjacentJournalEntry<T extends {date: string}>(entries: readonly T[], date: string, direction: JournalDirection): T | null {
  let chosen: T | null = null;
  for (const entry of entries) {
    if (direction === "previous" ? entry.date >= date : entry.date <= date) continue;
    if (!chosen || (direction === "previous" ? entry.date > chosen.date : entry.date < chosen.date)) chosen = entry;
  }
  return chosen;
}
