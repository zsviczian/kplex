/**
 * Versioned, JSON-only K-Plex appearance library. Capture uses explicit base/semantic inventories;
 * lens behavior and all workflow settings stay with their existing owners. Operations prepare
 * detached values only: the host's single settings queue owns persistence and publication.
 */
import {appearanceColorReferences, appearanceHasUnsupportedColors} from "../contracts/appearance";
import {NODE_COLOR_FIELDS, LINK_COLOR_FIELDS, type ColorValue} from "../contracts/colorValue";
import {adoptStandardThemeColors, STANDARD_NODE_COLOR_STYLES, STANDARD_LINK_COLOR_STYLES} from "./colorEditing";
import {migrateColorPreferences, cyclicSemanticColorSlots, type ColorPreferencesV1} from "./colorPreferences";

export const DEFAULT_THEME_ID = "default";
export const MAX_APPEARANCE_THEMES = 5000;
export const BASE_THEME_STYLE_KEYS = [...STANDARD_NODE_COLOR_STYLES, ...STANDARD_LINK_COLOR_STYLES] as const;
type StyleRecord = Record<string, unknown>;
type LensColors = {node?: Partial<Record<typeof NODE_COLOR_FIELDS[number], ColorValue>>; edge?: Partial<Record<typeof LINK_COLOR_FIELDS[number], ColorValue>>};
export type ThemeBase = Record<typeof BASE_THEME_STYLE_KEYS[number], StyleRecord> & {backgroundColor?: ColorValue; standardStyleDefaults: "native" | "legacy"};
export type ThemeSemantic = {noteTypeStyles: Record<string, StyleRecord>; tagNodeStyles: Record<string, StyleRecord>;
  tagStyleList: string[]; hierarchyLinkStyles: Record<string, StyleRecord>; colorPreferences: ColorPreferencesV1; lensColors: Record<string, LensColors>};
export type ThemeAppearance = {base: ThemeBase; semantic: ThemeSemantic};
export type AppearanceTheme = {id: string; name: string; appearance: ThemeAppearance};
export type AppearanceThemeLibrary = {version: 1; migrationComplete: true; selectedId: string; themes: AppearanceTheme[]; migrationNotice: boolean};
export type ThemeAppearanceInput = ThemeBase & Omit<ThemeSemantic, "lensColors"> & {graphLenses: Array<{id: string; style?: {node?: StyleRecord; edge?: StyleRecord}}>};
export type ThemeNames = {default: string; user: string; nativeBase: string; custom: string};
export type ColorResetScope = "base" | "semantic" | "all";
export type AppearanceOwner = Readonly<{themeId: string | undefined; activation: number}>;
export type AppearanceThemeAction = {kind: "select" | "delete"; id: string} | {kind: "rename"; id: string; name: string}
  | {kind: "create"; id: string; name: string; fromDefaults: boolean} | {kind: "dismiss-migration"};

/** Copy supported persisted JSON without requiring browser/Node globals in portable core. */
export function copyThemeValue<T>(value: T): T {
  if (value === undefined) return value;
  const copy: unknown = JSON.parse(JSON.stringify(value)); return copy as T;
}

/** Compare JSON meaning without allowing property insertion order to manufacture a changed save. */
export function themeValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(/** Retain meaningful array order and length. */ (value, index) => themeValuesEqual(value, b[index]));
  if (!record(a) || !record(b)) return false;
  const keys = Object.keys(a).filter(/** JSON absence and undefined represent the same inherited slot. */ key => a[key] !== undefined), other = Object.keys(b).filter(/** Ignore fields omitted by JSON persistence. */ key => b[key] !== undefined);
  return keys.length === other.length && keys.every(/** Compare each own value without accepting inherited dictionary entries. */ key => Object.prototype.hasOwnProperty.call(b, key) && themeValuesEqual(a[key], b[key]));
}

/** Recognize persisted object containers without interpreting arrays as dictionaries. */
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }

/** Project only known colors; missing overrides stay missing rather than borrowing the prior theme. */
function colorFields(value: StyleRecord | undefined, fields: readonly string[]): StyleRecord {
  return Object.fromEntries(fields.filter(/** Only explicitly assigned source fields enter the projection. */ field => value?.[field] !== undefined).map(/** Detach a preserved source identity from its live style. */ field => [field, copyThemeValue(value?.[field])]));
}

