/**
 * Resolves K-Plex node/connector appearance without mutating graph semantics or saved settings.
 * Imported style dictionaries retain their original keys and alpha channels at this presentation seam.
 */
import type { KplexSettings } from "../settings";
import type { GraphPage, LinkStyle, Neighbour, NodeStyle, PositionedNode, Role } from "../types";
import { RelationType } from "../types";
import type { ColorValue } from "../core/contracts/colorValue";
import { colorValueCss } from "../adapters/obsidian/colorPresentation";
import { isNoteTypeTagConnection, NOTE_TYPE_TAG_LINK_STYLE } from "../core/graph/presentation";

/** Renderer inheritance when a legacy/custom style has no explicit width. */
export const DEFAULT_RENDERED_LINK_WIDTH = 1.2;

/** Compatibility facade for literal alpha and typed color identities after style inheritance. */
export const alphaHexToCss = (color?: ColorValue, fallback = "transparent"): string => colorValueCss(color, fallback);


/** Resolve imported tag-style precedence without changing the stored dictionary spelling/order. */
function tagStyle(page: GraphPage, settings: KplexSettings): NodeStyle {
  if (!page.primaryStyleTag) return {};
  const key = settings.tagStyleList.find((tag) => page.primaryStyleTag?.startsWith(tag));
  if (!key) return {};
  const primary = settings.tagNodeStyles[key] ?? {};
  if (!settings.displayAllStylePrefixes) return primary;
  const prefixes = new Set<string>();
  if (primary.prefix) prefixes.add(primary.prefix);
  for (const tag of page.styleTags) {
    const match = settings.tagStyleList.find((candidate) => tag.startsWith(candidate));
    const prefix = match ? settings.tagNodeStyles[match]?.prefix : undefined;
    if (prefix) prefixes.add(prefix);
  }
  return prefixes.size ? { ...primary, prefix: [...prefixes].join("") } : primary;
}

/** Resolve the explicit K-Plex property-value style for the already-indexed node facets. */
function noteTypeStyle(page: GraphPage, settings: KplexSettings): NodeStyle {
  if (!page.noteType) return {};
  const normalizedPageType = page.noteType.trim().replace(/^#/, "");
  const direct = settings.noteTypeStyles[normalizedPageType] ?? settings.noteTypeStyles[page.noteType];
  if (direct) return direct;
  const key = Object.keys(settings.noteTypeStyles).find((name) =>
    name.trim().replace(/^#/, "").toLowerCase() === normalizedPageType.toLowerCase()
  );
  return key ? settings.noteTypeStyles[key] ?? {} : {};
}

/** Layer defaults, semantic kind, role and explicit property/tag overrides for one rendered node. */
export function resolveNodeStyle(page: GraphPage, relation: Neighbour | null, role: Role | "center", settings: KplexSettings): NodeStyle {
  const central = role === "center" ? settings.centralNodeStyle : {};
  const sibling = role === "sibling" ? settings.siblingNodeStyle : {};
  if (page.isFolder) {
    return { ...settings.baseNodeStyle, ...central, ...sibling, ...settings.folderNodeStyle };
  }
  if (page.isTag) {
    return { ...settings.baseNodeStyle, ...central, ...sibling, ...settings.tagNodeStyle };
  }
  return {
    ...settings.baseNodeStyle,
    ...(relation?.relationType === RelationType.INFERRED ? settings.inferredNodeStyle : {}),
    ...(page.url ? settings.urlNodeStyle : {}),
    ...(!page.file && !page.url ? settings.virtualNodeStyle : {}),
    ...(page.file && page.file.extension !== "md" ? settings.attachmentNodeStyle : {}),
    ...central,
    ...sibling,
    // Semantic node styles are the user's explicit appearance choice and therefore override the
    // generic role treatment. This is especially important for the central node: previously the
    // central background/text colors masked a perfectly valid Note type style, making the editor
    // appear broken even though the index had parsed the property correctly.
    ...tagStyle(page, settings),
    ...noteTypeStyle(page, settings),
    embedHeight: settings.centerEmbedHeight,
    embedWidth: settings.centerEmbedWidth
  };
}

/** Layer connector overrides, preserving exact and normalized imported ontology-key precedence. */
function definitionLinkStyle(neighbour: Pick<Neighbour, "typeDefinition" | "relationType">, settings: KplexSettings): LinkStyle {
  let layered: LinkStyle = {};
  const definitions = neighbour.typeDefinition?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  for (const definition of definitions) {
    if (definition === "file-tree") layered = { ...layered, ...settings.folderLinkStyle };
    else if (definition === "tag-tree") layered = { ...layered, ...settings.tagLinkStyle };
    const normalized = definition.toLowerCase().replaceAll(" ", "-");
    // The index publishes normalized names; legacy ExcaliBrain overrides may retain
    // their original display spelling. Preserve exact-key precedence and stored data.
    const importedKey = settings.hierarchyLinkStyles[definition] || settings.hierarchyLinkStyles[normalized]
      ? undefined
      : Object.keys(settings.hierarchyLinkStyles).find((key) => key.toLowerCase().replaceAll(" ", "-") === normalized);
    layered = {
      ...layered,
      ...(settings.hierarchyLinkStyles[definition] ?? settings.hierarchyLinkStyles[normalized]
        ?? (importedKey ? settings.hierarchyLinkStyles[importedKey] : undefined) ?? {})
    };
  }
  return {
    ...settings.baseLinkStyle,
    ...(neighbour.relationType === RelationType.INFERRED ? settings.inferredLinkStyle : {}),
    ...layered
  };
}

/** Inherit live tag defaults and double their width; never sample/store computed factory colors. */
export function noteTypeTagDefaultStyle(settings: KplexSettings): LinkStyle {
  const tagStyle = definitionLinkStyle({typeDefinition: "tag-tree", relationType: RelationType.DEFINED}, settings);
  return {...tagStyle, strokeWidth: (tagStyle.strokeWidth ?? DEFAULT_RENDERED_LINK_WIDTH) * 2};
}

/** Only the active scene's prepared facets choose this appearance override; no source/evidence work. */
export function resolveLinkStyle(neighbour: Neighbour, settings: KplexSettings, origin?: GraphPage): LinkStyle {
  const normal = definitionLinkStyle(neighbour, settings);
  return origin && neighbour.typeDefinition?.split(",").some(definition => definition.trim() === "tag-tree") && isNoteTypeTagConnection(origin, neighbour.page)
    ? {...normal, strokeWidth: (normal.strokeWidth ?? DEFAULT_RENDERED_LINK_WIDTH) * 2, ...settings.hierarchyLinkStyles[NOTE_TYPE_TAG_LINK_STYLE]} : normal;
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
