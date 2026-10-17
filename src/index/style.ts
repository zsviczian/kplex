/**
 * Resolves K-Plex node/connector appearance without mutating graph semantics or saved settings.
 * Imported style dictionaries retain their original keys and alpha channels at this presentation seam.
 * Reciprocal aliases share style fallback; exact field overrides win and mutable hierarchy edits
 * invalidate the bounded parsed-alias cache without scanning any graph or acquiring note data.
 */
import type { KplexSettings } from "../settings";
import type { GraphPage, LinkStyle, Neighbour, NodeStyle, PositionedNode, Role } from "../types";
import { RelationType } from "../types";
import { normalizeFieldName, parseHierarchyFieldMapping } from "../core/contracts/fieldName";
import type { ColorValue } from "../core/contracts/colorValue";
import { colorValueCss } from "../adapters/obsidian/colorPresentation";

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

/** Cache parsed aliases without assuming mutable Settings hierarchy lists are immutable. */
const HIERARCHY_STYLE_ROLES = ["parents", "children", "previous", "next", "leftFriends", "rightFriends"] as const;
const hierarchyStyleAliasesCache = new WeakMap<object, { lists: string[][]; aliases: Map<string, string[]> }>();

/** Reparse only changed configuration; cheap string comparisons also detect same-length in-place edits. */
function getHierarchyStyleAliases(hierarchy: KplexSettings["hierarchy"]): Map<string, string[]> {
  const cached = hierarchyStyleAliasesCache.get(hierarchy);
  if (cached && HIERARCHY_STYLE_ROLES.every(/** Preserve cache correctness across the existing mutable Settings writer. */
    (role, index) => hierarchy[role].length === cached.lists[index].length
      && hierarchy[role].every(/** Compare field spelling as well as array length and identity. */ (entry, position) => entry === cached.lists[index][position]))) return cached.aliases;
  const aliases = new Map<string, string[]>();
  for (const role of HIERARCHY_STYLE_ROLES) for (const entry of hierarchy[role]) {
    const mapping = parseHierarchyFieldMapping(entry);
    const pairs = mapping.inverse && mapping.normalizedInverse
      ? [[mapping.normalizedForward, [mapping.inverse, mapping.normalizedInverse, entry, normalizeFieldName(entry)]],
        [mapping.normalizedInverse, [mapping.forward, mapping.normalizedForward, entry, normalizeFieldName(entry)]]] as const
      : [[mapping.normalizedForward, [entry, normalizeFieldName(entry)]]] as const;
    for (const [name, candidates] of pairs) aliases.set(name, [...(aliases.get(name) ?? []), ...candidates]);
  }
  hierarchyStyleAliasesCache.set(hierarchy, {lists: HIERARCHY_STYLE_ROLES.map(/** Detach exact raw spellings from mutable role lists. */ role => [...hierarchy[role]]), aliases});
  return aliases;
}

/** Preserve exact and normalized imported key precedence for both direct fields and pair aliases. */
function configuredLinkStyle(name: string, settings: KplexSettings): LinkStyle | undefined {
  const normalized = normalizeFieldName(name);
  const direct = settings.hierarchyLinkStyles[name] ?? settings.hierarchyLinkStyles[normalized];
  if (direct) return direct;
  const imported = Object.keys(settings.hierarchyLinkStyles).find(/** Match historical display spellings without rewriting the dictionary. */ key => normalizeFieldName(key) === normalized);
  return imported ? settings.hierarchyLinkStyles[imported] : undefined;
}

/** Layer connector overrides, preserving exact and normalized imported ontology-key precedence. */
export function resolveLinkStyle(neighbour: Neighbour, settings: KplexSettings): LinkStyle {
  let layered: LinkStyle = {};
  const definitions = neighbour.typeDefinition?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  for (const definition of definitions) {
    if (definition === "file-tree") layered = { ...layered, ...settings.folderLinkStyle };
    else if (definition === "tag-tree") layered = { ...layered, ...settings.tagLinkStyle };
    const normalized = normalizeFieldName(definition);
    let style = configuredLinkStyle(definition, settings);
    if (!style && settings.hierarchy) {
      const aliasCandidates = getHierarchyStyleAliases(settings.hierarchy).get(normalized);
      if (aliasCandidates) for (const candidate of aliasCandidates) {
        style = configuredLinkStyle(candidate, settings);
        if (style) break;
      }
    }
    layered = {
      ...layered,
      ...(style ?? {})
    };
  }
  return {
    ...settings.baseLinkStyle,
    ...(neighbour.relationType === RelationType.INFERRED ? settings.inferredLinkStyle : {}),
    ...layered
  };
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
