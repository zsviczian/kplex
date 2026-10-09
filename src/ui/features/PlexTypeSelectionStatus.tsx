/**
 * Portable, noninteractive feedback for the focused Plex's exact-phrase typing selection. The caller
 * supplies localized copy and current displayed-occurrence counts; this component never captures
 * keyboard input, reads host/search state or owns selection, scrolling or persistent preferences.
 */
import type { Translator } from "../../lang";

/** Show a compact live query/match receipt without adding a second input or changing graph focus. */
export function PlexTypeSelectionStatus({ query, count, index, translate }: {
  query: string; count: number; index: number; translate: Translator;
}) {
  if (!query) return null;
  return <div className="kplex-type-selection" role="status" aria-live="polite" aria-atomic="true"
    aria-label={translate("graph.typeSelectionStatus", { query, index, count })}
    data-kplex-type-query={query} data-kplex-type-count={count} data-kplex-type-index={index}>
    <span className="kplex-type-selection-query">{query}</span>
    <span className="kplex-type-selection-count">{translate("graph.typeSelectionCount", { index, count })}</span>
  </div>;
}
