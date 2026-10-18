/**
 * Portable sRGB compositing and contrast for editor previews. Callers supply browser-resolved color
 * samples; results inform a local draft, never rewrite its source or claim universal theme compliance.
 * Non-opaque final backgrounds have no unique contrast ratio and remain explicitly unavailable.
 */
import type { LiteralColor } from "../contracts/colorValue";

/** Composite one color over the preceding surface, retaining explicit transparent zero. */
export function compositeColor(foreground: LiteralColor, background: LiteralColor): LiteralColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  /** Each straight-alpha channel is premultiplied only for this composition operation. */
  const channel = (front: number, back: number): number => (front * foreground.alpha + back * background.alpha * (1 - foreground.alpha)) / alpha;
  return { red: channel(foreground.red, background.red), green: channel(foreground.green, background.green), blue: channel(foreground.blue, background.blue), alpha };
}

/** Convert one bounded encoded sRGB channel to linear light for relative luminance. */
function linearChannel(channel: number): number {
  const value = Math.max(0, Math.min(1, channel / 255));
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Measure displayed foreground pixels over an opaque composited surface, never an invented black/white backdrop. */
export function colorContrastRatio(foreground: LiteralColor, background: LiteralColor): number | null {
  if (background.alpha < 1 || ![foreground.red, foreground.green, foreground.blue, foreground.alpha,
    background.red, background.green, background.blue, background.alpha].every(Number.isFinite)) return null;
  const displayed = compositeColor(foreground, background);
  /** Use WCAG's relative-luminance coefficients after actual alpha compositing. */
  const luminance = (color: LiteralColor): number => .2126 * linearChannel(color.red) + .7152 * linearChannel(color.green) + .0722 * linearChannel(color.blue);
  const a = luminance(displayed), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
