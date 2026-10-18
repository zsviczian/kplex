/**
 * Obsidian CSS color projection after existing style precedence. Safe private names carry live
 * theme/palette choices; a missing or invalid identity uses the consumer's deterministic fallback.
 * This helper neither samples CSS nor touches DOM, saved settings, graph state or host mode.
 */
import { isPaletteColorId, isThemeColorName, type ColorValue } from "../../core/contracts/colorValue";
import { SEMANTIC_COLOR_DEFAULTS, type SemanticColorSlot } from "../../core/plex/colorPreferences";

/** Encode one validated name losslessly; unlike a short hash, distinct source identities cannot collide. */
export function themeColorProperty(variable: string): string {
  return "--_kplex-color-theme-" + [...variable].map(char => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}

/** Palette IDs are validated independently of editable labels before becoming a private property suffix. */
export function paletteColorProperty(id: string): string { return `--_kplex-color-palette-${id}`; }

/** An explicit semantic choice precedes the public default; unset choices leave native inheritance intact. */
export function semanticColorCss(slot: SemanticColorSlot): string {
  return `var(--_kplex-color-semantic-${slot}, var(${SEMANTIC_COLOR_DEFAULTS[slot]}, var(--text-normal)))`;
}

/** Project supported source intent without flattening references to today's RGB values. */
export function colorValueCss(color: ColorValue | undefined, fallback = "transparent"): string {
  if (color === undefined || color === null) return fallback;
  if (typeof color === "string") {
    if (!color) return fallback;
    if (/^#[0-9a-fA-F]{8}$/.test(color)) {
      const red = parseInt(color.slice(1, 3), 16), green = parseInt(color.slice(3, 5), 16), blue = parseInt(color.slice(5, 7), 16);
      return `rgba(${red}, ${green}, ${blue}, ${parseInt(color.slice(7, 9), 16) / 255})`;
    }
    return color;
  }
  if (color.kind === "theme" && typeof color.variable === "string" && isThemeColorName(color.variable))
    return `var(${themeColorProperty(color.variable)}, ${fallback})`;
  if (color.kind === "palette" && typeof color.id === "string" && isPaletteColorId(color.id))
    return `var(${paletteColorProperty(color.id)}, ${fallback})`;
  return fallback;
}
