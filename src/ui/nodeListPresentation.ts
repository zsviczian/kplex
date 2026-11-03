/** Shared saved-node row facets and optional compact node paint. Canvas style resolution owns
 * type/tag/kind precedence; these cache-only projections never prepare graph or metadata work. */
import type {CSSProperties} from "react";
import type { GraphPage } from "../types";
import type {KplexSettings} from "../settings";
import {resolveNodeStyle, nodePaint, nodePaintFallbacks} from "../index/style";
import { graphNodeKindFromLegacy } from "../adapters/obsidian/graphContracts";
import { tagDisplayName } from "../core/graph/presentation";
import { searchResultIconName } from "./features/searchResultPresentation";

/** Keep hierarchical tags unambiguous, reusing Find's kind icon unless node styling overrides it.
 * Optional live settings add compact fill/text/border/icon/prefix appearance; list dimensions stay
 * list-owned and no central/relationship treatment is invented for a saved navigation reference. */
export function nodeListPresentation(page: GraphPage, title: string, settings?: KplexSettings, fallbackIcon?: string): { label: string; icon: string; style?: CSSProperties } {
  const style = settings ? resolveNodeStyle(page, null, "child", settings) : undefined;
  const paint = style ? nodePaint(style, nodePaintFallbacks({page, role: "child"})) : undefined;
  return {
    label: `${style?.prefix ?? ""}${page.isTag ? `#${tagDisplayName(page.path, true).replace(/^#/, "")}` : title}`,
    icon: style?.icon ?? fallbackIcon ?? searchResultIconName({ kind: graphNodeKindFromLegacy(page), file: page.file }),
    ...(paint && style ? {style: {background: paint.background, color: paint.foreground, borderColor: paint.border,
      borderWidth: style.strokeWidth ?? 1, borderStyle: style.strokeStyle === "dashed" ? "dashed" : style.strokeStyle === "dotted" ? "dotted" : "solid",
      borderRadius: style.strokeShaprness === "sharp" ? 5 : 12}} : {}),
  };
}
