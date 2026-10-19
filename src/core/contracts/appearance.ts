/** Portable appearance field inventory shared by the existing settings queue and paint-only classification. No host/storage effects. */
import {NODE_COLOR_FIELDS, LINK_COLOR_FIELDS, copyColorValue, type ColorValue} from "./colorValue";

export const STYLE_SETTINGS_KEYS = ["noteTypeStyles", "tagNodeStyles", "tagStyleList", "hierarchyLinkStyles",
  "baseNodeStyle", "centralNodeStyle", "inferredNodeStyle", "virtualNodeStyle", "siblingNodeStyle", "urlNodeStyle",
  "attachmentNodeStyle", "folderNodeStyle", "tagNodeStyle", "baseLinkStyle", "inferredLinkStyle", "folderLinkStyle",
  "tagLinkStyle", "standardStyleDefaults", "backgroundColor", "colorPreferences", "graphLenses"] as const;

/** Only configured appearance fields can use the paint path; matching order and geometry stay conservative. */
export function isColorAppearanceKey(key: string): boolean {
  return key !== "tagStyleList" && STYLE_SETTINGS_KEYS.some(field => field === key);
}

/** Recognize decoded plain record shapes; malformed/future structures retain their comparison value. */
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Remove only known color fields, retaining every geometry/unknown field and original array order. */
function nonColorStyle(value: unknown, fields: readonly string[]): unknown {
  if (value === undefined) return {};
  return record(value) ? Object.fromEntries(Object.entries(value).filter(([key]) => !fields.includes(key))) : value;
}

/** Empty color-only wrappers are equivalent to inheritance for layout, never for stored source identity. */
function emptyRecord(value: unknown): boolean { return record(value) && Object.keys(value).length === 0; }

/**
 * Project one changed field's non-paint meaning. The classifier calls this only after its existing
 * canonical value differs, so ordinary background checks gain no extra whole-settings projection.
 */
export function appearanceWithoutColors(key: string, value: unknown): unknown {
  if (key === "standardStyleDefaults" || key === "backgroundColor" || key === "colorPreferences") return undefined;
  if (key === "noteTypeStyles" || key === "tagNodeStyles" || key === "hierarchyLinkStyles") {
    if (value === undefined) return {};
    if (!record(value)) return value;
    const fields = key === "hierarchyLinkStyles" ? LINK_COLOR_FIELDS : NODE_COLOR_FIELDS;
    return Object.fromEntries(Object.entries(value).map(([name, style]) => [name, nonColorStyle(style, fields)])
      .filter(([, style]) => !emptyRecord(style)));
  }
  if (key === "graphLenses") {
    if (!Array.isArray(value)) return value;
    return value.map((lens: unknown) => {
      if (!record(lens) || !record(lens.style)) return lens;
      const style = { ...lens.style };
      for (const target of ["node", "edge"] as const) {
        const projected = nonColorStyle(style[target], target === "node" ? NODE_COLOR_FIELDS : LINK_COLOR_FIELDS);
        if (emptyRecord(projected)) delete style[target]; else style[target] = projected;
      }
      const result = { ...lens };
      if (emptyRecord(style)) delete result.style; else result.style = style;
      return result;
    });
  }
  return nonColorStyle(value, key.endsWith("LinkStyle") ? LINK_COLOR_FIELDS : NODE_COLOR_FIELDS);
}

/** Visit only configured source slots; never recurse through graph, note or unknown settings data. */
export function mapAppearanceColors(settings: Partial<Record<typeof STYLE_SETTINGS_KEYS[number], unknown>>, map: (value: ColorValue | undefined) => ColorValue | undefined, write = true, inspect?: (value: unknown) => void): void {
  /** Preserve inheritance and unknown style metadata while updating each supported source field. */
  const style = (value: unknown, fields: readonly string[]): void => {
    if (!record(value)) return;
    for (const field of fields) if (field in value) {
      inspect?.(value[field]);
      const source = copyColorValue(value[field]); if (source === undefined) continue;
      const next = map(source); if (!write) continue; if (next === undefined) delete value[field]; else value[field] = next;
    }
  };
  for (const key of STYLE_SETTINGS_KEYS) {
    if (key.endsWith("NodeStyle")) style(settings[key], NODE_COLOR_FIELDS);
    else if (key.endsWith("LinkStyle")) style(settings[key], LINK_COLOR_FIELDS);
    else if (["noteTypeStyles", "tagNodeStyles", "hierarchyLinkStyles"].includes(key) && record(settings[key]))
      for (const value of Object.values(settings[key])) style(value, key === "hierarchyLinkStyles" ? LINK_COLOR_FIELDS : NODE_COLOR_FIELDS);
  }
  if (settings.backgroundColor !== undefined) inspect?.(settings.backgroundColor);
  const background = copyColorValue(settings.backgroundColor);
  if (background !== undefined) { const next = map(background); if (write) { if (next === undefined) delete settings.backgroundColor; else settings.backgroundColor = next; } }
  if (Array.isArray(settings.graphLenses)) for (const lens of settings.graphLenses) if (record(lens) && record(lens.style)) {
    style(lens.style.node, NODE_COLOR_FIELDS); style(lens.style.edge, LINK_COLOR_FIELDS);
  }
  const preferences = settings.colorPreferences;
  if (record(preferences)) {
    style(preferences.semantic, ["origin", "development", "support", "challenge"]);
    if (record(preferences.compass)) style(preferences.compass.fills, ["north", "east", "south", "west"]);
  }
}

/** Read configured references without allocating a whole-settings clone or changing saved identities. */
export function appearanceColorReferences(settings: Readonly<Partial<Record<typeof STYLE_SETTINGS_KEYS[number], unknown>>>): ColorValue[] {
  const references: ColorValue[] = [];
  mapAppearanceColors(settings, value => { if (value !== undefined) references.push(value); return value; }, false);
  return references;
}

/** Detect unsupported known color slots before a destructive palette rewrite; never inspect arbitrary JSON. */
export function appearanceHasUnsupportedColors(settings: Readonly<Partial<Record<typeof STYLE_SETTINGS_KEYS[number], unknown>>>): boolean {
  let unsupported = false;
  mapAppearanceColors(settings, value => value, false, value => { if (value !== undefined && copyColorValue(value) === undefined) unsupported = true; });
  return unsupported;
}
