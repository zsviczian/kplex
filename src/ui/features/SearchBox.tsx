import { useMemo, useState, type ReactNode } from "react";
import type { GraphSearchActivation, GraphSearchRead } from "../../core/graph/read";
import { FuzzySuggester } from "../components/FuzzySuggester";

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
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => graph.search(query, 24), [graph, query, revision]);

  return <FuzzySuggester
    value={query}
    onChange={setQuery}
    results={results}
    onChoose={(hit) => { onActivate(hit.node.id); setQuery(""); }}
    getKey={(hit) => hit.node.id}
    getLabel={(hit) => hit.label}
    getDetail={(hit) => hit.detail}
    placeholder={placeholder}
    ariaLabel={ariaLabel}
    floating
    icon={icon}
    portalSelector={portalSelector}
    appTopbarSelector={appTopbarSelector}
    focusRequest={focusRequest}
  />;
}