/** Capture complete supported styles, a private palette and only stable-ID lens color assignments. */
export function captureThemeAppearance(source: ThemeAppearanceInput): ThemeAppearance {
  const styles = Object.fromEntries(BASE_THEME_STYLE_KEYS.map(/** Capture only this known complete style record. */ key => [key, copyThemeValue(source[key])])) as Record<typeof BASE_THEME_STYLE_KEYS[number], StyleRecord>;
  const base: ThemeBase = {...styles, standardStyleDefaults: source.standardStyleDefaults};
  if (source.backgroundColor !== undefined) base.backgroundColor = copyThemeValue(source.backgroundColor);
  const lensColors: ThemeSemantic["lensColors"] = {};
  for (const lens of source.graphLenses) {
    const node = colorFields(lens.style?.node, NODE_COLOR_FIELDS), edge = colorFields(lens.style?.edge, LINK_COLOR_FIELDS);
    if (Object.keys(node).length || Object.keys(edge).length) Object.defineProperty(lensColors, lens.id, {value: {node, edge}, enumerable: true, configurable: true, writable: true});
  }
  return {base, semantic: {noteTypeStyles: copyThemeValue(source.noteTypeStyles), tagNodeStyles: copyThemeValue(source.tagNodeStyles),
    tagStyleList: [...source.tagStyleList], hierarchyLinkStyles: copyThemeValue(source.hierarchyLinkStyles), colorPreferences: copyThemeValue(source.colorPreferences), lensColors}};
}

/** Apply the active appearance only; never recreate a lens or change its expressions/order/non-color style. */
export function applyThemeAppearance(target: ThemeAppearanceInput, appearance: ThemeAppearance): void {
  for (const key of BASE_THEME_STYLE_KEYS) target[key] = copyThemeValue(appearance.base[key]);
  target.backgroundColor = copyThemeValue(appearance.base.backgroundColor);
  target.standardStyleDefaults = appearance.base.standardStyleDefaults;
  for (const key of ["noteTypeStyles", "tagNodeStyles", "tagStyleList", "hierarchyLinkStyles", "colorPreferences"] as const)
    Object.assign(target, {[key]: copyThemeValue(appearance.semantic[key])});
  for (const lens of target.graphLenses) {
    const projection = Object.prototype.hasOwnProperty.call(appearance.semantic.lensColors, lens.id) ? appearance.semantic.lensColors[lens.id] : undefined;
    const style = copyThemeValue(lens.style ?? {});
    for (const [part, fields] of [["node", NODE_COLOR_FIELDS], ["edge", LINK_COLOR_FIELDS]] as const) {
      const next = {...style[part]}; for (const field of fields) delete next[field];
      Object.assign(next, copyThemeValue(projection?.[part] ?? {}));
      if (Object.keys(next).length) style[part] = next; else delete style[part];
    }
    lens.style = Object.keys(style).length ? style : undefined;
  }
}

/** Build deterministic migration choices once; imported appearance follows the existing-user path. */
export function createAppearanceThemes(current: ThemeAppearanceInput, factory: ThemeAppearanceInput, existing: boolean, names: ThemeNames): AppearanceThemeLibrary {
  const defaults: AppearanceTheme = {id: DEFAULT_THEME_ID, name: names.default, appearance: captureThemeAppearance(factory)};
  if (!existing) return {version: 1, migrationComplete: true, selectedId: DEFAULT_THEME_ID, themes: [defaults], migrationNotice: false};
  const native = copyThemeValue(current); adoptStandardThemeColors(native);
  return {version: 1, migrationComplete: true, selectedId: "user", migrationNotice: true, themes: [
    {id: "user", name: names.user, appearance: captureThemeAppearance(current)},
    {id: "native-base", name: names.nativeBase, appearance: captureThemeAppearance(native)}, defaults]};
}

/** Reject lossy/future containers as a whole; the host preserves the untouched raw field read-only. */
export function readAppearanceThemes(raw: unknown): AppearanceThemeLibrary | undefined {
  if (!record(raw) || raw.version !== 1 || raw.migrationComplete !== true || !Array.isArray(raw.themes) || !raw.themes.length
    || raw.themes.length > MAX_APPEARANCE_THEMES || typeof raw.selectedId !== "string" || typeof raw.migrationNotice !== "boolean") return undefined;
  const ids = new Set<string>(), names = new Set<string>();
  for (const entry of raw.themes) {
    if (!record(entry) || typeof entry.id !== "string" || !entry.id || entry.id.length > 100 || ids.has(entry.id)
      || typeof entry.name !== "string" || !entry.name.trim() || entry.name.length > 100 || names.has(entry.name.trim().toLocaleLowerCase())
      || !record(entry.appearance) || !validAppearance(entry.appearance)) return undefined;
    ids.add(entry.id); names.add(entry.name.trim().toLocaleLowerCase());
  }
  return ids.has(DEFAULT_THEME_ID) && ids.has(raw.selectedId) ? copyThemeValue(raw) as AppearanceThemeLibrary : undefined;
}

