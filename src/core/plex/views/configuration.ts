/** Bounded view-type preferences. Native/session state and semantic policy never enter this owner. */
export type PlexViewConfigurationSchema = Readonly<{
  version: 1;
  fields: Readonly<Record<string, Readonly<{defaultValue: unknown; validate: (value: unknown) => boolean}>>>;
}>;
export type PlexViewConfiguration = Readonly<{status: "available"; values: Readonly<Record<string, unknown>>}>
  | Readonly<{status: "unavailable"; reason: "invalid" | "unsupported"}>;

export const VIEW_CONFIGURATION_LIMITS = {views: 32, fields: 64, encodedCharacters: 16_384, depth: 8} as const;
const identifier = /^[a-z][a-z0-9.-]{0,79}$/;
const fieldName = /^[a-z][a-zA-Z0-9-]{0,63}$/;
/** Saved JSON must never make prototype fields into configuration keys. */
export function viewConfigurationKey(key: string): boolean {
  return fieldName.test(key) && !["constructor", "prototype", "__proto__"].includes(key);
}
/** A map replacement, schema replacement and scalar edit have separate remote epochs. */
export function viewConfigurationOwnerDomains(domain: string): readonly string[] {
  const match = /^canvasViewSettings:([a-z][a-z0-9.-]{0,79}):([a-z][a-zA-Z0-9-]{0,63})$/.exec(domain);
  return match ? ["canvasViewSettings", `canvasViewSettings:${match[1]}`, domain]
    : /^canvasViewSettings:[a-z][a-z0-9.-]{0,79}$/.test(domain) ? ["canvasViewSettings", domain] : [domain];
}
/** Unknown/future JSON is retained by persistence, but never executed or made effective. */
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
/** Bound traversal before serialization, including cyclic or non-JSON programmatic input. */
function bounded(value: unknown, depth = 0, remaining = {nodes: 4096, characters: VIEW_CONFIGURATION_LIMITS.encodedCharacters}): boolean {
  if (depth > VIEW_CONFIGURATION_LIMITS.depth || --remaining.nodes < 0) return false;
  if (typeof value === "string") {remaining.characters -= value.length; return remaining.characters >= 0;}
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (!Array.isArray(value) && !record(value)) return false;
  return Object.entries(value).every(([key, child]) => {
    remaining.characters -= key.length;
    return remaining.characters >= 0 && bounded(child, depth + 1, remaining);
  });
}
/** Each effective payload is detached and limited to 16,384 UTF-16 code units of encoded JSON. */
function json(value: unknown): unknown {
  if (!bounded(value)) throw new Error("Invalid view configuration");
  const encoded = JSON.stringify(value);
  if (encoded.length > VIEW_CONFIGURATION_LIMITS.encodedCharacters) throw new Error("View configuration exceeds its bound");
  return JSON.parse(encoded) as unknown;
}

/** Fail at static registration if a schema cannot supply valid, bounded defaults. */
export function validateViewConfigurationSchema(schema: PlexViewConfigurationSchema): void {
  if (schema.version !== 1 || !record(schema.fields) || Object.keys(schema.fields).length > VIEW_CONFIGURATION_LIMITS.fields)
    throw new Error("Invalid view configuration schema");
  const defaults: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.fields)) {
    if (!viewConfigurationKey(key) || !field.validate(field.defaultValue)) throw new Error("Invalid view configuration default");
    defaults[key] = field.defaultValue;
  }
  json(defaults);
}

/** Resolve only a registered type's known fields. Absence inherits defaults without materializing a saved record. */
export function readViewConfiguration(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, stored: unknown): PlexViewConfiguration {
  const schema = definition.configuration;
  if (!schema) return {status: "available", values: {}};
  if (!record(stored) || Object.keys(stored).length > VIEW_CONFIGURATION_LIMITS.views) return {status: "unavailable", reason: "invalid"};
  const raw = Object.prototype.hasOwnProperty.call(stored, definition.id) ? stored[definition.id] : undefined;
  if (raw !== undefined && (!record(raw) || raw.version !== schema.version)) return {status: "unavailable", reason: "unsupported"};
  try {
    const payload = raw === undefined ? {} : json(raw);
    const values = record(payload) && "values" in payload ? payload.values : raw === undefined ? {} : null;
    if (!record(values) || Object.keys(values).length > VIEW_CONFIGURATION_LIMITS.fields) return {status: "unavailable", reason: "invalid"};
    const effective: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(schema.fields)) {
      const value = Object.prototype.hasOwnProperty.call(values, key) ? values[key] : field.defaultValue;
      if (!field.validate(value)) return {status: "unavailable", reason: "invalid"};
      effective[key] = value;
    }
    return {status: "available", values: json(effective) as Record<string, unknown>};
  } catch { return {status: "unavailable", reason: "invalid"}; }
}

/** Edit one supported field against the latest accepted map; preserve all other types and inert future fields. */
export function editViewConfiguration(definition: Readonly<{id: string; configuration?: PlexViewConfigurationSchema}>, stored: unknown, key: string, value: unknown): Record<string, unknown> {
  const schema = definition.configuration;
  if (!identifier.test(definition.id) || !schema || !viewConfigurationKey(key) || !Object.prototype.hasOwnProperty.call(schema.fields, key)
    || !schema.fields[key].validate(value) || readViewConfiguration(definition, stored).status !== "available" || !record(stored))
    throw new Error("View configuration is unavailable");
  if (!Object.prototype.hasOwnProperty.call(stored, definition.id) && Object.keys(stored).length >= VIEW_CONFIGURATION_LIMITS.views)
    throw new Error("View configuration exceeds its bound");
  const previous = Object.prototype.hasOwnProperty.call(stored, definition.id) ? stored[definition.id] : undefined;
  const payload = record(previous) ? previous : {version: schema.version, values: {}};
  const values = record(payload.values) ? payload.values : {};
  if (!Object.prototype.hasOwnProperty.call(values, key) && Object.keys(values).length >= VIEW_CONFIGURATION_LIMITS.fields)
    throw new Error("View configuration exceeds its bound");
  const next = json({...payload, values: {...values, [key]: json(value)}});
  return {...stored, [definition.id]: next};
}
