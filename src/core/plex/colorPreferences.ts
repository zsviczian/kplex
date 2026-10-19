/**
 * Portable, versioned color preferences. Palette pairs contain literals only; semantic slots may
 * refer to theme/palette identities. The settings queue owns all writes. Future or malformed
 * containers retain their original payload for read-only persistence, never a lossy conversion.
 */
import { sanitizeColorValue, isPaletteColorId, parseLiteralColor, type ColorValue } from "../contracts/colorValue";

export const SEMANTIC_COLOR_SLOTS = ["origin", "development", "support", "challenge"] as const;
export type SemanticColorSlot = typeof SEMANTIC_COLOR_SLOTS[number];
export const COMPASS_DIRECTIONS = ["north", "east", "south", "west"] as const;
/** Slightly stronger native Light cue; explicit percentages and theme CSS retain precedence. */
const NATIVE_COMPASS_INTENSITY = {light: 0.07, dark: 0.07} as const;
export type CompassDirection = typeof COMPASS_DIRECTIONS[number];
export type SemanticColorPair = { id: string; name: string; light: string; dark: string };
export type ColorPreferencesV1 = {
  version: 1;
  palette: SemanticColorPair[];
  semantic: Partial<Record<SemanticColorSlot, ColorValue>>;
  compass: {
    enabled: boolean;
    /** Undefined inherits theme opacity then the native mode percentage; zero suppresses tint. */
    intensity?: number;
    fills: Partial<Record<CompassDirection, ColorValue>>;
  };
};
export const SEMANTIC_COLOR_DEFAULTS: Readonly<Record<SemanticColorSlot, string>> = {
  origin: "--color-purple", development: "--color-green", support: "--color-cyan", challenge: "--color-orange",
};
export const COMPASS_SEMANTIC_SLOTS: Readonly<Record<CompassDirection, SemanticColorSlot>> = {
  north: "origin", east: "challenge", south: "development", west: "support",
};

/** Return a detached, off-by-default preference container; no palette must exist for native styling. */
export function defaultColorPreferences(): ColorPreferencesV1 {
  return { version: 1, palette: [], semantic: {}, compass: { enabled: false, fills: {} } };
}

/** Accept plain persisted records without treating arrays as field containers. */
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Preserve inherited and explicit-zero percentages separately; clamp only known finite inputs. */
function intensity(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(15, value)) : undefined;
}

/**
 * Load the known format without rewriting unknown schemas or unrepresentable palette entries.
 * Invalid/missing reference targets remain editable identities; the DOM owner supplies fallback.
 */
export function migrateColorPreferences(raw: unknown): { preferences: ColorPreferencesV1; future?: unknown } {
  const fallback = defaultColorPreferences();
  if (raw === undefined) return { preferences: fallback };
  /** Keep unsupported data verbatim while supplying a conservative read-only effective view. */
  const unsupported = (): { preferences: ColorPreferencesV1; future: unknown } => ({ preferences: fallback, future: raw });
  if (!record(raw) || raw.version !== 1 || !Array.isArray(raw.palette) || raw.palette.length > 5000
    || !record(raw.semantic) || !record(raw.compass) || !record(raw.compass.fills)) return unsupported();
  const ids = new Set<string>(), palette: SemanticColorPair[] = [];
  for (const entry of raw.palette) {
    if (!record(entry) || typeof entry.id !== "string" || !isPaletteColorId(entry.id) || ids.has(entry.id)
      || typeof entry.name !== "string" || !entry.name.trim() || entry.name.length > 100
      || typeof entry.light !== "string" || !parseLiteralColor(entry.light)
      || typeof entry.dark !== "string" || !parseLiteralColor(entry.dark)) return unsupported();
    ids.add(entry.id); palette.push({ ...entry, id: entry.id, name: entry.name, light: entry.light, dark: entry.dark });
  }
  const semantic: ColorPreferencesV1["semantic"] = {}, fills: ColorPreferencesV1["compass"]["fills"] = {};
  for (const slot of SEMANTIC_COLOR_SLOTS) {
    const value = sanitizeColorValue(raw.semantic[slot]);
    if (raw.semantic[slot] !== undefined && value === undefined) return unsupported();
    if (value !== undefined) semantic[slot] = value;
  }
  for (const direction of COMPASS_DIRECTIONS) {
    const value = sanitizeColorValue(raw.compass.fills[direction]);
    if (raw.compass.fills[direction] !== undefined && value === undefined) return unsupported();
    if (value !== undefined) fills[direction] = value;
  }
  const { intensity: rawIntensity, ...compass } = raw.compass;
  const percentage = intensity(rawIntensity);
  return { preferences: { ...raw, version: 1, palette, semantic: { ...raw.semantic, ...semantic },
    compass: { ...compass, enabled: raw.compass.enabled === true, fills: { ...raw.compass.fills, ...fills },
      ...(percentage === undefined ? {} : { intensity: percentage }) } } };
}

/** Return the explicit/default semantic identity without assigning semantic hues to ordinary nodes. */
export function semanticColorValue(preferences: ColorPreferencesV1, slot: SemanticColorSlot): ColorValue {
  return preferences.semantic[slot] ?? { kind: "theme", variable: SEMANTIC_COLOR_DEFAULTS[slot] };
}

/** Identify public semantic tokens without interpreting arbitrary variables or user-authored CSS. */
export function semanticSlotForVariable(variable: string): SemanticColorSlot | undefined {
  return SEMANTIC_COLOR_SLOTS.find(slot => variable === `--kplex-semantic-${slot}`);
}

/** Find direct/indirect semantic self-reference in this finite four-slot dependency graph. */
export function cyclicSemanticColorSlots(preferences: ColorPreferencesV1): SemanticColorSlot[] {
  return SEMANTIC_COLOR_SLOTS.filter(start => {
    const seen = new Set<SemanticColorSlot>();
    let slot: SemanticColorSlot | undefined = start;
    while (slot !== undefined) {
      if (seen.has(slot)) return true;
      seen.add(slot);
      const value: ColorValue = semanticColorValue(preferences, slot);
      slot = typeof value !== "string" && value.kind === "theme" ? semanticSlotForVariable(value.variable) : undefined;
    }
    return false;
  });
}

export const COMPASS_COLOR_VARIABLES: Readonly<Record<CompassDirection, string>> = {
  north: "--kplex-compass-parent-color", east: "--kplex-compass-challenger-color",
  south: "--kplex-compass-child-color", west: "--kplex-compass-friend-color",
};

/** Parse the one public numeric/percentage opacity token; invalid CSS units inherit native defaults. */
export function compassCssIntensity(raw: string): number | undefined {
  const token = raw.trim(); if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(token)) return undefined;
  const value = Number(token.endsWith("%") ? token.slice(0, -1) : token);
  return Number.isFinite(value) ? Math.max(0, Math.min(0.15, token.endsWith("%") ? value / 100 : value)) : undefined;
}

/** Resolve explicit percentage, finite CSS opacity, then the native mode default; retain explicit zero. */
export function compassIntensity(preferences: ColorPreferencesV1, mode: "light" | "dark", cssOpacity?: string): number {
  return preferences.compass.intensity === undefined ? compassCssIntensity(cssOpacity ?? "") ?? NATIVE_COMPASS_INTENSITY[mode] : preferences.compass.intensity / 100;
}
