/**
 * Portable sparse device typography preferences. Shared defaults remain separate, explicit values
 * (including false and values equal to defaults) stay pinned, and resets remove only supported
 * overrides. Unknown future persisted values are retained inertly; this owner has no host effects.
 */
import type { PersistedLayoutDeviceClass } from "./viewPresentation";

export type TypographyValues = Readonly<{ baseFontSize: number; maxLabelLength: number; maxWidth: number; wrapNodeLabels: boolean }>;
export type TypographyField = keyof TypographyValues;
export type TypographyOverride = Partial<TypographyValues> & Readonly<Record<string, unknown>>;
export type TypographyProfiles = Partial<Record<PersistedLayoutDeviceClass, TypographyOverride>> & Readonly<Record<string, unknown>>;
export const TYPOGRAPHY_FIELDS = ["baseFontSize", "maxLabelLength", "maxWidth", "wrapNodeLabels"] as const;
export const TYPOGRAPHY_LIMITS = {
  baseFontSize: { min: 8, max: 28, step: 0.2 },
  maxLabelLength: { min: 8, max: 120, step: 1 },
  maxWidth: { min: 160, max: 800, step: 10 },
} as const;

/** Accept only object-shaped persisted maps; arrays and null are not profile records. */
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }

/** Validate one known scalar without coercing invalid input into a materialized fallback override. */
export function sanitizeTypographyValue(field: TypographyField, value: unknown): number | boolean | undefined {
  if (field === "wrapNodeLabels") return typeof value === "boolean" ? value : undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const limits = TYPOGRAPHY_LIMITS[field];
  const bounded = Math.max(limits.min, Math.min(limits.max, value));
  return field === "baseFontSize" ? bounded : Math.round(bounded);
}

/** Preserve unknown fields inertly while dropping invalid known values and retaining sparse absence. */
export function sanitizeTypographyProfiles(input: unknown): TypographyProfiles {
  if (!record(input)) return {};
  const profiles: Record<string, unknown> = { ...input };
  for (const device of ["desktop", "tablet", "mobile"] as const) {
    if (!record(input[device])) { delete profiles[device]; continue; }
    const override: Record<string, unknown> = { ...input[device] };
    for (const field of TYPOGRAPHY_FIELDS) {
      const value = sanitizeTypographyValue(field, override[field]);
      if (value === undefined) delete override[field]; else override[field] = value;
    }
    if (Object.keys(override).length) profiles[device] = override; else delete profiles[device];
  }
  return profiles;
}

/** Overlay validated supported fields only; unknown future values never become rendering styles. */
export function effectiveTypography(shared: TypographyValues, override?: TypographyOverride): TypographyValues {
  const values = { ...shared };
  for (const field of TYPOGRAPHY_FIELDS) {
    const value = sanitizeTypographyValue(field, override?.[field]);
    if (value !== undefined) Object.assign(values, { [field]: value });
  }
  return values;
}

/** Merge changed scalar fields into the latest device record, never a stale whole style snapshot. */
export function mergeTypographyOverride(profiles: TypographyProfiles, device: PersistedLayoutDeviceClass, patch: Partial<TypographyValues>): TypographyProfiles {
  const override = { ...profiles[device] };
  let changed = false;
  for (const field of TYPOGRAPHY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) continue;
    const value = sanitizeTypographyValue(field, patch[field]);
    if (value !== undefined) { Object.assign(override, { [field]: value }); changed = true; }
  }
  return changed ? { ...profiles, [device]: override } : profiles;
}

/** Delete one/all supported overrides while preserving other devices and inert future preferences. */
export function resetTypographyOverride(profiles: TypographyProfiles, device: PersistedLayoutDeviceClass, field?: TypographyField): TypographyProfiles {
  const override = { ...profiles[device] };
  for (const key of field ? [field] : TYPOGRAPHY_FIELDS) delete override[key];
  const next = { ...profiles };
  if (Object.keys(override).length) next[device] = override; else delete next[device];
  return next;
}
