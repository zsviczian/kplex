/**
 * Resolves K-Plex node/connector appearance without mutating graph semantics or saved settings.
 * Imported style dictionaries retain their original keys and alpha channels at this presentation seam.
 */
import {matchesStyleTag, tagStyleKey} from "../core/contracts/tagStyle";
import type { KplexSettings } from "../settings";
import type { GraphPage, LinkStyle, Neighbour, NodeStyle, PositionedNode, Role } from "../types";
import { RelationType } from "../types";
import type { ColorValue } from "../core/contracts/colorValue";
import { colorValueCss } from "../adapters/obsidian/colorPresentation";
import { isNoteTypeTagConnection, NOTE_TYPE_TAG_LINK_STYLE } from "../core/graph/presentation";
import type {ElementStyleSource, StandardStyleKey} from "../core/contracts/styleSource";

/** One real inheritance layer can draw its combined label prefix from several tag definitions. */
export type ElementStyleLayer<S> = Readonly<{sources: readonly ElementStyleSource[]; style: S}>;

/** Merge optional style fields in renderer order without mutating a stored definition. */
function mergeStyleLayers<S extends NodeStyle | LinkStyle>(layers: readonly ElementStyleLayer<S>[]): S {
  const style = {} as S;
  for (const layer of layers) Object.assign(style, layer.style);
  return style;
}

/** Renderer inheritance when a legacy/custom style has no explicit width. */
export const DEFAULT_RENDERED_LINK_WIDTH = 1.2;

/** Compatibility facade for literal alpha and typed color identities after style inheritance. */
export const alphaHexToCss = (color?: ColorValue, fallback = "transparent"): string => colorValueCss(color, fallback);


/** Resolve imported tag-style precedence without changing the stored dictionary spelling/order. */
function tagStyle(page: GraphPage, settings: KplexSettings, selected: NodeStyle): NodeStyle {
  if (!page.primaryStyleTag) return {};
  const key = settings.tagStyleList.find((tag) => matchesStyleTag(page.primaryStyleTag!, tag));
  if (!key) return {};
  const primary = settings.tagNodeStyles[key] ?? {};
  if (!settings.displayAllStylePrefixes) return primary;
  const prefixes = new Set<string>();
  if (primary.prefix) prefixes.add(primary.prefix);
  for (const tag of page.styleTags) {
    const match = settings.tagStyleList.find((candidate) => matchesStyleTag(tag, candidate));
    const prefix = match ? settings.tagNodeStyles[match]?.prefix : undefined;
    if (prefix) prefixes.add(prefix);
  }
  if (selected.prefix) prefixes.add(selected.prefix);
  return prefixes.size ? { ...primary, prefix: [...prefixes].join("") } : primary;
}

/** Read the selected tag directly, then its case-equivalent or existing prefix rule. */
function noteTypeLayers(page: GraphPage, settings: KplexSettings): ElementStyleLayer<NodeStyle>[] {
  if (!page.noteType) return [];
  const name = tagStyleKey(page.noteType);
  const key = Object.prototype.hasOwnProperty.call(settings.tagNodeStyles, name) ? name
    : Object.keys(settings.tagNodeStyles).find(key => key.toLowerCase() === name.toLowerCase());
  const prefix = settings.tagStyleList.find(prefix => matchesStyleTag(name, prefix));
  return [...new Set([prefix, key].filter((value): value is string => !!value))].map(key =>
    ({sources: [{kind: "note-type" as const, key}], style: settings.tagNodeStyles[key] ?? {}}));
}