/** Validate finite style containers and supported sources without sampling or flattening source identities. */
function validAppearance(value: Record<string, unknown>): boolean {
  const base = value.base, semantic = value.semantic;
  if (!record(base) || !record(semantic) || !BASE_THEME_STYLE_KEYS.every(/** All supported standard records must exist. */ key => record(base[key]))
    || !["native", "legacy"].includes(String(base.standardStyleDefaults)) || !record(semantic.noteTypeStyles) || !record(semantic.tagNodeStyles)
    || !record(semantic.hierarchyLinkStyles) || !Array.isArray(semantic.tagStyleList) || !semantic.tagStyleList.every(/** Ordering consists of literal tag matching keys. */ item => typeof item === "string") || !record(semantic.lensColors)) return false;
  for (const key of ["noteTypeStyles", "tagNodeStyles", "hierarchyLinkStyles"] as const) {
    const styles = semantic[key]; if (!record(styles) || !Object.values(styles).every(record)) return false;
  }
  const migrated = migrateColorPreferences(semantic.colorPreferences);
  if (migrated.future !== undefined || cyclicSemanticColorSlots(migrated.preferences).length) return false;
  const lenses = [];
  for (const [id, colors] of Object.entries(semantic.lensColors)) {
    if (!record(colors) || Object.keys(colors).some(/** Lens projection carries no behavior or non-color style. */ key => key !== "node" && key !== "edge")) return false;
    for (const [part, fields] of [["node", NODE_COLOR_FIELDS], ["edge", LINK_COLOR_FIELDS]] as const)
      if (colors[part] !== undefined && (!record(colors[part]) || Object.keys(colors[part]).some(/** Reject extensions that cannot be represented losslessly. */ key => !fields.some(/** Match only this part’s public color inventory. */ field => field === key)))) return false;
    lenses.push({id, style: colors});
  }
  const source = {...base, ...semantic, graphLenses: lenses};
  if (appearanceHasUnsupportedColors(source)) return false;
  const ids = new Set(migrated.preferences.palette.map(/** Palette references are local to this theme. */ pair => pair.id));
  return appearanceColorReferences(source).every(/** Missing named identities cannot be certified as an authentic complete appearance. */ color => typeof color === "string" || color.kind !== "palette" || ids.has(color.id));
}

/** Validate display names independently of stable identity, using the existing editors' inline feedback. */
export function validThemeName(library: AppearanceThemeLibrary, name: string, exceptId?: string): boolean {
  const normalized = name.trim().toLocaleLowerCase();
  return !!normalized && name.trim().length <= 100 && !library.themes.some(/** Compare stable identities or display-name ownership without activating anything. */ theme => theme.id !== exceptId && theme.name.trim().toLocaleLowerCase() === normalized);
}

/** Find a unique localized copy-on-write name without changing any prior theme's identity or content. */
export function uniqueThemeName(library: AppearanceThemeLibrary, base: string): string {
  if (!base.trim()) throw new Error("Invalid automatic theme name");
  const stem = base.trim().slice(0, 100); let name = stem, suffix = 2;
  while (!validThemeName(library, name)) {const tail = ` ${suffix++}`; name = stem.slice(0, 100 - tail.length) + tail;}
  return name;
}

/** Create an independently owned appearance copy; the host publishes selection only after storage succeeds. */
export function addAppearanceTheme(library: AppearanceThemeLibrary, id: string, name: string, fromDefaults: boolean): AppearanceThemeLibrary {
  if (!validThemeName(library, name) || !id || library.themes.some(/** Compare stable identities or display-name ownership without activating anything. */ theme => theme.id === id) || library.themes.length >= MAX_APPEARANCE_THEMES) throw new Error("Invalid new theme");
  const source = library.themes.find(/** Locate the explicit stable theme identity. */ theme => theme.id === (fromDefaults ? DEFAULT_THEME_ID : library.selectedId));
  if (!source) throw new Error("Source theme no longer exists");
  const next = copyThemeValue(library); next.themes.push({id, name: name.trim(), appearance: copyThemeValue(source.appearance)}); next.selectedId = id; return next;
}

/** Rename metadata alone; stable identity, selected appearance and factory theme remain unchanged. */
export function renameAppearanceTheme(library: AppearanceThemeLibrary, id: string, name: string): AppearanceThemeLibrary {
  if (id === DEFAULT_THEME_ID || !validThemeName(library, name, id)) throw new Error("Invalid theme rename");
  const next = copyThemeValue(library), theme = next.themes.find(/** Resolve only the requested metadata owner. */ candidate => candidate.id === id);
  if (!theme) throw new Error("Theme no longer exists"); theme.name = name.trim(); return next;
}

/** Delete and select the factory fallback in one candidate; an inactive deletion leaves selection exact. */
export function deleteAppearanceTheme(library: AppearanceThemeLibrary, id: string): AppearanceThemeLibrary {
  if (id === DEFAULT_THEME_ID || !library.themes.some(/** Compare stable identities or display-name ownership without activating anything. */ theme => theme.id === id)) throw new Error("Theme cannot be deleted");
  const next = copyThemeValue(library); next.themes = next.themes.filter(/** Remove only this confirmed stable identity. */ theme => theme.id !== id);
  if (next.selectedId === id) next.selectedId = DEFAULT_THEME_ID; return next;
}

