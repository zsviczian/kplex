/** Deterministic portable search postings over approved rendered text. */
import {isPublicationId, PUBLICATION_MAX_NODES} from "./publication";

export type PublicationSearchRow = Readonly<{id: string; text: string}>;
export type PublicationSearchIndex = Readonly<{
  version: 1;
  rows: readonly PublicationSearchRow[];
  /** Lexically ordered terms point to ascending ordinal positions in the public document table. */
  terms: readonly (readonly [string, readonly number[]])[];
}>;

const maximumNoteText = 100_000;
const maximumText = 8 * 1024 * 1024;
const maximumPostings = 1_000_000;
const word = /[\p{L}\p{N}]+/gu;
const singleWord = /^[\p{L}\p{N}]{1,128}$/u;

/** Match the identities assigned during export, independently of the reader's locale. */
export function publicationSearchTerms(query: string): readonly string[] {
  return [...new Set(query.normalize("NFC").toLowerCase().match(word))].filter(term => term.length <= 128);
}

/** Reject excessive or ambiguous rendered note text before tokenizing any of it. */
function readRows(raw: unknown, allowed?: ReadonlySet<string>): PublicationSearchRow[] {
  if (!Array.isArray(raw) || raw.length > PUBLICATION_MAX_NODES) throw new Error("Invalid publication search rows");
  const seen = new Set<string>();
  let textLength = 0;
  return (raw as unknown[]).map(input => {
    if (!input || typeof input !== "object" || !("id" in input) || !isPublicationId(input.id) || seen.has(input.id)
      || (allowed && !allowed.has(input.id)) || !("text" in input) || typeof input.text !== "string"
      || input.text.length > maximumNoteText) throw new Error("Invalid publication search row");
    seen.add(input.id);
    textLength += input.text.length;
    if (textLength > maximumText) throw new Error("Publication search exceeds its text budget");
    return {id: input.id, text: input.text};
  });
}

/** Build sparse postings once during export, over rendered text supplied by the publisher. */
export function buildPublicationSearch(rows: readonly PublicationSearchRow[]): PublicationSearchIndex {
  const documents = readRows(rows).map(({id, text}) => ({id, text: text.replace(/\s+/g, " ").trim()}))
    .sort((left, right) => left.id < right.id ? -1 : 1);
  const terms = new Map<string, number[]>();
  let count = 0;
  for (const [position, {text}] of documents.entries()) {
    for (const term of publicationSearchTerms(text)) {
      if (++count > maximumPostings) throw new Error("Publication search exceeds its posting budget");
      let hits = terms.get(term);
      if (!hits) terms.set(term, hits = []);
      hits.push(position);
    }
  }
  return {version: 1, rows: documents, terms: [...terms.entries()].sort(([left], [right]) => left < right ? -1 : 1)};
}

/** Validate references and ordering without rebuilding the corpus or retokenizing rendered text. */
export function readPublicationSearch(raw: unknown, allowedIds: ReadonlySet<string>): PublicationSearchIndex {
  if (!raw || typeof raw !== "object" || !("version" in raw) || raw.version !== 1 || !("rows" in raw)
    || !("terms" in raw) || !Array.isArray(raw.terms) || raw.terms.length > maximumPostings) throw new Error("Invalid publication search index");
  const rows = readRows(raw.rows, allowedIds);
  let previousId = "";
  for (const {id} of rows) {
    if (previousId >= id) throw new Error("Unordered publication search rows");
    previousId = id;
  }
  let previousTerm = "", count = 0;
  const terms = (raw.terms as unknown[]).map((entry): readonly [string, readonly number[]] => {
    if (!Array.isArray(entry) || entry.length !== 2) throw new Error("Invalid publication search term");
    const [term, ordinals] = entry as unknown[];
    if (typeof term !== "string" || term.length > 128 || !singleWord.test(term) || term !== term.normalize("NFC").toLowerCase() || previousTerm >= term
      || !Array.isArray(ordinals) || !ordinals.length || ordinals.length > rows.length) throw new Error("Invalid publication search term");
    previousTerm = term;
    count += ordinals.length;
    if (count > maximumPostings) throw new Error("Publication search exceeds its posting budget");
    let previous = -1;
    for (const offset of ordinals as unknown[]) {
      if (typeof offset !== "number" || !Number.isInteger(offset) || offset <= previous || offset >= rows.length) throw new Error("Invalid publication search reference");
      previous = offset;
    }
    return [term, ordinals];
  });
  return {version: 1, rows, terms};
}