/** Rendering and its context menu consume this exact ordered inheritance, without a second classifier. */
export function nodeStyleLayers(page: GraphPage, relation: Neighbour | null, role: Role | "center", settings: KplexSettings): ElementStyleLayer<NodeStyle>[] {
  const layers: ElementStyleLayer<NodeStyle>[] = [];
  const standard = (key: StandardStyleKey): void => {layers.push({sources: [{kind: "standard", key}], style: settings[key]});};
  standard("baseNodeStyle");
  if (page.isFolder || page.isTag) {
    if (role === "center") standard("centralNodeStyle");
    if (role === "sibling") standard("siblingNodeStyle");
    standard(page.isFolder ? "folderNodeStyle" : "tagNodeStyle");return layers;
  }
  if (relation?.relationType === RelationType.INFERRED) standard("inferredNodeStyle");
  if (page.url) standard("urlNodeStyle");
  if (!page.file && !page.url) standard("virtualNodeStyle");
  if (page.file && page.file.extension !== "md") standard("attachmentNodeStyle");
  if (role === "center") standard("centralNodeStyle");
  if (role === "sibling") standard("siblingNodeStyle");
  const selectedLayers = noteTypeLayers(page, settings), selected = mergeStyleLayers(selectedLayers);
  const primary = page.primaryStyleTag && settings.tagStyleList.find(key => matchesStyleTag(page.primaryStyleTag!, key));
  if (primary) layers.push({sources: [{kind: "tag", key: primary}], style: settings.tagNodeStyles[primary] ?? {}});
  layers.push(...selectedLayers);
  const tags = tagStyle(page, settings, selected);
  if (settings.displayAllStylePrefixes && tags.prefix) {
    const keys = page.styleTags.flatMap(tag => {const key = settings.tagStyleList.find(candidate => matchesStyleTag(tag, candidate));return key && settings.tagNodeStyles[key]?.prefix ? [key] : [];});
    if (primary && settings.tagNodeStyles[primary]?.prefix) keys.unshift(primary);
    keys.push(...selectedLayers.filter(layer => layer.style.prefix).flatMap(layer => layer.sources.flatMap(source => source.kind === "note-type" ? [source.key] : [])));
    layers.push({sources: [...new Set(keys)].map(key => ({kind: "prefix", key})), style: {prefix: tags.prefix}});
  }
  return layers;
}

/** Preserve the same style result while retaining explicit provenance for each inherited layer. */
export function resolveNodeStyle(page: GraphPage, relation: Neighbour | null, role: Role | "center", settings: KplexSettings): NodeStyle {
  const style = mergeStyleLayers(nodeStyleLayers(page, relation, role, settings));
  return page.isFolder || page.isTag ? style : {...style, embedHeight: settings.centerEmbedHeight, embedWidth: settings.centerEmbedWidth};
}

/** Layer connector overrides, preserving exact and normalized imported ontology-key precedence. */
export function linkStyleLayers(neighbour: Pick<Neighbour, "typeDefinition" | "relationType">, settings: KplexSettings, origin?: GraphPage, target?: GraphPage): ElementStyleLayer<LinkStyle>[] {
  const layers: ElementStyleLayer<LinkStyle>[] = [{sources: [{kind: "standard", key: "baseLinkStyle"}], style: settings.baseLinkStyle}];
  if (neighbour.relationType === RelationType.INFERRED) layers.push({sources: [{kind: "standard", key: "inferredLinkStyle"}], style: settings.inferredLinkStyle});
  const definitions = neighbour.typeDefinition?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  for (const definition of definitions) {
    if (definition === "file-tree") layers.push({sources: [{kind: "standard", key: "folderLinkStyle"}], style: settings.folderLinkStyle});
    else if (definition === "tag-tree") layers.push({sources: [{kind: "standard", key: "tagLinkStyle"}], style: settings.tagLinkStyle});
    const normalized = definition.toLowerCase().replaceAll(" ", "-");
    // The index publishes normalized names; legacy ExcaliBrain overrides may retain
    // their original display spelling. Preserve exact-key precedence and stored data.
    const importedKey = settings.hierarchyLinkStyles[definition] || settings.hierarchyLinkStyles[normalized]
      ? undefined
      : Object.keys(settings.hierarchyLinkStyles).find((key) => key.toLowerCase().replaceAll(" ", "-") === normalized);
    const key = settings.hierarchyLinkStyles[definition] ? definition : settings.hierarchyLinkStyles[normalized] ? normalized : importedKey;
    if (key) layers.push({sources: [{kind: "ontology", key}], style: settings.hierarchyLinkStyles[key]});
  }
  if (origin && target && definitions.includes("tag-tree") && isNoteTypeTagConnection(origin, target)) {
    const normal = mergeStyleLayers(layers);
    layers.push({sources: [{kind: "ontology", key: NOTE_TYPE_TAG_LINK_STYLE}], style: {strokeWidth: (normal.strokeWidth ?? DEFAULT_RENDERED_LINK_WIDTH) * 2, ...settings.hierarchyLinkStyles[NOTE_TYPE_TAG_LINK_STYLE]}});
  }
  return layers;
}

