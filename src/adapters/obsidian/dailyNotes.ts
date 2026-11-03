/** Shared finite Daily Notes capability for metadata dates and current-period navigation. This
 * adapter alone reads the optional internal-plugin configuration; no vault scan or note creation.
 * Disabled/missing capabilities are explicit, and source/parser code never retains the host. */
import type {App} from "obsidian";

export type DailyNotesSettings = Readonly<{folder: string; format: string}>;
type DailyNotesApp = App & Readonly<{internalPlugins?: Readonly<{getPluginById?: (id: string) => unknown; plugins?: Readonly<Record<string, unknown>>}>}>;

/** Preserve the metadata adapter's existing folder/format/default rules for the shared host read. */
export function readDailyNotesSettings(app: App): DailyNotesSettings | null {
  const registry = (app as DailyNotesApp).internalPlugins;
  const candidate = registry?.getPluginById?.("daily-notes") ?? registry?.plugins?.["daily-notes"];
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Record<string, unknown>;if (record.enabled === false) return null;
  const instance = record.instance && typeof record.instance === "object" ? record.instance as Record<string, unknown> : record;
  const options = instance.options && typeof instance.options === "object" ? instance.options as Record<string, unknown> : instance;
  const folder = typeof options.folder === "string" ? options.folder : "";
  const format = typeof options.format === "string" && options.format.trim() ? options.format : "YYYY-MM-DD";
  return {folder: folder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/"), format};
}
