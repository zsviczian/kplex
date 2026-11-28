/** Search only the detached, approved vocabulary and enabled rendered text. */
import type {NodeId} from "../core/graph/model";
import type {GraphSearchRead} from "../core/graph/read";
import {publicationSearchTerms, readPublicationSearch, type PublicationSearchIndex} from "../core/plex/publicationSearch";
import type {Publication} from "./publication";

type FullTextIndex = Readonly<{rows: PublicationSearchIndex["rows"]; positions: ReadonlyMap<string, number>; postings: ReadonlyMap<string, readonly number[]>}>;

/** Normalize author-approved text without changing the display label or treating a name as identity. */
function normalize(value: string): string {
  return value.trim().normalize("NFC").toLowerCase();
}

/** Admit the already-built postings as bounded lookups after explicit reader demand. */
export function readFullText(value: unknown, publication: Publication): FullTextIndex {
  const allowed = new Set([...publication.published.values()].filter(node => node.kind === "document" || node.kind === "drawing").map(node => node.id));
  const search = readPublicationSearch(value, allowed);
  return {rows: search.rows, positions: new Map(search.rows.map(({id}, offset) => [id, offset])), postings: new Map(search.terms)};
}

/** Return a bounded plain-text excerpt; the shared SearchBox renders it as text. */
function snippet(body: string, term: string): string {
  const offset = Math.max(0, normalize(body).indexOf(term) - 35);
  return `${offset ? "…" : ""}${body.slice(offset, offset + 90)}${body.length > offset + 90 ? "…" : ""}`;
}

/** Reuse the SearchBox capability while keeping scoring and the address index publication-owned. */
export function publicationSearch(publication: Publication, bodyIndex: FullTextIndex | null) {
  const names = new Map<string, Set<NodeId>>();
  const vocabulary = [...publication.nodes.values()].map(node => {
    const title = normalize(node.name), aliases = node.aliases.map(normalize);
    const properties = Object.values(publication.published.get(node.id)?.properties ?? {}).flatMap(value => typeof value === "object" ? [...value] : [String(value)]).map(normalize);
    for (const key of [title, ...aliases]) {
      let ids = names.get(key);
      if (!ids) names.set(key, ids = new Set());
      ids.add(node.id);
    }
    return {node, title, aliases, properties};
  });
  const graph: GraphSearchRead = {
    search(raw, limit) {
      const query = normalize(raw.slice(0, 128));
      if (!query) return [];
      const terms = publicationSearchTerms(query);
      const first = terms[0];
      const matches = bodyIndex && terms.length ? terms.map(term => new Set(bodyIndex.postings.get(term))) : null;
      return vocabulary.flatMap(({node, title, aliases, properties}) => {
        const position = bodyIndex?.positions.get(node.id);
        const score = title === query ? 1 : aliases.includes(query) ? 2 : title.startsWith(query) ? 3
          : aliases.some(alias => alias.startsWith(query)) ? 4 : title.includes(query) ? 5
            : aliases.some(alias => alias.includes(query)) || properties.some(value => value.includes(query)) ? 6
              : position !== undefined && matches?.every(set => set.has(position)) ? 7 : 0;
        return score ? [{score, node, position, title}] : [];
      }).sort((left, right) => left.score - right.score || publication.read.compare(left.node, right.node)).slice(0, limit)
        .map(({score, node, position, title}) => {
          const body = score === 7 && position !== undefined ? bodyIndex?.rows[position]?.text : undefined;
          const detail = body && first ? snippet(body, first) : names.get(title)!.size > 1 ? node.id : node.aliases.find(alias => normalize(alias).includes(query)) ?? "";
          return {node, label: node.name, detail};
        });
    },
  };
  return {graph,
    /** Match the exact public ID or name, preserving distinct identities of same-named notes. */
    address(value: string): readonly NodeId[] {
      const query = normalize(value), known = publication.nodes.get(query);
      return known ? [known.id] : [...names.get(query) ?? []];
    },
  };
}