/** Existing tag defaults share the same normal connector inheritance as painted edges. */
function definitionLinkStyle(neighbour: Pick<Neighbour, "typeDefinition" | "relationType">, settings: KplexSettings): LinkStyle {
  return mergeStyleLayers(linkStyleLayers(neighbour, settings));
}

/** Inherit live tag defaults and double their width; never sample/store computed factory colors. */
export function noteTypeTagDefaultStyle(settings: KplexSettings): LinkStyle {
  const tagStyle = definitionLinkStyle({typeDefinition: "tag-tree", relationType: RelationType.DEFINED}, settings);
  return {...tagStyle, strokeWidth: (tagStyle.strokeWidth ?? DEFAULT_RENDERED_LINK_WIDTH) * 2};
}

/** Only the active scene's prepared facets choose this appearance override; no source/evidence work. */
export function resolveLinkStyle(neighbour: Neighbour, settings: KplexSettings, origin?: GraphPage): LinkStyle {
  return mergeStyleLayers(linkStyleLayers(neighbour, settings, origin, neighbour.page));
}

/** Paint-only output shared by real thoughts, mini nodes and synthetic editor examples. */
export type NodePaint = Readonly<{ background: string; foreground: string; border: string; gateStroke: string; gateFill: string }>;
export type NodePaintFallbacks = Readonly<{ fill: string; foreground: string; border: string; gateStroke: string; gateFill: string; hatch: string }>;
export const NATIVE_NODE_PAINT: NodePaintFallbacks = {
  fill: "var(--kplex-node-fill, var(--background-secondary))",
  foreground: "var(--kplex-node-text, var(--text-normal))",
  border: "var(--kplex-node-border, var(--background-modifier-border))",
  gateStroke: "var(--kplex-gate-stroke-color, var(--text-muted))",
  gateFill: "var(--kplex-gate-fill-color, var(--text-muted))",
  hatch: "var(--kplex-node-hatch-color, var(--text-muted))",
};
const NODE_COLOR_FALLBACK_FIELDS = {backgroundColor: "fill", textColor: "foreground", borderColor: "border", gateStrokeColor: "gateStroke", gateBackgroundColor: "gateFill"} as const;
/** Reuse the production consumer's fallback when previewing or explicitly converting a source. */
export function nodeColorFallback(field: keyof typeof NODE_COLOR_FALLBACK_FIELDS, fallback: NodePaintFallbacks = NATIVE_NODE_PAINT): string {
  return fallback[NODE_COLOR_FALLBACK_FIELDS[field]];
}
export const NATIVE_LINK_STROKE = "var(--kplex-link-color, color-mix(in srgb, var(--graph-line, var(--text-muted)) 25%, var(--text-muted)))";
export const NATIVE_LINK_TEXT = "var(--kplex-link-text, var(--text-normal))";
export const NATIVE_CANVAS_FILL = "var(--kplex-canvas-background, var(--canvas-background, var(--background-primary)))";
export const NATIVE_LINK_LABEL_FILL = "var(--kplex-link-label-background, var(--background-primary))";

