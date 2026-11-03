/** Bounded preset admission atop the shared configuration JSON/color owners. Unknown future
 * presets remain inert values; malformed current presets are never silently repaired/truncated. */
import {sanitizeColorValue, isThemeColorName, isPaletteColorId} from "../../../contracts/colorValue";
import {configurationRecord as record, viewConfigurationEntryKey} from "../configurationValues";
import type {FacetPreset, FacetPresetReplacement} from "./contracts";
import {FACET_TEMPLATES} from "./templates";
import {isFacetDiagnosticStatus, isFacetLayout} from "./presentation";
import {validFacetFlow, facetFlowId} from "./flow";
import {validMarkdownHelp} from "../../../contracts/markdownHelp";
export const FACET_LIMITS = {presets: 16, entries: 32, categories: 7, aliases: 512, label: 80, expression: 2048} as const;

/** Stable keys do not depend on translated labels or mutable note fields. */
export function facetId(value: unknown): value is string {return typeof value === "string" && value.length <= 48 && viewConfigurationEntryKey(value);}
/** Finite plain copy; bounds are also enforced by the enclosing shared JSON owner. */
function text(value: unknown, maximum: number, empty = true): value is string {
  return typeof value === "string" && value.length <= maximum && (empty || value.trim().length > 0);
}
/** Use the existing literal/theme/palette grammar, never arbitrary CSS or another color parser. */
function color(value: unknown): boolean {
  const parsed = sanitizeColorValue(value);
  if (parsed === undefined) return false;
  if (typeof parsed === "string") return true;
  return parsed.kind === "theme" ? isThemeColorName(parsed.variable) : isPaletteColorId(parsed.id);
}
/** An explicit replacement must name another stable entry; resolution detects cycles separately. */
export function isFacetReplacement(value: unknown): value is FacetPresetReplacement {
  return record(value) && value.version === 1 && facetId(value.replacement);
}
/** Known presets contain exactly three through seven ordered categories. */
export function isFacetPreset(value: unknown): value is FacetPreset {
  if (!record(value) || value.version !== 1 || !text(value.name, 100) || value.nameKey !== undefined && !text(value.nameKey, 128, false)
    || !["property", "type", "tag", "rules"].includes(String(value.source)) || !text(value.field, 128, false)
    || !record(value.categories) || !Array.isArray(value.order) || value.order.length < 3 || value.order.length > FACET_LIMITS.categories
    || !value.order.every(facetId) || new Set(value.order).size !== value.order.length || Object.keys(value.categories).length !== value.order.length
    || !facetId(value.start) || !value.order.includes(value.start) || typeof value.guides !== "boolean" || typeof value.tints !== "boolean"
    || !color(value.conflictingColor) || !color(value.unassignedColor)) return false;
  if (value.interpretation !== undefined && value.interpretation !== "wuxing"
    || value.relativeLabels !== undefined && typeof value.relativeLabels !== "boolean"
    || value.regulatingGuides !== undefined && typeof value.regulatingGuides !== "boolean") return false;
  if (value.layout !== undefined && !isFacetLayout(value.layout)
    || value.focusAnchor !== undefined && (typeof value.focusAnchor !== "string" || !["top", "bottom", "left", "right"].includes(value.focusAnchor))
    || value.reverse !== undefined && typeof value.reverse !== "boolean") return false;
  if (value.focusInCategory !== undefined && typeof value.focusInCategory !== "boolean"
    || value.centerAnchoredLinks !== undefined && typeof value.centerAnchoredLinks !== "boolean") return false;
  if (value.helpMarkdown !== undefined && !validMarkdownHelp(value.helpMarkdown)
    || value.helpSourceLocale !== undefined && (typeof value.helpSourceLocale !== "string" || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(value.helpSourceLocale))) return false;
  if (value.flow !== undefined && !validFacetFlow(value.flow)) return false;
  if (value.flowOverrides !== undefined) {
    if (!Array.isArray(value.flowOverrides) || value.flowOverrides.length > 21) return false;
    const pairs = new Set<string>();
    for (const flow of value.flowOverrides) {
      if (!record(flow) || !facetId(flow.source) || !facetId(flow.target) || flow.source === flow.target || !value.order.includes(flow.source)
        || !value.order.includes(flow.target)) return false;
      const id = facetFlowId(flow.source, flow.target);if (!validFacetFlow(flow) || pairs.has(id)) return false;pairs.add(id);
    }
  }
  if (value.areaSizes !== undefined) {
    if (!record(value.areaSizes) || Object.keys(value.areaSizes).some(/** Unknown dimension groups cannot create unbounded identities. */ key => key !== "categories" && key !== "diagnostics")) return false;
    for (const group of ["categories", "diagnostics"] as const) {
      const sizes = value.areaSizes[group];if (sizes === undefined) continue;
      if (!record(sizes) || Object.keys(sizes).length > 7) return false;
      for (const [id, size] of Object.entries(sizes)) {
        if (!(group === "categories" ? value.order.includes(id) : id === "combined" || isFacetDiagnosticStatus(id)) || !record(size)
          || Object.keys(size).some(/** Size defaults contain only the two independently editable dimensions. */ key => key !== "width" && key !== "height")) return false;
        for (const field of ["width", "height"] as const) if (size[field] !== undefined && (typeof size[field] !== "number" || !Number.isFinite(size[field])
          || size[field] < (field === "width" ? 200 : 160) || size[field] > (field === "width" ? 2400 : 1200))) return false;
      }
    }
  }
  if (value.diagnostics !== undefined) {
    const dock = value.diagnostics;
    if (!record(dock) || dock.combined !== undefined && typeof dock.combined !== "boolean"
      || dock.showEmpty !== undefined && typeof dock.showEmpty !== "boolean"
      || dock.side !== undefined && (typeof dock.side !== "string" || !["top", "right", "bottom", "left"].includes(dock.side))
      || dock.orientation !== undefined && dock.orientation !== "horizontal" && dock.orientation !== "vertical"
      || dock.order !== undefined && (!Array.isArray(dock.order) || dock.order.length !== 4 || new Set(dock.order).size !== 4
        || !dock.order.every(isFacetDiagnosticStatus))) return false;
  }
  for (const [field, minimum, maximum] of [["spacing", 24, 200], ["regionWidth", 200, 640], ["regionHeight", 160, 600]] as const) {
    const scalar = value[field]; if (typeof scalar !== "number" || !Number.isFinite(scalar) || scalar < minimum || scalar > maximum) return false;
  }
  for (const [id, category] of Object.entries(value.categories)) {
    if (!facetId(id) || !value.order.includes(id) || !record(category) || !text(category.label, FACET_LIMITS.label)
      || category.labelKey !== undefined && !text(category.labelKey, 128, false) || !color(category.color)
      || !Array.isArray(category.values) || category.values.length > FACET_LIMITS.aliases || !category.values.every(item => text(item, 1024, false))
      || category.assignment !== undefined && !text(category.assignment, 1024, false)
      || category.rule !== undefined && !text(category.rule, FACET_LIMITS.expression)) return false;
  }
  return true;
}
/** Retain future entry schemas without executing or interpreting them as a current preset. */
export function validFacetLibrary(value: unknown): boolean {
  if (!record(value) || Object.keys(value).length > FACET_LIMITS.entries) return false;
  if (!Object.keys(value).every(facetId)) return false;
  let known = 0;
  return Object.entries({...FACET_TEMPLATES, ...value}).every(([id, preset]) => facetId(id) && (isFacetPreset(preset) ? ++known <= FACET_LIMITS.presets
    : isFacetReplacement(preset) || record(preset) && typeof preset.version === "number" && Number.isInteger(preset.version) && preset.version > 1));
}
/** Ordering is separate from the keyed collection; stale/missing IDs remain inert, never discarded. */
export function validFacetOrder(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length <= FACET_LIMITS.entries && value.every(facetId) && new Set(value).size === value.length;
}
