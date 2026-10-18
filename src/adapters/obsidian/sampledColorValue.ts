/**
 * Preview-only projection shared by usage cards and paired settings swatches. It consumes an
 * existing bounded CSS snapshot; it never reads CSS, persists RGB, or participates in live paint.
 */
import type {ColorValue} from "../../core/contracts/colorValue";
import {SEMANTIC_COLOR_DEFAULTS, semanticSlotForVariable, type ColorPreferencesV1, type SemanticColorPair, type SemanticColorSlot} from "../../core/plex/colorPreferences";
import type {AppearanceMode, ThemePreviewPair} from "./themePreview";

/** Resolve saved source identity for one preview mode, retaining semantic-cycle and missing-source fallbacks. */
export function sampledColorValue(value: ColorValue | undefined, mode: AppearanceMode, samples: ThemePreviewPair | null,
  preferences: ColorPreferencesV1, fallback: string, pairDraft?: SemanticColorPair, seen = new Set<SemanticColorSlot>()): string {
  const colors = samples?.[mode].colors ?? {};
  if (typeof value === "string") return value || fallback;
  if (!value || typeof value !== "object") return fallback;
  if (value.kind === "palette") return (pairDraft?.id === value.id ? pairDraft : preferences.palette.find(pair => pair.id === value.id))?.[mode] ?? fallback;
  if (value.kind !== "theme") return fallback;
  const slot = semanticSlotForVariable(value.variable);
  if (!slot) return colors[value.variable] || (samples ? samples[samples.activeMode].colors[value.variable] : undefined) || fallback;
  const inherited = colors[value.variable] || colors[SEMANTIC_COLOR_DEFAULTS[slot]] || fallback;
  if (seen.has(slot)) return inherited;
  return sampledColorValue(preferences.semantic[slot], mode, samples, preferences, inherited, pairDraft, new Set([...seen, slot]));
}
