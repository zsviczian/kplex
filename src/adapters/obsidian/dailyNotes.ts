/** Shared finite Daily Notes capability. Metadata dates retain their read-only folder/format
 * projection; pin activation alone may delegate confirmed creation to Obsidian's core Daily
 * Notes owner, preserving its template processing without opening a native editor. */
import {TFile, type App} from "obsidian";
import {periodicPinPath} from "../../core/plex/periodicPins";

export type DailyNotesSettings = Readonly<{folder: string; format: string}>;
type DailyNotesApp = App & Readonly<{internalPlugins?: Readonly<{getPluginById?: (id: string) => unknown; plugins?: Readonly<Record<string, unknown>>}>}>;

/** Keep the guarded optional internal-plugin boundary in one host adapter. */
function dailyNotesInstance(app: App): Record<string, unknown> | null {
  const registry = (app as DailyNotesApp).internalPlugins;
  const candidate = registry?.getPluginById?.("daily-notes") ?? registry?.plugins?.["daily-notes"];
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Record<string, unknown>;if (record.enabled === false) return null;
  return record.instance && typeof record.instance === "object" ? record.instance as Record<string, unknown> : record;
}

/** Preserve metadata date parsing's existing folder/format/default projection exactly. */
export function readDailyNotesSettings(app: App): DailyNotesSettings | null {
  const instance = dailyNotesInstance(app);
  if (!instance) return null;
  const options = instance.options && typeof instance.options === "object" ? instance.options as Record<string, unknown> : instance;
  const folder = typeof options.folder === "string" ? options.folder : "";
  const format = typeof options.format === "string" && options.format.trim() ? options.format : "YYYY-MM-DD";
  return {folder: folder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/"), format};
}

/** Core Daily Notes uses the default new-note parent when no dedicated folder is configured.
 * This presentation-only projection does not change metadata date cache signatures. */
export function readDailyPinSettings(app: App): DailyNotesSettings | null {
  const settings = readDailyNotesSettings(app);
  if (!settings || settings.folder) return settings;
  const parent = app.fileManager.getNewFileParent("");
  return {...settings, folder: parent.path === "/" ? "" : parent.path};
}

type DailyMoment = Readonly<{clone(): DailyMoment; startOf(unit: "day"): DailyMoment; isValid(): boolean; format(format: string): string}>;
type DailyCalendarWindow = Window & {moment?: (time: number) => DailyMoment};

/** The installed core capability was inspected and native-tested: getDailyNote(date) creates
 * with its configured template through FileManager and returns the file without opening it.
 * It is unpublished, so absence is explicit rather than silently creating an empty substitute.
 * Once accepted, core owns its asynchronous write; dismissal only retires later UI effects. */
export async function createConfiguredDailyNote(app: App, path: string, current: () => boolean): Promise<TFile | null> {
  const instance = dailyNotesInstance(app), settings = readDailyPinSettings(app);
  const factory = (window as DailyCalendarWindow).moment;
  if (!current() || !instance || !settings || typeof instance.getDailyNote !== "function" || typeof factory !== "function") return null;
  const date = factory(Date.now()).clone().startOf("day");
  if (!date.isValid() || periodicPinPath(settings.folder, date.format(settings.format).trim()) !== path) return null;
  const create = instance.getDailyNote as (date: DailyMoment) => Promise<unknown>;
  const file: unknown = await create.call(instance, date);
  if (!current() || dailyNotesInstance(app) !== instance || !(file instanceof TFile)
    || file.path !== path || app.vault.getFileByPath(path) !== file) return null;
  return file;
}
