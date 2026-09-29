/**
 * Resolves K-Plex node/connector appearance without mutating graph semantics or saved settings.
 * Imported style dictionaries retain their original keys and alpha channels at this presentation seam.
 */
import type { KplexSettings } from "../settings";
import type { GraphPage, LinkStyle, Neighbour, NodeStyle, Role } from "../types";
import { RelationType } from "../types";

export const alphaHexToCss = (color?: string, fallback = "transparent"): string => {
  if (!color) return fallback;
  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const a = parseInt(color.slice(7, 9), 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return color;
};


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
export function resolveLinkStyle(neighbour: Neighbour, settings: KplexSettings): LinkStyle {
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
