/** Pure current-period pin resolution. Clock, calendar formatting, Daily Notes configuration
 * and exact availability are injected host capabilities. Resolution never creates notes, scans
 * a vault, acquires graph sources or navigates; symbolic IDs remain independent of filenames. */
import {isPeriodicPin, savedPinEntries, type PinPeriod, type SavedPin, type SavedPinEntry} from "./savedPins";

export type PeriodicPinConfiguration = Readonly<{folder: string; format: string; useDailyNotes: boolean; weekStart: "iso" | "locale"} & Record<string, unknown>>;
export type PeriodicPinSettings = Readonly<Record<PinPeriod, PeriodicPinConfiguration> & Record<string, unknown>>;
export const DEFAULT_PERIODIC_PIN_SETTINGS: PeriodicPinSettings = {
  day: {folder: "", format: "YYYY-MM-DD", useDailyNotes: true, weekStart: "iso"},
  week: {folder: "", format: "GGGG-[W]WW", useDailyNotes: false, weekStart: "iso"},
  month: {folder: "", format: "YYYY-MM", useDailyNotes: false, weekStart: "iso"},
};

/** All native effects are exact finite reads. One captured local timestamp serves a whole list. */
export type PeriodicPinRuntime = Readonly<{
  now: () => number;
  dailyNotes: () => Readonly<{folder: string; format: string}> | null;
  format: (now: number, period: PinPeriod, format: string, weekStart: "iso" | "locale") => string | null;
  fileExists: (path: string) => boolean;
  fixedAvailable: (path: string) => boolean;
}>;
export type ResolvedSavedPin = SavedPinEntry & Readonly<{period?: PinPeriod; path: string | null; state: "ready" | "missing" | "configuration" | "unsupported"}>;

/** Add known defaults while preserving future configuration and per-period keys verbatim. */
export function loadPeriodicPinSettings(value: unknown): PeriodicPinSettings {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {};
  /** Validate one known configuration while retaining extra fields from a newer client. */
  const period = (key: PinPeriod): PeriodicPinConfiguration => {
    const candidate = raw[key], defaults = DEFAULT_PERIODIC_PIN_SETTINGS[key];
    const row = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate as Readonly<Record<string, unknown>> : {};
    return {...row, folder: typeof row.folder === "string" ? row.folder : defaults.folder, format: typeof row.format === "string" ? row.format : defaults.format,
      useDailyNotes: typeof row.useDailyNotes === "boolean" ? row.useDailyNotes : defaults.useDailyNotes, weekStart: row.weekStart === "locale" ? "locale" : "iso"};
  };
  return {...raw, day: period("day"), week: period("week"), month: period("month")};
}

/** Validate a vault-relative Markdown destination without decoding, repairing unsafe segments,
 * changing case or consulting native storage. Formats may produce nested date folders. */
export function periodicPinPath(folder: string, formatted: string): string | null {
  if (!formatted.trim() || formatted.length > 512 || folder.length > 1024) return null;
  const joined = `${folder}/${formatted}`.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
  if (!joined || joined.split("/").some(/** Refuse traversal and native-invalid names rather than silently creating a different target. */ part =>
    part === "." || part === ".." || !part.trim() || [...part].some(character => (character.codePointAt(0) ?? 0) < 32 || '<>:"|?*'.includes(character)))) return null;
  return joined.endsWith(".md") ? joined : `${joined}.md`;
}

/** Resolve again for every explicit activation. Passive callers may refresh the same snapshot
 * for labels, but no result authorizes creation or navigation by itself. Missing notes stay rows. */
export function resolveSavedPins(pins: readonly SavedPin[], settings: PeriodicPinSettings, runtime: PeriodicPinRuntime): ResolvedSavedPin[] {
  const entries = savedPinEntries(pins), now = pins.some(isPeriodicPin) ? runtime.now() : 0;
  return entries.map(/** Classification here concerns saved descriptors only, never graph/relationship semantics. */ row => {
    if (typeof row.entry === "string") return {...row, path: row.entry, state: runtime.fixedAvailable(row.entry) ? "ready" : "missing"};
    if (!isPeriodicPin(row.entry)) return {...row, path: null, state: "unsupported"};
    const period = row.entry.period, configured = settings[period], source = period === "day" && configured.useDailyNotes ? runtime.dailyNotes() : configured;
    if (!source || !source.format.trim() || source.format.length > 256) return {...row, period, path: null, state: "configuration"};
    const formatted = runtime.format(now, period, source.format, configured.weekStart), path = formatted === null ? null : periodicPinPath(source.folder, formatted);
    return {...row, period, path, state: path === null ? "configuration" : runtime.fileExists(path) ? "ready" : "missing"};
  });
}

/** Opt-in settings edit the one canonical list, retaining every unrelated fixed/future entry. */
export function setPeriodicPinEnabled(pins: readonly SavedPin[], period: PinPeriod, enabled: boolean): SavedPin[] {
  const present = pins.some(/** Match only an explicit known descriptor. */ pin => isPeriodicPin(pin) && pin.period === period);
  if (present === enabled) return [...pins];
  return enabled ? [...pins, {kind: "periodic", period}] : pins.filter(/** Turning off one period never removes a fixed note at its current path. */ pin => !isPeriodicPin(pin) || pin.period !== period);
}
