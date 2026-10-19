/** Validate external own-settings containers before the existing migrations; never substitute defaults for a torn file. */
import {STYLE_SETTINGS_KEYS} from "../../core/contracts/appearance";

/** Own persisted data is an object; unknown future fields remain untouched by this finite safety check. */
export function assertExternalSettingsRecord(raw: unknown): asserts raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Settings data is unavailable");
  const record = raw as Record<string, unknown>;
  const objectKeys = [...STYLE_SETTINGS_KEYS.filter(key => !["tagStyleList", "graphLenses", "backgroundColor", "standardStyleDefaults"].includes(key)),
    "hierarchy", "appearanceThemes", "typographyProfiles", "layoutProfiles", "actionPreferences"];
  for (const key of objectKeys) {
    const value = record[key];
    if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) throw new Error("Invalid settings container");
  }
  for (const key of ["tagStyleList", "navigationHistory", "pinnedNodes", "excludeFilepaths", "graphLenses"]) {
    if (record[key] !== undefined && !Array.isArray(record[key])) throw new Error("Invalid settings collection");
  }
  const hierarchy = record.hierarchy as Record<string, unknown> | undefined;
  if (hierarchy && Object.values(hierarchy).some(value => value !== undefined && (!Array.isArray(value) || value.some(item => typeof item !== "string")))) throw new Error("Invalid hierarchy settings");
}
