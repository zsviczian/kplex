/**
 * Maps K-Plex host graph/settings facades to narrow portable read contracts. Host page identity
 * stays at this boundary; adapters never reclassify relationships.
 */
import type { KplexSettings } from "../../settings";
import type { GraphPage } from "../../types";
import type { GraphSearchRead } from "../../core/graph/read";
import { nodeId, type GraphNodeKind, type GraphNodeView } from "../../core/graph/model";
import type { GraphCompilerSettings } from "../../core/graph/compiler";
import type { SemanticIndexSettings } from "../../core/graph/settings";

/** Read the explicit host node facets without inferring kind or case rules from its opaque ID. */
function kindOf(page: GraphPage): GraphNodeKind {
  if (page.isFolder) return "container";
  if (page.isTag) return "tag";
  if (page.url) return "url";
  if (!page.file) return "unresolved";
  // Match the existing builder/render predicates; changing extension case rules is not C08.
  return page.file.extension === "md" ? "document" : "attachment";
}

/** Map one returned host page to a bounded read view; shared metadata remains revision-scoped. */
export function graphNodeViewFromLegacy(page: GraphPage): GraphNodeView {
  const kind = kindOf(page);
  return {
    id: nodeId(page.path),
    name: page.name,
    path: page.path,
    mtime: page.mtime,
    kind,
    resolution: kind === "unresolved" ? "unresolved" : "resolved",
    url: page.url,
    aliases: page.aliases,
    tags: page.tags,
    noteType: page.noteType,
    primaryStyleTag: page.primaryStyleTag,
    styleTags: page.styleTags,
    maxLabelLength: page.maxLabelLength,
    ...(page.file ? {
      file: {
        name: page.file.name,
        extension: page.file.extension,
        path: page.file.path,
        mtime: page.file.stat.mtime,
        basename: page.file.basename,
        ctime: page.file.stat.ctime,
        size: page.file.stat.size,
      },
    } : {}),
  };
}

/** Capture the exact finite compiler policy used by both full builds and cached semantic preparation. */
export function graphCompilerSettingsFromLegacy(settings: KplexSettings): GraphCompilerSettings {
  const hierarchy = settings.hierarchy;
  return {
    hierarchy: {
      hidden: [...hierarchy.hidden],
      parents: [...hierarchy.parents],
      children: [...hierarchy.children],
      leftFriends: [...hierarchy.leftFriends],
      rightFriends: [...hierarchy.rightFriends],
      previous: [...hierarchy.previous],
      next: [...hierarchy.next],
    },
    thumbnailProperty: settings.thumbnailProperty,
    nodeImageProperty: settings.nodeImageProperty,
    inferAllLinksAsFriends: settings.inferAllLinksAsFriends,
    inverseInfer: settings.inverseInfer,
    showFullTagName: settings.showFullTagName,
    tagStyleList: [...settings.tagStyleList],
    maxLabelLength: settings.baseNodeStyle.maxLabelLength ?? 30,
  };
}

/** Map persisted host settings to the semantic subset used by the portable graph. */
export function semanticIndexSettingsFromLegacy(settings: KplexSettings): SemanticIndexSettings {
  return {
    hierarchy: settings.hierarchy,
    inferAllLinksAsFriends: settings.inferAllLinksAsFriends,
    inverseInfer: settings.inverseInfer,
    showFullTagName: settings.showFullTagName,
    noteTypeField: settings.noteTypeField,
    primaryTagField: settings.primaryTagField,
    tagStyleList: settings.tagStyleList,
    maxLabelLength: settings.baseNodeStyle.maxLabelLength ?? 30,
  };
}


type LegacySearchSource = Readonly<{
  search(query: string, limit?: number): GraphPage[];
  titleFor(page: GraphPage): string;
}>;

/**
 * Adapts the legacy semantic-index search facade without exposing GraphPage/TFile to consumers.
 * Search ordering/visibility stay with the legacy source; this boundary only maps returned values.
 */
export function createLegacyGraphSearchRead(source: LegacySearchSource): GraphSearchRead {
  return {
    search(query, limit) {
      return source.search(query, limit).map((page) => ({
        node: graphNodeViewFromLegacy(page),
        label: source.titleFor(page),
        detail: page.path,
      }));
    },
  };
}

/** Rank exact, prefix, substring and ordered-subsequence matches using the same weights as global graph search. */
function scopedSubsequenceScore(text: string, query: string): number | null {
  if (text === query) return 0;
  if (text.startsWith(query)) return 20 + Math.min(80, text.length - query.length);
  const containedAt = text.indexOf(query);
  if (containedAt >= 0) return 120 + containedAt * 4 + Math.min(120, text.length - query.length);

  let queryIndex = 0;
  let first = -1;
  let last = -1;
  let gapPenalty = 0;
  let boundaryBonus = 0;
  for (let index = 0; index < text.length && queryIndex < query.length; index += 1) {
    if (text[index] !== query[queryIndex]) continue;
    if (first < 0) first = index;
    if (last >= 0) gapPenalty += Math.max(0, index - last - 1);
    if (index === 0 || /[\s_\-/.]/.test(text[index - 1])) boundaryBonus += 8;
    last = index;
    queryIndex += 1;
  }
  if (queryIndex !== query.length) return null;
  return 1000 + first * 5 + gapPenalty * 12 + Math.max(0, text.length - query.length) - boundaryBonus;
}

/** Build a bounded search facade over the pages currently present in one Plex. */
export function createScopedGraphSearchRead(
  source: Pick<LegacySearchSource, "titleFor">,
  pages: readonly GraphPage[],
): GraphSearchRead {
  const entries = pages.map((page) => {
    const label = source.titleFor(page);
    return {
      page,
      label,
      normalizedLabel: label.toLocaleLowerCase(),
      aliases: page.aliases.map((alias) => alias.toLocaleLowerCase()),
      detail: page.path,
      normalizedPath: page.path.toLocaleLowerCase(),
    };
  });
  return {
    search(query, limit) {
      const q = query.trim().toLocaleLowerCase();
      if (!q) return [];
      const max = Math.max(1, limit ?? 24);
      return entries
        .map((entry) => {
          let score = scopedSubsequenceScore(entry.normalizedLabel, q);
          for (const alias of entry.aliases) {
            const aliasScore = scopedSubsequenceScore(alias, q);
            if (aliasScore !== null && (score === null || aliasScore + 8 < score)) score = aliasScore + 8;
          }
          const pathScore = scopedSubsequenceScore(entry.normalizedPath, q);
          if (pathScore !== null && (score === null || pathScore + 240 < score)) score = pathScore + 240;
          return score === null ? null : { entry, score };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.score - b.score || a.entry.label.localeCompare(b.entry.label))
        .slice(0, max)
        .map(({ entry }) => ({
          node: graphNodeViewFromLegacy(entry.page),
          label: entry.label,
          detail: entry.detail,
        }));
    },
  };
}
