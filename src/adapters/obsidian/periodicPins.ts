/** Obsidian supplies its existing Moment calendar and exact native lookup for periodic pins.
 * The injected clock is captured once by portable resolution. Formatting uses cloned local-date
 * instances and never changes the global locale, creates files or activates another plugin. */
import type {App} from "obsidian";
import type {PeriodicPinRuntime} from "../../core/plex/periodicPins";
import {readDailyNotesSettings} from "./dailyNotes";

type LocalMoment = Readonly<{clone(): LocalMoment; isValid(): boolean; startOf(unit: "day" | "week" | "isoWeek" | "month"): LocalMoment; format(format: string): string}>;
type CalendarWindow = Window & {moment?: (time: number) => LocalMoment};

/** Compose finite host reads without passing the plugin/index into portable date/order logic. */
export function createPeriodicPinRuntime(app: App, fixedAvailable: (path: string) => boolean, now: () => number): PeriodicPinRuntime {
  return {
    now, fixedAvailable, dailyNotes: /** Reuse the metadata date source's one optional capability. */ () => readDailyNotesSettings(app),
    fileExists: /** Exact lookup only; formatting never searches for a matching basename. */ path => app.vault.getFileByPath(path) !== null,
    format: /** Anchor each period in the current device-local calendar without mutating shared Moment state. */ (time, period, format, weekStart) => {
      const moment = (window as CalendarWindow).moment;if (typeof moment !== "function" || !Number.isFinite(time)) return null;
      try {
        const date = moment(time).clone();if (!date.isValid()) return null;
        return date.startOf(period === "week" ? weekStart === "iso" ? "isoWeek" : "week" : period).format(format);
      } catch {return null;}
    },
  };
}
