/** Shared measured card, typography, and gate geometry for the desktop and browser canvas. */
import {nodePropertyFontSize, type NodePropertyLine} from "./nodeProperties";

type NodeTypography = Readonly<{baseFontSize?: number; wrapNodeLabels: boolean; propertyFontSize: number}>;
type CardSize = {width: number; height: number};

/** Bound dimensions to the existing supported presentation interval. */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
/** Keep the gate visually subordinate while preserving the legacy style radius. */
export function gateDiameter(style: Readonly<{gateRadius?: number}>): number {
  // Keep a generous hit target in CSS, but visually the gate should remain subordinate to
  // the thought itself. gateRadius is retained as the legacy-compatible source setting.
  return Math.max(5, (style.gateRadius ?? 5) * 1.05);
}

/** Apply the configured character budget independently of horizontal/vertical density. Explicit imported styles retain larger limits. */
export function effectiveLabelLimit(configured = 30, center = false): number {
  const base = Math.round(Math.max(8, configured));
  return Math.max(center ? 18 : 8, base + (center ? 8 : 0));
}

/** Preserve historical role/style proportions while applying the user's base label size in pixels. */
export function nodeLabelFontSize(fontSize: number, center: boolean, baseFontSize = 12.4): number {
  const historical = center ? clamp(fontSize * 0.72, 13, 24) : clamp(fontSize * 0.62, 10, 16);
  return historical * clamp(Number.isFinite(baseFontSize) ? baseFontSize : 12.4, 8, 28) / 12.4;
}

/** Consume actual owning-document metrics in every canvas. The explicit estimate is only for
 * offline callers or the first render before a connected document has supplied font context. */
export function nodePropertyLineWidth(row: NodePropertyLine, fontSize: number): number {
  if (row.measurement && Number.isFinite(row.measurement.width) && row.measurement.width >= 0) return row.measurement.width;
  /** Wide ideographs and emoji occupy approximately an em; Latin uses the existing text advance. */
  const textWidth = (text: string): number => Array.from(text).reduce(/** Avoid counting emoji surrogate halves as two independent glyphs. */ (sum, glyph) => sum + (glyph.codePointAt(0)! > 0x2e7f ? 1 : .55) * fontSize, 0);
  return textWidth(row.text) + (row.label ? textWidth(`${row.label}:`) + 4 : 0) + (row.icon ? fontSize + 4 : 0);
}

/** Shared property block height includes each actual CSS line box; offline lines keep the prior estimate. */
export function nodePropertyLinesHeight(lines: readonly NodePropertyLine[], fontSize: number): number {
  return lines.length ? 4 + lines.reduce(/** Count mixed actual/fallback rows without shrinking a measured line box. */ (total, line) => total + Math.ceil(line.measurement && Number.isFinite(line.measurement.height) && line.measurement.height > 0 ? line.measurement.height : fontSize * 1.4), 0) : 0;
}

/** Reserve the same measured content width for sibling scaling without exceeding the caller's cap. */
export function nodePropertyLinesWidth(lines: readonly NodePropertyLine[], fontSize: number): number {
  return lines.reduce(/** All three view owners position from the widest already measured detail line. */ (maximum, row) => Math.max(maximum, 32 + nodePropertyLineWidth(row, fontSize)), 0);
}

/** Measure a fixed-padding pill from the bounded label; center estimates use its larger rendered font, independently of density. */
export function nodeSize(
  label: string,
  fontSize: number,
  settings: NodeTypography,
  center = false,
  configuredMax = 30,
  configuredMaxWidth?: number,
  strokeWidth = 1,
  details: readonly NodePropertyLine[] = [],
): CardSize {
  const fontScale = (settings.baseFontSize ?? 12.4) / 12.4;
  const visibleLength = Math.min(label.length, effectiveLabelLimit(configuredMax, center));
  const minWidth = center ? 180 : 112;
  const defaultMaxWidth = center ? 370 : 286;
  const maxWidth = Math.max(minWidth, configuredMaxWidth ?? defaultMaxWidth);
  // Regular pills keep their established geometry. The center uses a larger, heavier rendered
  // font, so the regular raw-style coefficient underestimates even short labels and CSS clips
  // text before either configured limit is reached. Estimate its advance from that actual font.
  const characterWidth = center ? nodeLabelFontSize(fontSize, true, settings.baseFontSize) * 0.55 : fontSize * fontScale * 0.29;
  const width = clamp(70 + visibleLength * Math.max(4.8, characterWidth), minWidth, maxWidth);

  // Both modes reserve the font's ink padding as well as the node's own padding and border.
  const verticalInsets = (center ? 16 : 8) + 2 * Math.max(0, strokeWidth);
  const renderedFont = nodeLabelFontSize(fontSize, center, settings.baseFontSize);
  // Match the text span's 1.2em lines plus 0.2em ink padding at each edge, including wrapped text.
  const singleLineHeight = Math.max(center ? 48 : 26, Math.ceil(renderedFont * 1.6 + verticalInsets));
  const twoLineHeight = Math.ceil(Math.max(fontSize * fontScale, renderedFont) * 2.4 + renderedFont * 0.4 + verticalInsets);
  const baseHeight = settings.wrapNodeLabels ? Math.max(singleLineHeight, twoLineHeight) : singleLineHeight;
  const propertyFont = nodePropertyFontSize(settings.propertyFontSize);
  const detailWidth = nodePropertyLinesWidth(details, propertyFont);
  return {width: details.length ? clamp(Math.max(width, detailWidth), minWidth, maxWidth) : width,
    height: baseHeight + nodePropertyLinesHeight(details, propertyFont)};
}

/** Scale a sibling card while keeping its measured detail width and rendered font visible. */
export function siblingNodeSize(base: CardSize, scale: number, fontSize: number, settings: NodeTypography,
  strokeWidth = 1, details: readonly NodePropertyLine[] = []): CardSize {
  if (scale === 1) return base;
  const propertyFont = nodePropertyFontSize(settings.propertyFontSize);
  const linesWidth = nodePropertyLinesWidth(details, propertyFont);
  const labelHeight = nodeLabelFontSize(fontSize, false, settings.baseFontSize) * (settings.wrapNodeLabels ? 2.8 : 1.6);
  return {width: Math.max(base.width * scale, Math.min(base.width, linesWidth)),
    height: Math.max(base.height * scale, Math.ceil(labelHeight + 8 + 2 * Math.max(0, strokeWidth)) + nodePropertyLinesHeight(details, propertyFont))};
}
