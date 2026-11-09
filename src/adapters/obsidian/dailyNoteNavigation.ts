/** Read-only Daily Notes navigation inventory. The configured native folder is walked only for
 * an explicit calendar/gap request, yielding cooperatively. Strict host Moment parsing supports
 * nested folders without reading note bodies, guessing date prefixes or acquiring index sources. */
import {TFile, TFolder, type TAbstractFile, type App} from "obsidian";
import {calendarDay} from "../../core/plex/calendarDates";
import {periodicPinPath} from "../../core/plex/periodicPins";
import {readDailyPinSettings, type DailyNotesSettings} from "./dailyNotes";
import {yieldToHostTask} from "./yieldToHostTask";

type JournalMoment = Readonly<{isValid(): boolean; format(format: string): string; localeData(): {firstDayOfWeek(): number}}>;
type JournalCalendarWindow = Window & {moment?: (value: string, format: string, strict: boolean) => JournalMoment};
export type DailyNoteEntry = Readonly<{date: string; file: TFile}>;

/** Host date parsing stays strict and round-trips the configured filename, including literal text. */
function parseDailyDate(value: string, format: string): string | null {
  const factory = (window as JournalCalendarWindow).moment; if (typeof factory !== "function") return null;
  const parsed = factory(value, format, true);
  if (!parsed.isValid() || parsed.format(format) !== value) return null;
  const date = parsed.format("YYYY-MM-DD"); return calendarDay(date) ? date : null;
}

/** Interpret only a strict configured date path or an explicitly year-bearing basename. */
function dateFromDailyPath(path: string, settings: DailyNotesSettings): string | null {
  const relative = path.endsWith(".md") ? path.slice(0, -3) : path;
  const formats = settings.format.split("/"), suffix = formats[formats.length - 1];
  return parseDailyDate(relative, settings.format)
    ?? parseDailyDate(relative.split("/").slice(-formats.length).join("/"), settings.format)
    ?? (/Y/.test(suffix.replace(/\[[^\]]*\]/g, "")) ? parseDailyDate(relative.split("/").pop() ?? "", suffix) : null);
}

/** Offer native daily-template creation for an unresolved date without reading or creating files.
 * Core Daily Notes owns the canonical destination; the materialization dialog shows it explicitly. */
export function dailyNoteCreationTarget(app: App, path: string, settings = readDailyPinSettings(app)): Readonly<{date: string; path: string}> | null {
  if (!settings) return null;
  const date = dateFromDailyPath(path, settings), destination = date && dailyNotePath(app, date, settings);
  return date && destination ? {date, path: destination} : null;
}

/** Resolve a current Markdown daily note under the configured folder, including additional subfolders. */
export function dailyNoteDate(app: App, file: TFile, settings = readDailyPinSettings(app)): string | null {
  if (!settings || file.extension !== "md" || app.vault.getFileByPath(file.path) !== file) return null;
  const prefix = settings.folder ? `${settings.folder}/` : "";
  if (!file.path.startsWith(prefix)) return null;
  // Extra archive directories may precede the configured date path. A basename fallback must
  // retain an explicit year: parsing MM-DD alone would silently borrow the current year.
  return dateFromDailyPath(file.path.slice(prefix.length), settings);
}

/** Project an arbitrary selected day through the same folder/format owner used by periodic pins. */
export function dailyNotePath(app: App, date: string, settings = readDailyPinSettings(app)): string | null {
  const factory = (window as JournalCalendarWindow).moment;
  if (!settings || !calendarDay(date) || typeof factory !== "function") return null;
  const parsed = factory(date, "YYYY-MM-DD", true);
  return parsed.isValid() ? periodicPinPath(settings.folder, parsed.format(settings.format)) : null;
}

/** Prefer the configured physical destination when historical folders contain duplicate dates. */
export function dailyEntryForDate(app: App, entries: readonly DailyNoteEntry[], date: string): DailyNoteEntry | null {
  const path = dailyNotePath(app, date);
  return entries.find(/** Exact configured identity wins over a same-day historical copy. */ entry => entry.date === date && entry.file.path === path)
    ?? entries.find(/** Otherwise preserve the inventory's deterministic vault-relative order. */ entry => entry.date === date) ?? null;
}

/** Capture only native filenames in the configured tree; settings/identity changes retire the result. */
export async function collectDailyNotes(app: App, current: () => boolean): Promise<readonly DailyNoteEntry[] | null> {
  const settings = readDailyPinSettings(app); if (!settings || !current()) return null;
  const folder = settings.folder ? app.vault.getFolderByPath(settings.folder) : app.vault.getRoot();
  if (!folder) return [];
  /** A replacement native folder cannot inherit an old tree's filename inventory. */
  const folderCurrent = (): boolean => (settings.folder ? app.vault.getFolderByPath(settings.folder) : app.vault.getRoot()) === folder;
  const stack: TAbstractFile[] = [folder], entries: DailyNoteEntry[] = [];
  const signature = JSON.stringify(settings); let visited = 0;
  while (stack.length) {
    if (!current() || !folderCurrent() || signature !== JSON.stringify(readDailyPinSettings(app))) return null;
    const item = stack.pop()!;
    if (item instanceof TFolder) {for (const child of item.children) stack.push(child);}
    else if (item instanceof TFile) {const date = dailyNoteDate(app, item, settings); if (date) entries.push({date, file: item});}
    if ((++visited & 63) === 0) await yieldToHostTask();
  }
  if (!current() || !folderCurrent() || signature !== JSON.stringify(readDailyPinSettings(app))) return null;
  return entries.filter(/** Delete/rename during a cooperative walk cannot leave stale filename candidates. */ entry => dailyNoteDate(app, entry.file, settings) === entry.date)
    .sort(/** Only this explicitly requested folder inventory is sorted, never the global graph. */ (a, b) => a.file.path < b.file.path ? -1 : a.file.path > b.file.path ? 1 : 0);
}

/** Use the host calendar locale's first weekday without mutating its shared locale. */
export function dailyCalendarWeekStart(): number {
  const factory = (window as JournalCalendarWindow).moment;
  return typeof factory === "function" ? factory("2000-01-01", "YYYY-MM-DD", true).localeData().firstDayOfWeek() : 0;
}

/** Compare captured configuration without leaking the optional core-plugin instance to callers. */
export function dailyNotesSettingsCurrent(app: App, captured: DailyNotesSettings): boolean {
  return JSON.stringify(readDailyPinSettings(app)) === JSON.stringify(captured);
}