/** Select fresh native slot fallbacks; explicit winning style fields always take precedence. */
export function nodePaintFallbacks(node: Readonly<{page: Pick<GraphPage, "isFolder" | "isTag" | "url"> & {file: unknown}; role: Role | "center"; relationType?: Neighbour["relationType"]}>): NodePaintFallbacks {
  const fallback = { ...NATIVE_NODE_PAINT };
  if (node.role === "center") {
    fallback.fill = "var(--kplex-central-node-fill, var(--kplex-node-fill, var(--background-primary-alt, var(--background-primary))))";
    fallback.border = "var(--kplex-central-node-border, var(--interactive-accent))";
  }
  if (node.page.isFolder) {
    fallback.foreground = "var(--kplex-folder-text, var(--nav-item-color, var(--text-normal)))";
    fallback.border = NATIVE_NODE_PAINT.border;
  } else if (node.page.isTag) {
    fallback.fill = "var(--kplex-tag-fill, var(--tag-background, var(--background-secondary)))";
    fallback.foreground = "var(--kplex-tag-text, var(--tag-color, var(--interactive-accent)))";
    fallback.border = "var(--kplex-tag-border, var(--tag-border-color, var(--background-modifier-border)))";
  } else if (node.page.url) fallback.foreground = "var(--kplex-url-text, var(--link-external-color, var(--link-color, var(--interactive-accent))))";
  else if (!node.page.file) fallback.foreground = "var(--kplex-virtual-text, var(--link-unresolved-color, var(--text-muted)))";
  else if (node.relationType === RelationType.INFERRED) fallback.foreground = "var(--kplex-inferred-text, var(--text-muted))";
  return fallback;
}

/**
 * Paint winning fields after existing style precedence. Preview callers inject sampled fallbacks;
 * normal DOM keeps live CSS sources. Hatches tint only their stripe, never foreground content.
 */
export function nodePaint(style: NodeStyle, fallback: NodePaintFallbacks = NATIVE_NODE_PAINT): NodePaint {
  const fill = alphaHexToCss(style.backgroundColor, fallback.fill);
  const hatch = fallback.hatch;
  const background = style.fillStyle === "hachure"
    ? `repeating-linear-gradient(135deg, color-mix(in srgb, ${hatch} 7%, transparent) 0 1px, transparent 1px 6px), ${fill}`
    : style.fillStyle === "cross-hatch"
      ? `repeating-linear-gradient(45deg, color-mix(in srgb, ${hatch} 6%, transparent) 0 1px, transparent 1px 7px), repeating-linear-gradient(135deg, color-mix(in srgb, ${hatch} 6%, transparent) 0 1px, transparent 1px 7px), ${fill}` : fill;
  return { background, foreground: alphaHexToCss(style.textColor, fallback.foreground), border: alphaHexToCss(style.borderColor, fallback.border),
    gateStroke: alphaHexToCss(style.gateStrokeColor, fallback.gateStroke), gateFill: alphaHexToCss(style.gateBackgroundColor, fallback.gateFill) };
}

/** Re-layer only current color fields over cached geometry; removed overrides correctly return to inheritance. */
export function currentNodeColorStyle(node: Pick<PositionedNode, "page" | "role" | "relationType" | "typeDefinition" | "linkDirection" | "style">, settings: KplexSettings): NodeStyle {
  const relation: Neighbour | null = node.role === "center" ? null : { page: node.page, role: node.role,
    relationType: node.relationType ?? RelationType.DEFINED, typeDefinition: node.typeDefinition, linkDirection: node.linkDirection ?? null };
  const current = resolveNodeStyle(node.page, relation, node.role, settings);
  return { ...node.style, backgroundColor: current.backgroundColor, textColor: current.textColor,
    borderColor: current.borderColor, gateStrokeColor: current.gateStrokeColor, gateBackgroundColor: current.gateBackgroundColor };
}
