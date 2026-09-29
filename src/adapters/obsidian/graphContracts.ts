/**
 * Maps K-Plex host graph/settings facades to narrow portable read contracts. Host page identity
 * stays at this boundary; adapters never reclassify relationships.
 */
import type { KplexSettings } from "../../settings";
import type { GraphPage } from "../../types";
import type { GraphSearchRead } from "../../core/graph/read";
import { nodeId, type GraphNodeKind, type GraphNodeView } from "../../core/graph/model";
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
