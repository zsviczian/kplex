/** Canonical GUI/future-CLI package admission. Compose existing Facets, predicate and color owners; never repair invalid imported data. */
import {configurationRecord as record} from "../views/configurationValues";
import {isFacetPreset, facetId} from "../views/facets/validation";
import {compileFacetRules} from "../views/facets/rules";
import {validateGraphLensExpression} from "../lensValidation";
import {compileGraphPredicate} from "../predicate";
import {tryParseGraphPredicateExpression} from "../predicateParser";
import {parseLiteralColor, isThemeColorName, isPaletteColorId, sanitizeColorValue} from "../../contracts/colorValue";
import {PORTABLE_PACKAGE_LIMITS as limits, type PackageValidation, type PortablePackage, type SharedLens} from "./contracts";

const PRESET_FIELDS = "version name source field categories order start spacing regionWidth regionHeight guides tints interpretation relativeLabels regulatingGuides diagnostics layout focusAnchor focusInCategory centerAnchoredLinks reverse areaSizes flow flowOverrides helpMarkdown helpSourceLocale conflictingColor unassignedColor".split(" ");
const FLOW_FIELDS = ["direction", "style", "caption", "captionPosition"];
/** Imported records may only contain their version's explicit fields. */
function fields(value: Record<string, unknown>, keys: readonly string[]): boolean {return Object.keys(value).every(key => keys.includes(key));}
/** String limits reject control characters without altering literal source spelling. */
function text(value: unknown, max: number, blank = false): value is string {
  if (typeof value !== "string" || value.length > max || !blank && !value.trim()) return false;
  for (const character of value) {const code = character.charCodeAt(0);if (code < 32 && character !== "\n" && character !== "\r" && character !== "\t" || code === 127) return false;}
  return true;
}
/** Reject cycles, inherited executable objects, prototype keys and non-JSON values before copying. */
function bounded(value: unknown, depth = 0, budget = {nodes: limits.nodes as number}): boolean {
  if (depth > limits.depth || --budget.nodes < 0) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return text(value, limits.characters, true);
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value) && Object.getPrototypeOf(value) !== Array.prototype) return false;
  if (!Array.isArray(value) && (!record(value) || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return false;
  if (Object.getOwnPropertySymbols(value).length) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value), keys = Object.keys(descriptors).filter(key => !Array.isArray(value) || key !== "length");
  if (Array.isArray(value) && (keys.length !== value.length || keys.some((key, index) => key !== String(index)))) return false;
  return keys.every(/** Reject accessors/non-enumerable hooks before reading data or calling JSON.stringify. */ key => {
    const descriptor = descriptors[key];return descriptor.enumerable && "value" in descriptor && !["__proto__", "constructor", "prototype"].includes(key)
      && bounded(descriptor.value, depth + 1, budget);
  });
}
/** A strict reference/literal uses the existing color grammar, without its permissive sanitation of extra fields. */
function color(value: unknown): boolean {
  if (typeof value === "string") return parseLiteralColor(value) !== null;
  return record(value) && (value.kind === "theme" ? fields(value, ["kind", "variable"]) && isThemeColorName(value.variable)
    : value.kind === "palette" && fields(value, ["kind", "id"]) && isPaletteColorId(value.id));
}
/** Scope-correct style keys remain the shared lens subset; invalid widths are refused, never clamped. */
function lensStyle(value: unknown, scope: string): boolean {
  if (!record(value) || !fields(value, scope === "node" ? ["node"] : ["edge"])) return false;
  for (const [target, style] of Object.entries(value)) {
    if (!record(style) || !fields(style, target === "node" ? ["backgroundColor", "textColor", "borderColor", "fillStyle", "strokeWidth", "strokeStyle"]
      : ["strokeColor", "textColor", "strokeWidth", "strokeStyle", "showLabel"])) return false;
    for (const [key, item] of Object.entries(style)) {
      if (key.endsWith("Color") ? !color(item) : key === "strokeWidth" ? typeof item !== "number" || !Number.isFinite(item) || item < .5 || item > 8
        : key === "strokeStyle" ? !["solid", "dashed", "dotted"].includes(String(item))
        : key === "fillStyle" ? !["solid", "hachure", "cross-hatch"].includes(String(item)) : typeof item !== "boolean") return false;
    }
  }
  return true;
}
/** One lens validator is shared by standalone packages and explicitly selected Facets dependencies. */
export function validSharedLens(value: unknown): value is SharedLens {
  return record(value) && fields(value, ["id", "name", "scope", "mode", "expression", "style"]) && facetId(value.id) && text(value.name, 100, true)
    && ["node", "edge", "evidence"].includes(String(value.scope)) && ["include", "exclude", "style"].includes(String(value.mode))
    && text(value.expression, limits.expression) && !validateGraphLensExpression(value.expression) && supportedLensSelectors(value.expression)
    && (value.style === undefined || lensStyle(value.style, String(value.scope)));
}
/** Package admission refuses selectors the existing engine cannot evaluate; legacy editor behavior remains unchanged. */
function supportedLensSelectors(source: string): boolean {
  const parsed = tryParseGraphPredicateExpression(source);return !!parsed.expression && !compileGraphPredicate(parsed.expression).dependencies.unsupportedSelectors?.size;
}
/** Existing preset admission owns all limits; the portable layer additionally refuses unknown fields/translation keys. */
function strictPreset(value: unknown): boolean {
  if (!isFacetPreset(value) || !fields(value, PRESET_FIELDS) || !text(value.name, 100) || typeof value.helpMarkdown !== "string") return false;
  if (!color(value.conflictingColor) || !color(value.unassignedColor)) return false;
  for (const category of Object.values(value.categories)) if (!fields(category, ["label", "color", "values", "assignment", "rule"]) || !text(category.label, 80) || !color(category.color)) return false;
  if (value.diagnostics && !fields(value.diagnostics, ["combined", "side", "orientation", "showEmpty", "order"])) return false;
  if (value.flow && !fields(value.flow, FLOW_FIELDS) || value.flowOverrides?.some(/** Each override adds only its two stable endpoints. */ flow => !fields(flow, [...FLOW_FIELDS, "source", "target"]))) return false;
  return value.source !== "rules" || compileFacetRules(value).status === "ready";
}
/** Enumerate palette references without resolving or sampling colors from a host/theme. */
export function packagePaletteReferences(value: unknown): readonly string[] {
  if (!bounded(value)) return [];
  const ids = new Set<string>();
  const visit = (item: unknown): void => {
    if (!item || typeof item !== "object") return;
    const parsed = sanitizeColorValue(item);if (typeof parsed === "object" && parsed.kind === "palette") ids.add(parsed.id);
    for (const child of Object.values(item)) visit(child);
  };
  visit(value);return [...ids].sort();
}
/** Flag authored selectors/values that can expose a vault path or private source record. Never redact and change semantics. */
export function packagePrivacy(value: unknown): readonly string[] {
  if (!bounded(value)) return [];
  const paths: string[] = [];
  const visit = (item: unknown, path: string): void => {
    if (typeof item === "string" && (/(?:\b(?:file|node|this|edge|evidence)\.(?:path|folder|name|sourcePath|targetPath|source|target)\b|\[\[[^\]]+\]\]|\b[A-Za-z]:[\\/]|(?:^|[\s"'])[~/][\w.-]+\/)/.test(item))) paths.push(path);
    else if (item && typeof item === "object") for (const [key, child] of Object.entries(item)) visit(child, `${path}.${key}`);
  };
  visit(value, "$ ".trim());return paths;
}
/** One entry point accepts raw JSON or programmatic data, preserving invalid/future source in the caller for diagnostics. */
export function validatePortablePackage(source: unknown): PackageValidation {
  const invalid = (code: "size" | "json" | "version" | "unknown-field" | "invalid" | "rule" | "color", path = "$"): PackageValidation => ({status: "invalid", issues: [{code, path}]});
  if (typeof source === "string") {
    if (source.length > limits.characters) return invalid("size");
    try {source = JSON.parse(source) as unknown;} catch {return invalid("json");}
  }
  if (!bounded(source)) return invalid("size");
  if (!record(source) || source.format !== "kplex-preset" || source.version !== 1) return invalid("version");
  if (!fields(source, source.kind === "facets" ? ["format", "version", "kind", "id", "preset", "lenses", "palette", "aiContext"]
    : ["format", "version", "kind", "id", "lens", "palette", "aiContext"])) return invalid("unknown-field");
  if (!facetId(source.id) || !text(source.aiContext, 16_000, true)) return invalid("invalid");
  if (source.kind === "facets") {
    if (!strictPreset(source.preset)) return invalid("invalid", "$.preset");
    if (source.lenses !== undefined && (!Array.isArray(source.lenses) || source.lenses.length > limits.lenses || !source.lenses.every(validSharedLens)
      || new Set(source.lenses.map(/** Lens identities cannot repeat within one package. */ lens => lens.id)).size !== source.lenses.length)) return invalid("rule", "$.lenses");
  } else if (source.kind !== "lens" || !validSharedLens(source.lens)) return invalid("rule", "$.lens");
  const references = packagePaletteReferences(source.kind === "facets" ? [source.preset, source.lenses ?? []] : source.lens);
  if (source.palette !== undefined) {
    if (!Array.isArray(source.palette) || source.palette.length > limits.palette) return invalid("color", "$.palette");
    const ids = new Set<string>();
    for (const pair of source.palette) {
      if (!record(pair) || !fields(pair, ["id", "name", "light", "dark"]) || typeof pair.id !== "string" || !isPaletteColorId(pair.id)
        || ids.has(pair.id) || !references.includes(pair.id) || !text(pair.name, 100) || !parseLiteralColor(pair.light) || !parseLiteralColor(pair.dark)) return invalid("color", "$.palette");
      ids.add(pair.id);
    }
  }
  const encoded = JSON.stringify(source);if (encoded.length > limits.characters) return invalid("size");
  return {status: "valid", value: JSON.parse(encoded) as PortablePackage, paletteReferences: references, privacy: packagePrivacy(source.kind === "facets" ? [source.preset, source.lenses ?? []] : source.lens)};
}
