/** Bounded common/type property definitions shared by creation and display. Definitions contain
 * presentation flags, never invented values. Display values are lazy and nothing here reads or writes notes. */
import {noteTypeTag} from "../graph/tagPaths";
import {normalizeFieldName} from "../contracts/fieldName";
/** Property identity is independent of its optional label; absent new flags preserve legacy rows. */
export type NodeProperty = Readonly<{field: string; visible: boolean; creationVisible?: boolean; showName?: boolean; label?: string; icon?: string}>;
export type NoteTypeProperties = Readonly<Record<string, readonly NodeProperty[]>>;
/** Owning-document measurements are ephemeral presentation values, never semantic/source state. */
export type NodePropertyMeasurement = Readonly<{width: number; height: number}>;
export type NodePropertyLine = Readonly<{field: string; text: string; label?: string; icon?: string; measurement?: NodePropertyMeasurement}>;
export type NodePropertyMeasure = (line: NodePropertyLine) => NodePropertyMeasurement | undefined;
export type NodePropertiesEdit = Readonly<{type: string; previousType?: string | null; opening: readonly NodeProperty[]; rows: readonly NodeProperty[]}>;
export const MAX_NODE_PROPERTIES = 16;
export const DEFAULT_COMMON_NODE_PROPERTIES: readonly NodeProperty[] = [{field: "aliases", visible: false, creationVisible: true}];
export const PROPERTY_FONT_SIZE = {min: 8, max: 20, step: 1, default: 12} as const;
/** One global pixel size governs property painting and all view measurements. */
export function nodePropertyFontSize(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(PROPERTY_FONT_SIZE.min, Math.min(PROPERTY_FONT_SIZE.max, value)) : PROPERTY_FONT_SIZE.default;
}

/** Match the same tag identity across casing and an optional leading hashtag. */
export function nodePropertyType(value: string | null): string | null {return noteTypeTag(value)?.toLocaleLowerCase() ?? null;}
/** Narrow decoded dictionaries before touching persisted data. */
function record(value: unknown): value is Record<string, unknown> {return !!value && typeof value === "object" && !Array.isArray(value);}

/** Decode one bounded row list without inventing values or replacing explicitly disabled flags. */
export function loadNodePropertyRows(value: unknown): readonly NodeProperty[] {
  if (!Array.isArray(value)) return [];
  const fields: NodeProperty[] = [], seen = new Set<string>();
  for (const row of value.slice(0, MAX_NODE_PROPERTIES)) {
    if (!record(row) || typeof row.field !== "string" || typeof row.visible !== "boolean") continue;
    const field = row.field.trim(), key = normalizeFieldName(field);
    if (!key || field.length > 128 || /[\r\n]/.test(field) || key === "position" || seen.has(key)) continue;
    seen.add(key);fields.push({field, visible: row.visible,
      ...(typeof row.creationVisible === "boolean" ? {creationVisible: row.creationVisible} : {}),
      ...(typeof row.showName === "boolean" ? {showName: row.showName} : {}),
      ...(typeof row.label === "string" && row.label.trim() ? {label: row.label.trim().replace(/[\r\n]/g, " ").slice(0, 128)} : {}),
      ...(typeof row.icon === "string" && row.icon.trim() ? {icon: row.icon.trim().replace(/[\r\n]/g, " ").slice(0, 64)} : {}),
    });
  }
  return fields;
}

/** Missing common configuration enables Alias for creation only; an explicit empty list stays empty. */
export function loadCommonNodeProperties(value: unknown): readonly NodeProperty[] {
  return value === undefined ? DEFAULT_COMMON_NODE_PROPERTIES.map(/** Do not lend mutable default row identities to a settings instance. */ row => ({...row})) : loadNodePropertyRows(value);
}

/** Common rows retain their order; a type refines matching normalized identities exactly once.
 * Rows are definitions, never default values. Consumers select creation/display flags independently. */
export function mergedNodePropertyRows(common: readonly NodeProperty[] = [], typeRows: readonly NodeProperty[] = []): readonly NodeProperty[] {
  const result = loadNodePropertyRows(common).map(/** Refinements must never mutate the user's shared definition. */ row => ({...row}));
  const positions = new Map(result.map(/** Match definition identity independently of authored field casing and display labels. */ (row, index) => [normalizeFieldName(row.field), index]));
  for (const row of loadNodePropertyRows(typeRows)) {
    const index = positions.get(normalizeFieldName(row.field));
    if (index !== undefined) result[index] = {...result[index], ...row};
    else if (result.length < MAX_NODE_PROPERTIES * 2) {positions.set(normalizeFieldName(row.field), result.length);result.push({...row});}
  }
  return result;
}

/** Load old installations with no configuration and reject malformed individual definitions. */
export function loadNoteTypeProperties(value: unknown): NoteTypeProperties {
  if (!record(value)) return {};
  const result: Array<[string, readonly NodeProperty[]]> = [], types = new Set<string>();
  for (const [type, rows] of Object.entries(value)) {
    const identity = nodePropertyType(type);
    if (!identity || type.length > 128 || !Array.isArray(rows) || types.has(identity)) continue;types.add(identity);
    result.push([identity, loadNodePropertyRows(rows)]);
  }
  return Object.fromEntries(result);
}

/** Validate authored definitions without silently discarding duplicate or unfinished rows. */
export function validNodeProperties(rows: readonly NodeProperty[]): boolean {
  return rows.length <= MAX_NODE_PROPERTIES && rows.every(/** Reject malformed optional presentation flags before a parent's atomic Save. */ row => !!normalizeFieldName(row.field) && normalizeFieldName(row.field) !== "position" && !/[\r\n]/.test(row.field) && row.field.trim().length <= 128 && typeof row.visible === "boolean"
    && (row.creationVisible === undefined || typeof row.creationVisible === "boolean") && (row.showName === undefined || typeof row.showName === "boolean")
    && (row.label === undefined || typeof row.label === "string" && row.label.length <= 128 && !/[\r\n]/.test(row.label))
    && (row.icon === undefined || typeof row.icon === "string" && row.icon.length <= 64 && !/[\r\n]/.test(row.icon)))
    && new Set(rows.map(/** A differently cased spelling cannot create a duplicate field row. */ row => normalizeFieldName(row.field))).size === rows.length;
}

/** User-authored type names never resolve inherited dictionary members. */
export function nodePropertyRows(configuration: NoteTypeProperties | undefined, type: string): readonly NodeProperty[] {
  const key = nodePropertyType(type);
  return key && configuration && Object.prototype.hasOwnProperty.call(configuration, key) ? configuration[key] : [];
}

/** Only scalar values and bounded scalar lists become plain text. Empty/complex values stay absent. */
function propertyText(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 512).replace(/\s+/g, " ").trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.slice(0, 16).filter(item => !Array.isArray(item)).map(propertyText).filter(Boolean).join(", ").slice(0, 512);
  return "";
}

/** Hidden fields never invoke the reader; missing metadata cannot create empty decoration rows. */
export function nodePropertyLines(type: string | null, configuration: NoteTypeProperties | undefined, read: (field: string) => unknown, common: readonly NodeProperty[] = []): readonly NodePropertyLine[] {
  const result: NodePropertyLine[] = [];
  for (const row of mergedNodePropertyRows(common, type ? nodePropertyRows(configuration, type) : [])) {
    if (!row.visible) continue;
    const text = propertyText(read(row.field));if (text) result.push({field: row.field, text,
      ...(row.showName ? {label: row.label?.trim() || row.field} : {}), ...(row.icon ? {icon: row.icon} : {})});
  }
  return result;
}
