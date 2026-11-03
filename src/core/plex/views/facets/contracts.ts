/** Plain Facets preset values. Stable category IDs survive rename/reorder; classification rules
 * and explicit assignment values are separate. No setting, note or native effect is owned here. */
import type {ColorValue} from "../../../contracts/colorValue";
export type FacetSource = "property" | "type" | "tag" | "rules";
export type FacetLayout = "circular" | "concentric" | "vertical" | "horizontal" | "quadrants";
export type FacetFocusAnchor = "top" | "bottom" | "left" | "right";
export type FacetAreaSize = Readonly<{width?: number; height?: number}>;
export type FacetFlowStyle = Readonly<{direction?: "forward" | "backward" | "both"; style?: "arrow" | "line" | "none";
  caption?: string; captionPosition?: "start" | "middle" | "end"}>;
export type FacetFlowOverride = Readonly<{source: string; target: string} & FacetFlowStyle>;
export type FacetDiagnosticStatus = "unassigned" | "conflicting" | "checking" | "unresolved";
export type FacetDiagnostics = Readonly<{combined?: boolean; side?: "top" | "right" | "bottom" | "left";
  orientation?: "horizontal" | "vertical"; showEmpty?: boolean; order?: readonly FacetDiagnosticStatus[]}>;
/** Canvas-local preset selection and diagnostics. Legacy layout choices are retained only for
 * restoration compatibility; the preset's saved layout is authoritative in every canvas. */
export type FacetCanvasState = Readonly<{version: 1; preset: string; combinedDiagnostics?: Readonly<Record<string, boolean>>;
  layouts?: Readonly<Record<string, FacetLayout>>}>;
export type FacetCategory = Readonly<{label: string; labelKey?: string; color: ColorValue;
  values: readonly string[]; assignment?: string; rule?: string}>;
export type FacetPreset = Readonly<{version: 1; name: string; nameKey?: string; source: FacetSource; field: string;
  categories: Readonly<Record<string, FacetCategory>>; order: readonly string[]; start: string;
  spacing: number; regionWidth: number; regionHeight: number; guides: boolean; tints: boolean;
  /** Optional model reading; ordered phase identities remain separate from geometry/order. */
  interpretation?: "wuxing"; relativeLabels?: boolean; regulatingGuides?: boolean;
  diagnostics?: FacetDiagnostics;
  layout?: FacetLayout; focusAnchor?: FacetFocusAnchor; reverse?: boolean;
  /** Per-preset presentation only. Absence preserves the historical central focus and gates. */
  focusInCategory?: boolean; centerAnchoredLinks?: boolean;
  /** Stable defaults are separate from the existing per-canvas area dimension maps. */
  areaSizes?: Readonly<{categories?: Readonly<Record<string, FacetAreaSize>>; diagnostics?: Readonly<Record<string, FacetAreaSize>>}>;
  flow?: FacetFlowStyle; flowOverrides?: readonly FacetFlowOverride[];
  /** Literal user-authored source overrides localized defaults and travels with portable data. */
  helpMarkdown?: string; helpSourceLocale?: string;
  conflictingColor: ColorValue; unassignedColor: ColorValue}>;
/** Explicit deletion replacements also cover closed/restored canvases without editing their
 * opaque saved intent. They never reclassify or rewrite a note. Unknown future entries stay inert. */
export type FacetPresetReplacement = Readonly<{version: 1; replacement: string}>;
export type FacetPresetLibrary = Readonly<{presets: Readonly<Record<string, unknown>>; order: readonly string[]}>;
export type FacetPresetSelection = Readonly<{requestedId: string; id: string; preset: FacetPreset;
  status: "ready" | "replaced" | "missing" | "future"}>;
export type FacetMembership = Readonly<{status: "assigned"; category: string}
  | {status: "conflicting"; categories: readonly string[]}
  | {status: "unassigned" | "checking"}
  | {status: "unresolved"; reason: "unsupported" | "metadata" | "rule" | "relationship" | "preset"}>;