/** Explicit selection only; opening a manager/editor has no activation side effect. */
export function selectAppearanceTheme(library: AppearanceThemeLibrary, id: string): AppearanceThemeLibrary {
  if (!library.themes.some(/** Compare stable identities or display-name ownership without activating anything. */ theme => theme.id === id)) throw new Error("Theme no longer exists");
  return library.selectedId === id ? library : {...library, selectedId: id};
}

/** Execute a finite library intent inside the existing host queue; no effect occurs before publication. */
export function editAppearanceThemeLibrary(library: AppearanceThemeLibrary, action: AppearanceThemeAction): AppearanceThemeLibrary {
  switch (action.kind) {
    case "select": return selectAppearanceTheme(library, action.id);
    case "delete": return deleteAppearanceTheme(library, action.id);
    case "rename": return renameAppearanceTheme(library, action.id, action.name);
    case "create": return addAppearanceTheme(library, action.id, action.name, action.fromDefaults);
    case "dismiss-migration": return library.migrationNotice ? {...library, migrationNotice: false} : library;
  }
}

/** Unknown or damaged sources cannot be turned into an apparently authentic editable backup. */
export function canCaptureThemeAppearance(source: ThemeAppearanceInput): boolean { return validAppearance(captureThemeAppearance(source)); }

/** Record only a genuinely changed appearance; factory defaults are immutable and copied atomically. */
export function recordThemeAppearance(library: AppearanceThemeLibrary, appearance: ThemeAppearance, id: string, customName: string): AppearanceThemeLibrary {
  const selected = library.themes.find(/** Locate the explicit stable theme identity. */ theme => theme.id === library.selectedId);
  if (!selected) throw new Error("Selected theme no longer exists");
  if (themeValuesEqual(selected.appearance, appearance)) return library;
  const next = copyThemeValue(library);
  if (selected.id === DEFAULT_THEME_ID) {
    if (next.themes.length >= MAX_APPEARANCE_THEMES) throw new Error("Theme limit reached");
    if (next.themes.some(/** Compare stable identities or display-name ownership without activating anything. */ theme => theme.id === id)) throw new Error("Theme identity collision");
    next.themes.push({id, name: uniqueThemeName(next, customName), appearance: copyThemeValue(appearance)}); next.selectedId = id;
  } else next.themes.find(/** Locate the explicit stable theme identity. */ theme => theme.id === selected.id)!.appearance = copyThemeValue(appearance);
  return next;
}

/** List the exact finite semantic color scope without counting palette definitions or non-color fields. */
export function semanticColorSlots(source: ThemeAppearanceInput): string[] {
  const slots: string[] = [];
  for (const key of ["noteTypeStyles", "tagNodeStyles", "hierarchyLinkStyles"] as const)
    for (const [name, style] of Object.entries(source[key])) for (const field of key === "hierarchyLinkStyles" ? LINK_COLOR_FIELDS : NODE_COLOR_FIELDS)
      if (style[field] !== undefined) slots.push(`${key}.${name}.${field}`);
  for (const key of Object.keys(source.colorPreferences.semantic)) slots.push(`semantic.${key}`);
  for (const key of Object.keys(source.colorPreferences.compass.fills)) slots.push(`compass.${key}`);
  for (const lens of source.graphLenses) for (const [part, fields] of [["node", NODE_COLOR_FIELDS], ["edge", LINK_COLOR_FIELDS]] as const)
    for (const field of fields) if (lens.style?.[part]?.[field] !== undefined) slots.push(`lens.${lens.id}.${part}.${field}`);
  return slots;
}

/** Reset source assignments only; preserve rules/order, palette, geometry, lens behavior and Compass activation/intensity. */
export function resetAppearanceColors(source: ThemeAppearanceInput, scope: ColorResetScope): void {
  if (scope === "base" || scope === "all") adoptStandardThemeColors(source);
  if (scope === "base") return;
  for (const key of ["noteTypeStyles", "tagNodeStyles", "hierarchyLinkStyles"] as const)
    for (const style of Object.values(source[key])) for (const field of key === "hierarchyLinkStyles" ? LINK_COLOR_FIELDS : NODE_COLOR_FIELDS) delete style[field];
  source.colorPreferences.semantic = {}; source.colorPreferences.compass.fills = {};
  for (const lens of source.graphLenses) for (const [part, fields] of [["node", NODE_COLOR_FIELDS], ["edge", LINK_COLOR_FIELDS]] as const)
    for (const field of fields) if (lens.style?.[part]) delete lens.style[part][field];
}
