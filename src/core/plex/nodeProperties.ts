/** Bounded, display-only fields per note type. Values are requested lazily; nothing here
 * discovers files, parses Markdown, rewrites notes or changes graph relationships. */
export type NodeProperty = Readonly<{field: string; visible: boolean}>;
export type NoteTypeProperties = Readonly<Record<string, readonly NodeProperty[]>>;
export type NodePropertyLine = Readonly<{field: string; text: string}>;
export const MAX_NODE_PROPERTIES = 16;
/** Narrow decoded dictionaries before touching persisted data. */
function record(value: unknown): value is Record<string, unknown> {return !!value && typeof value === "object" && !Array.isArray(value);}

/** Load old installations with no configuration and reject malformed individual definitions. */
export function loadNoteTypeProperties(value: unknown): NoteTypeProperties {
  if (!record(value)) return {};
  const result: Array<[string, NodeProperty[]]> = [];
  for (const [type, rows] of Object.entries(value)) {
    if (!type.trim() || type.length > 128 || !Array.isArray(rows)) continue;
    const fields: NodeProperty[] = [], seen = new Set<string>();
    const bounded: readonly unknown[] = rows.slice(0, MAX_NODE_PROPERTIES);
    for (const row of bounded) {
      if (!record(row) || typeof row.field !== "string" || typeof row.visible !== "boolean") continue;
      const field = row.field.trim(), key = field.toLocaleLowerCase();
      if (!field || field.length > 128 || seen.has(key)) continue;
      seen.add(key);fields.push({field, visible: row.visible});
    }
    result.push([type, fields]);
  }
  return Object.fromEntries(result);
}

/** Validate authored definitions without silently discarding duplicate or unfinished rows. */
export function validNodeProperties(rows: readonly NodeProperty[]): boolean {
  return rows.length <= MAX_NODE_PROPERTIES && rows.every(row => row.field.trim().length > 0 && row.field.trim().length <= 128 && typeof row.visible === "boolean")
    && new Set(rows.map(row => row.field.trim().toLocaleLowerCase())).size === rows.length;
}

/** User-authored type names never resolve inherited dictionary members. */
export function nodePropertyRows(configuration: NoteTypeProperties | undefined, type: string): readonly NodeProperty[] {
  return configuration && Object.prototype.hasOwnProperty.call(configuration, type) ? configuration[type] : [];
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
export function nodePropertyLines(type: string | null, configuration: NoteTypeProperties | undefined, read: (field: string) => unknown): readonly NodePropertyLine[] {
  if (!type || !configuration || !Object.prototype.hasOwnProperty.call(configuration, type)) return [];
  const result: NodePropertyLine[] = [];
  for (const row of nodePropertyRows(configuration, type).slice(0, MAX_NODE_PROPERTIES)) {
    if (!row.visible) continue;
    const text = propertyText(read(row.field));if (text) result.push({field: row.field, text});
  }
  return result;
}
