import { useMemo, useState } from "react";
import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage } from "../types";
import { FuzzySearchInput } from "./FuzzySearchInput";

export function SearchBox({
  index,
  onActivate,
  focusRequest,
  placeholder,
  ariaLabel,
}: {
  index: GraphIndex;
  onActivate: (page: GraphPage) => void;
  focusRequest?: number;
  placeholder: string;
  ariaLabel: string;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => index.search(query, 24), [index, query]);

  return <FuzzySearchInput
    value={query}
    onChange={setQuery}
    results={results}
    onChoose={(page) => { onActivate(page); setQuery(""); }}
    getKey={(page) => page.path}
    getLabel={(page) => index.titleFor(page)}
    getDetail={(page) => page.path}
    placeholder={placeholder}
    ariaLabel={ariaLabel}
    floating
    focusRequest={focusRequest}
  />;
}
