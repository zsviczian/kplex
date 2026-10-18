/**
 * Portable color identities and literal editing. This contract owns validation, copying and
 * equality, never CSS resolution, host mode, persistence or semantic relationship meaning.
 * Undefined inherits; transparent is an explicit color. Untouched literals retain their spelling.
 */
export type ThemeColor = Readonly<{ kind: "theme"; variable: string }>;
export type PaletteColor = Readonly<{ kind: "palette"; id: string }>;
export type ColorValue = string | ThemeColor | PaletteColor;
export type LiteralColor = Readonly<{ red: number; green: number; blue: number; alpha: number }>;
export const NODE_COLOR_FIELDS = ["backgroundColor", "textColor", "borderColor", "gateStrokeColor", "gateBackgroundColor"] as const;
export const LINK_COLOR_FIELDS = ["strokeColor", "textColor"] as const;

/** Restrict custom-property selection to one case-sensitive name, never a CSS expression. */
export function isThemeColorName(value: unknown): boolean {
  return typeof value === "string" && /^--[A-Za-z_][A-Za-z0-9_-]{0,100}$/.test(value);
}

/** Stable generated identities are independent of labels and safe as private CSS suffixes. */
export function isPaletteColorId(value: unknown): boolean {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
}

/** Parse bounded decimal CSS components without accepting expressions or non-finite values. */
function component(text: string, maximum: number): number | null {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(text)) return null;
  const value = Number(text.replace(/%$/, "")), limit = text.endsWith("%") ? 100 : maximum;
  return value >= 0 && value <= limit ? value / limit * maximum : null;
}

/** Accept editable hex/RGB(A) literals, preserving exact alpha separately from native RGB controls. */
export function parseLiteralColor(value: unknown): LiteralColor | null {
  if (typeof value !== "string" || value.length > 180) return null;
  const text = value.trim();
  if (text.toLowerCase() === "transparent") return { red: 0, green: 0, blue: 0, alpha: 0 };
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(text)) {
    let hex = text.slice(1);
    if (hex.length <= 4) hex = [...hex].map(char => char + char).join("");
    return { red: parseInt(hex.slice(0, 2), 16), green: parseInt(hex.slice(2, 4), 16),
      blue: parseInt(hex.slice(4, 6), 16), alpha: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1 };
  }
  const match = /^rgba?\(\s*([^()]*)\s*\)$/i.exec(text);
  if (!match) return null;
  const content = match[1].trim(), commas = content.includes(",");
  const parts = commas ? content.split(",").map(part => part.trim()) : content.split(/\s*\/\s*|\s+/);
  if (parts.length < 3 || parts.length > 4 || (commas && content.includes("/"))) return null;
  if (!commas && parts.length === 4 && !content.includes("/")) return null;
  const red = component(parts[0], 255), green = component(parts[1], 255), blue = component(parts[2], 255);
  const alpha = parts.length === 4 ? component(parts[3], 1) : 1;
  return red === null || green === null || blue === null || alpha === null ? null : { red, green, blue, alpha };
}

/** Copy saved intent without resolving it; opaque legacy literals and damaged names stay repairable. */
export function copyColorValue(value: unknown): ColorValue | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  if ("kind" in value && value.kind === "theme" && "variable" in value && typeof value.variable === "string" && value.variable.length <= 128)
    return { ...value, kind: "theme", variable: value.variable };
  if ("kind" in value && value.kind === "palette" && "id" in value && typeof value.id === "string" && value.id.length <= 128)
    return { ...value, kind: "palette", id: value.id };
  return undefined;
}

/** Validate newly created colors and lens imports without broadening the existing literal grammar to CSS expressions. */
export function sanitizeColorValue(value: unknown): ColorValue | undefined {
  return typeof value === "string" ? parseLiteralColor(value) ? value : undefined : copyColorValue(value);
}

/** Summarize saved source identity without substituting an unrelated RGB swatch for a reference. */
export function colorIdentityText(value: ColorValue | undefined, palette: readonly Readonly<{ id: string; name: string }>[] = []): string {
  if (typeof value === "string") return value;
  if (value?.kind === "theme") return value.variable;
  if (value?.kind === "palette") return palette.find(entry => entry.id === value.id)?.name ?? value.id;
  return "";
}

/** Compare color intent; two distinct references remain distinct even when their current paint matches. */
export function colorValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left === "string" && typeof right === "string") {
    const a = parseLiteralColor(left), b = parseLiteralColor(right);
    return !!a && !!b && a.red === b.red && a.green === b.green && a.blue === b.blue && a.alpha === b.alpha;
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || !("kind" in left) || !("kind" in right)) return false;
  if (left.kind === "theme" && right.kind === "theme")
    return ("variable" in left ? left.variable : undefined) === ("variable" in right ? right.variable : undefined);
  return left.kind === "palette" && right.kind === "palette"
    && ("id" in left ? left.id : undefined) === ("id" in right ? right.id : undefined);
}

/** Supply the public native ColorComponent's RGB input without encoding or changing opacity. */
export function literalRgbHex(color: LiteralColor): string {
  return "#" + [color.red, color.green, color.blue].map(value => Math.round(value).toString(16).padStart(2, "0")).join("");
}

/** Adapt an existing literal to an RGB-only legacy control without altering its stored identity. */
export function colorRgbInput(value: ColorValue | undefined, fallback = "#000000"): string {
  const parsed = parseLiteralColor(value);
  return parsed ? literalRgbHex(parsed) : fallback;
}

/** Serialize an explicit edit without quantizing non-byte alpha or fractional RGB components. */
export function formatLiteralColor(color: LiteralColor): string {
  const byteAlpha = Math.round(color.alpha * 255);
  if ([color.red, color.green, color.blue].every(Number.isInteger) && Math.abs(byteAlpha / 255 - color.alpha) < 1e-12)
    return literalRgbHex(color) + byteAlpha.toString(16).padStart(2, "0");
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`;
}

/** Change RGB only; opening/cancelling a native picker never calls this explicit editing operation. */
export function replaceLiteralRgb(previous: LiteralColor, rgb: string): string | null {
  const color = parseLiteralColor(rgb);
  return color ? formatLiteralColor({ ...color, alpha: previous.alpha }) : null;
}
