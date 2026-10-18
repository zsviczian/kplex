/**
 * Portable, settings-only color operations. The existing serialized writer supplies its latest
 * appearance draft; this owner never reads a graph, vault, DOM or storage. Known color fields
 * alone participate in adoption, usage counting and atomic named-color replacement.
 */
import {appearanceColorReferences, mapAppearanceColors, appearanceHasUnsupportedColors} from "../contracts/appearance";
import {colorValuesEqual, copyColorValue, NODE_COLOR_FIELDS, LINK_COLOR_FIELDS, type ColorValue} from "../contracts/colorValue";
import type {ColorPreferencesV1, SemanticColorPair} from "./colorPreferences";

export const STANDARD_NODE_COLOR_STYLES = ["baseNodeStyle", "centralNodeStyle", "inferredNodeStyle", "virtualNodeStyle", "siblingNodeStyle", "urlNodeStyle", "attachmentNodeStyle", "folderNodeStyle", "tagNodeStyle"] as const;
export const STANDARD_LINK_COLOR_STYLES = ["baseLinkStyle", "inferredLinkStyle", "folderLinkStyle", "tagLinkStyle"] as const;
type ConfiguredColors = Parameters<typeof mapAppearanceColors>[0];
type ColorEditDraft = ConfiguredColors & {colorPreferences: ColorPreferencesV1; standardStyleDefaults?: "native" | "legacy"};
/** Merge only changed style fields, retaining concurrent colors, geometry and unknown metadata. */
export function mergeStyleDraft<T extends object>(initial: T, edited: T, latest: T, fields: readonly string[]): T {
  const next = {...latest};
  for (const field of new Set([...Object.keys(initial), ...Object.keys(edited)])) {
    const before: unknown = Reflect.get(initial, field), after: unknown = Reflect.get(edited, field);
    if (fields.includes(field) ? colorValuesEqual(before, after) : JSON.stringify(before) === JSON.stringify(after)) continue;
    if (after === undefined) Reflect.deleteProperty(next, field); else Object.assign(next, {[field]: after});
  }
  return next;
}

/** Count each configured use once; names and actual graph occurrence counts are intentionally irrelevant. */
export function namedColorUsage(settings: ConfiguredColors): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const source of appearanceColorReferences(settings)) if (typeof source !== "string" && source.kind === "palette") counts.set(source.id, (counts.get(source.id) ?? 0) + 1);
  return counts;
}

/** New identities must exist at the latest queue boundary; unchanged damaged sources remain repairable. */
export function requireNamedColor(value: ColorValue | undefined, preferences: ColorPreferencesV1): void {
  if (value && typeof value !== "string" && value.kind === "palette" && !preferences.palette.some(pair => pair.id === value.id)) throw new Error("Named color no longer exists");
}

/** Replace every supported reference and delete its pair in the same current appearance draft. */
export function deleteNamedColor(draft: ColorEditDraft, id: string, replacement: ColorValue | undefined): void {
  if (appearanceHasUnsupportedColors(draft)) throw new Error("Unsupported color sources prevent safe deletion");
  if (!draft.colorPreferences.palette.some(pair => pair.id === id)) throw new Error("Named color no longer exists");
  if (replacement && typeof replacement !== "string" && replacement.kind === "palette" && replacement.id === id) throw new Error("A deleted color cannot replace itself");
  requireNamedColor(replacement, draft.colorPreferences);
  const clearsStandard = replacement === undefined && appearanceColorReferences(Object.fromEntries(
    ["backgroundColor", ...STANDARD_NODE_COLOR_STYLES, ...STANDARD_LINK_COLOR_STYLES].map(key => [key, draft[key as keyof ConfiguredColors]])))
    .some(source => typeof source !== "string" && source.kind === "palette" && source.id === id);
  mapAppearanceColors(draft, source => source && typeof source !== "string" && source.kind === "palette" && source.id === id
    ? replacement === undefined ? undefined : copyColorValue(replacement) : source);
  draft.colorPreferences.palette = draft.colorPreferences.palette.filter(pair => pair.id !== id);
  if (clearsStandard) draft.standardStyleDefaults = "native";
}

/** Merge only explicitly edited pair fields; rename cannot restore a concurrently updated variant. */
export function saveNamedColor(draft: ColorEditDraft, initial: SemanticColorPair | null, edited: SemanticColorPair): void {
  const position = draft.colorPreferences.palette.findIndex(pair => pair.id === edited.id);
  if (!initial) {
    if (position >= 0 || draft.colorPreferences.palette.length >= 5000) throw new Error("Named color cannot be added");
    draft.colorPreferences.palette.push({...edited}); return;
  }
  if (position < 0 || initial.id !== edited.id) throw new Error("Named color no longer exists");
  const latest = draft.colorPreferences.palette[position], next = {...latest};
  for (const field of ["name", "light", "dark"] as const) if (edited[field] !== initial[field]) next[field] = edited[field];
  draft.colorPreferences.palette[position] = next;
}

/** Report exact affected standard slots without changing them, for explicit adoption confirmation. */
export function standardColorSlots(settings: ConfiguredColors): string[] {
  const slots: string[] = [];
  if (settings.backgroundColor !== undefined) slots.push("backgroundColor");
  for (const key of [...STANDARD_NODE_COLOR_STYLES, ...STANDARD_LINK_COLOR_STYLES]) {
    const style = settings[key]; if (!style || typeof style !== "object" || Array.isArray(style)) continue;
    const fields = key.endsWith("NodeStyle") ? NODE_COLOR_FIELDS : LINK_COLOR_FIELDS;
    for (const field of fields) if (Object.prototype.hasOwnProperty.call(style, field)) slots.push(`${key}.${field}`);
  }
  return slots;
}

/** Clear standard color overrides only; geometry, dictionaries, lenses and local palette remain exact. */
export function adoptStandardThemeColors(draft: ColorEditDraft): void {
  delete draft.backgroundColor;
  for (const key of [...STANDARD_NODE_COLOR_STYLES, ...STANDARD_LINK_COLOR_STYLES]) {
    const value = draft[key]; if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const fields: readonly string[] = key.endsWith("NodeStyle") ? NODE_COLOR_FIELDS : LINK_COLOR_FIELDS;
    draft[key] = Object.fromEntries(Object.entries(value).filter(([field]) => !fields.includes(field)));
  }
  draft.standardStyleDefaults = "native";
}

/** Remove only enumerated optional color fields from one detached standard style. */
export function withoutStyleColorOverrides<T extends object>(style: T, fields: readonly string[]): T {
  const next = {...style}; for (const field of fields) Reflect.deleteProperty(next, field); return next;
}
