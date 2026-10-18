/** Host-free global Find composition: index-owned ranking, identity-only activation and caller-provided native icons. */
import { useMemo, useState, type ReactNode } from "react";
import type { GraphSearchActivation, GraphSearchHit, GraphSearchRead } from "../../core/graph/read";
import { FuzzySuggester } from "../components/FuzzySuggester";

/** Render a bounded revision-scoped result list without acquiring graph/source authority. */
export function SearchBox({
  graph,
  icon,
  portalSelector,
  appTopbarSelector,
  onActivate,
  revision,
  focusRequest,
  placeholder,
  ariaLabel,
  clearOnActivate = true,
  repeatFind = false,
  resultIcon,
}: {
  graph: GraphSearchRead;
  icon?: ReactNode;
  portalSelector?: string;
  appTopbarSelector?: string;
  onActivate: GraphSearchActivation;
  /** Publication/presentation revision. Invalidates mapped views after index publication. */
  revision: number;
  focusRequest?: number;
  placeholder: string;
  ariaLabel: string;
  clearOnActivate?: boolean;
  repeatFind?: boolean;
  /** The host supplies its established icon component; portable Find owns no icon runtime. */
  resultIcon?: (hit: GraphSearchHit) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const results = useMemo(/** Hidden Find fields do not rank the vault on every graph/progress update. */ () => focused ? graph.search(query, 24) : [], [graph, query, revision, focused]);

  return <FuzzySuggester
    value={query}
    onChange={setQuery}
    results={results}
    onChoose={/** Activation keeps the exact opaque identity and caller-selected clearing behavior. */ (hit) => { onActivate(hit.node.id); if (clearOnActivate) setQuery(""); }}
    getKey={/** Stable identities distinguish matching labels without parsing their values. */ (hit) => hit.node.id}
    getLabel={/** The search adapter supplies the complete display label. */ (hit) => hit.label}
    getDetail={/** Secondary display text is independent of activation identity. */ (hit) => hit.detail}
    resultPrefix={resultIcon}
    placeholder={placeholder}
    ariaLabel={ariaLabel}
    floating
    icon={icon}
    portalSelector={portalSelector}
    appTopbarSelector={appTopbarSelector}
    focusRequest={focusRequest}
    onFocusChange={setFocused}
    closeOnChoose={!repeatFind}
    advanceOnChoose={repeatFind}
  />;
}
