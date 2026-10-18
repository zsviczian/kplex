/**
 * Explicit editor-only counterpart suggestion. Mirror HSL lightness about 0.5 while retaining
 * hue, saturation and exact alpha. No dependency, CSS sampling, automatic conversion or persistence.
 */
import {formatLiteralColor, parseLiteralColor} from "../contracts/colorValue";

/** Return a reversible lightness suggestion for an editable literal, or refuse opaque legacy input. */
export function recommendColorCounterpart(value: string): string | null {
  const color = parseLiteralColor(value); if (!color) return null;
  // HSL L = (max + min) / 2. Reflection leaves chroma unchanged, so all RGB channels
  // shift by the same offset; hue and saturation are retained without a color-space round trip.
  const offset = 255 - Math.max(color.red, color.green, color.blue) - Math.min(color.red, color.green, color.blue);
  return formatLiteralColor({...color, red: color.red + offset, green: color.green + offset, blue: color.blue + offset});
}
