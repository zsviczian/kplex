/** Shared saved-node row facets; no graph preparation, metadata reads or canvas-label policy changes. */
import type { GraphPage } from "../types";
import { graphNodeKindFromLegacy } from "../adapters/obsidian/graphContracts";
import { tagDisplayName } from "../core/graph/presentation";
import { searchResultIconName } from "./features/searchResultPresentation";

/** Keep hierarchical tags unambiguous in saved lists, reusing Find's type/icon owner. */
export function nodeListPresentation(page: GraphPage, title: string): { label: string; icon: string } {
  return {
    label: page.isTag ? `#${tagDisplayName(page.path, true).replace(/^#/, "")}` : title,
    icon: searchResultIconName({ kind: graphNodeKindFromLegacy(page), file: page.file }),
  };
}
