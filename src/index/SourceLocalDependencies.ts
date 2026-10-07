/**
 * Durable source-local semantic dependency memberships. These rows are a neutral derivative of one
 * selected source revision: no settings, relationship roles, presentation policy or graph pages are
 * stored here. Immutable membership rows are selected only through the source-local owner record,
 * which is activated in the same IndexedDB transaction as the source head.
 * Version 4 adds canonical web URL memberships alongside authenticated historical spellings;
 * upgrading this disposable derivative never reparses or restamps its selected neutral source.
 */
import { canonicalTagPaths } from "../core/graph/tagPaths";
import { canonicalWebUrl, webUrlOrigin } from "../adapters/obsidian/urlIdentity";
import { SOURCE_DECODE_BUDGET_BYTES, sourceCount, sourceObject, type SourceHead, type StoredSourceFact } from "./SourceFacts";

export const SOURCE_LOCAL_DEPENDENCY_STORE = "sourceLocalDependencies";
export const SOURCE_LOCAL_OWNER_STORE = "sourceLocalDependencyOwners";
export const SOURCE_LOCAL_KEY_STORE = "sourceLocalDependencyKeys";
export const SOURCE_LOCAL_REPAIR_STORE = "sourceLocalDependencyRepairs";
export const SOURCE_LOCAL_LOOKUP_INDEX = "sourceLocalLookup";
export const SOURCE_LOCAL_REVISION_INDEX = "sourceLocalRevision";
export const SOURCE_LOCAL_DEPENDENCY_STATE_KEY = "source-local-dependency-state";
export const SOURCE_LOCAL_DEPENDENCY_VERSION = 4;
/** State format 3 certifies complete canonical URL and ancestor-aware owner projections. */
export const SOURCE_LOCAL_STATE_VERSION = 3;
export const SOURCE_LOCAL_DEPENDENCY_BUDGET = SOURCE_DECODE_BUDGET_BYTES;

/** True requires all current URL memberships; 3 retains accepted non-URL/tag-ancestor coverage. */
export type SourceLocalProjectionRequirement = boolean | 3;

export type SourceLocalDependencyState = Readonly<{
  key: typeof SOURCE_LOCAL_DEPENDENCY_STATE_KEY;
  version: 1 | 2 | 3;
  revision: number;
  complete: boolean;
  /** Number of selected-owner count journals that must finish before closed-world lookups resume. */
  pending: number;
}>;

export type SourceLocalDependencyOwner = Readonly<{
  /** Versions 1–3 retain accepted projections; version 4 adds canonical web URL memberships. */
  version: 1 | 2 | 3 | 4;
  sourceId: string;
  sourceRevision: string;
  state: SourceHead["state"];
  sequence: number;
  /** Canonical structural document encounter order used by relation-scoped replay. */
  order: number;
  /** Exact Vault.getMarkdownFiles() encounter order used only by URL-title selection. */
  markdownOrder: number;
  records: number;
  digest: string;
}>;


export type SourceLocalDependencyKeyState = Readonly<{
  version: 1;
  key: string;
  count: number;
}>;


export type SourceLocalDependencyRepair = Readonly<{
  version: 1;
  sourceId: string;
  /** Same non-null from/to revision is private staging/reclaim; distinct/null sides are selected count repair. */
  fromRevision: string | null;
  fromRecords: number;
  /** Private reclaim uses fromIndex === fromRecords as its durable claim/fence sentinel. */
  fromIndex: number;
  toRevision: string | null;
  toRecords: number;
  /** Private reclaim advances this cursor while deleting never-selected staging rows. */
  toIndex: number;
}>;

export type SourceLocalDependencyRow = Readonly<{
  version: 1;
  sourceId: string;
  sourceRevision: string;
  index: number;
  key: string;
}>;

/** Match only the projection needed by a semantic caller, without weakening count/journal fences. */
export function sourceLocalStateCoversProjection(state: SourceLocalDependencyState, required: SourceLocalProjectionRequirement): boolean {
  return !required || state.version >= (required === 3 ? 2 : SOURCE_LOCAL_STATE_VERSION);
}

/** Historical non-URL owners retain their accepted capabilities while canonical URLs require v4. */
export function sourceLocalOwnerCoversProjection(owner: SourceLocalDependencyOwner, required: SourceLocalProjectionRequirement): boolean {
  return !required || owner.version >= (required === 3 ? 3 : SOURCE_LOCAL_DEPENDENCY_VERSION);
}

/** Exact JSON tuples keep kind and opaque identity/value separate without delimiter ambiguity. */
export function sourceLocalDependencyKey(kind: "node" | "field" | "literal" | "family" | "resolver", value: string): string {
  return JSON.stringify([kind, value]);
}

/**
 * Coarse, resolver-owned lexical identity used only to find sources that may change binding when a
 * file/path/alias appears or disappears. The final Obsidian resolver still decides the target. A
 * normalized token resolves only lexical URI/subpath/relative spelling; it never classifies a
 * relationship or substitutes for getFirstLinkpathDest(). Basename-only links remain deliberately
 * broad because Obsidian itself may bind them anywhere in the vault.
 */
function sourceLocalResolverCandidate(rawTarget: string): string {
  let candidate = rawTarget.trim();
  try { candidate = decodeURIComponent(candidate); } catch { /* preserve undecodable host spelling */ }
  const hash = candidate.indexOf("#");
  if (hash >= 0) candidate = candidate.slice(0, hash);
  return candidate.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
}

export function sourceLocalResolverToken(rawTarget: string, sourcePath?: string): string | null {
  let candidate = sourceLocalResolverCandidate(rawTarget);
  const relative = candidate === "." || candidate === ".." || candidate.startsWith("./") || candidate.startsWith("../");
  const pathLike = relative || candidate.includes("/");
  if (relative && sourcePath) {
    const base = sourcePath.replace(/\\/g, "/").split("/");
    base.pop();
    for (const part of candidate.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") base.pop(); else base.push(part);
    }
    candidate = base.join("/");
  }
  candidate = candidate.replace(/^\/+/, "").replace(/\.md$/i, "").trim().toLowerCase();
  if (!candidate) return null;
  return `${pathLike ? "path" : "name"}:${candidate}`;
}

export function sourceLocalResolverDependencyKey(rawTarget: string, sourcePath?: string): string | null {
  const token = sourceLocalResolverToken(rawTarget, sourcePath);
  return token ? sourceLocalDependencyKey("resolver", token) : null;
}

/** Target paths need a path token even at vault root, where no slash is present. */
export function sourceLocalResolverPathDependencyKey(path: string): string | null {
  const candidate = sourceLocalResolverCandidate(path).replace(/^\/+/, "").replace(/\.md$/i, "").trim().toLowerCase();
  return candidate ? sourceLocalDependencyKey("resolver", `path:${candidate}`) : null;
}

/** Every selected Markdown owner contributes its own canonical entity identity. */
export function sourceLocalStructuralBaseKeys(sourceId: string, _physicalPath: string): readonly string[] {
  return [sourceLocalDependencyKey("node", sourceId)];
}

/**
 * Add conservative URL memberships using explicit lexical/kind facts, never parsing an opaque ID.
 * Original raw keys remain available to historical callers; these additions let canonical roots
 * and subpaths select existing owners without rewriting body or property source frames.
 */
function* sourceLocalCanonicalUrlKeys(record: StoredSourceFact): IterableIterator<string> {
  const raw = record.kind === "body-url" ? record.url
    : record.kind === "reference-candidate" && record.external ? record.rawTarget
      : (record.kind === "reference-resolution" || record.kind === "literal-resolution") && record.target?.entity.kind === "url"
        ? record.target.entity.semanticPath ?? record.target.rawTarget : null;
  if (raw === null) return;
  const url = canonicalWebUrl(raw);
  yield sourceLocalDependencyKey("node", url);
  yield sourceLocalDependencyKey("literal", url);
  const origin = webUrlOrigin(url);
  if (origin) yield sourceLocalDependencyKey("node", origin);
}

/**
 * Retain the accepted v3 membership vocabulary for one neutral fact, including raw URL spelling
 * and repeated root/body-origin keys. Canonical additions use this baseline in both fresh source
 * activation and historical upgrades; occurrence counts must remain identical across those routes.
 */
function* sourceLocalHistoricalDependencyKeys(sourcePath: string, record: StoredSourceFact): IterableIterator<string> {
  if (record.kind === "reference-value" || record.kind === "inline-value" || record.kind === "field-name" || record.kind === "date-property") {
    yield sourceLocalDependencyKey("field", record.normalizedFieldName);
  }
  if (record.kind === "reference-candidate" || record.kind === "host-literal") {
    yield sourceLocalDependencyKey("literal", record.rawTarget);
    const resolver = sourceLocalResolverDependencyKey(record.rawTarget, sourcePath);
    if (resolver) yield resolver;
  }
  if (record.kind === "reference-resolution" || record.kind === "literal-resolution") {
    if (record.target) yield sourceLocalDependencyKey("node", record.target.entity.id);
    return;
  }
  if (record.kind === "host-link") {
    yield sourceLocalDependencyKey("node", record.target);
    yield sourceLocalDependencyKey("literal", record.target);
    return;
  }
  if (record.kind === "date-property") {
    yield sourceLocalDependencyKey("node", record.target.entity.id);
    yield sourceLocalDependencyKey("literal", record.target.rawTarget);
    return;
  }
  if (record.kind === "body-url") {
    yield sourceLocalDependencyKey("node", record.url);
    yield sourceLocalDependencyKey("literal", record.url);
    const origin = webUrlOrigin(record.url);
    if (origin) yield sourceLocalDependencyKey("node", origin);
    return;
  }
  if (record.kind === "tag") {
    for (const semanticPath of canonicalTagPaths(record.value)) yield sourceLocalDependencyKey("node", semanticPath);
    yield sourceLocalDependencyKey("family", "tag-tree");
    yield sourceLocalDependencyKey("literal", sourcePath);
    return;
  }
  // file-parent is not emitted by cached canonical replay; current folder topology is supplied
  // independently by the bounded structural host supplement.
}

/**
 * Append canonical URL keys absent from this fact's historical projection. The small per-fact
 * arrays retain old occurrence multiplicity without collecting a whole source's memberships;
 * fresh and upgraded owners therefore share the exact same key multiset and selected counts.
 */
function* sourceLocalAdditionalUrlKeys(sourcePath: string, record: StoredSourceFact): IterableIterator<string> {
  const canonical = [...sourceLocalCanonicalUrlKeys(record)];
  if (!canonical.length) return;
  const historical = [...sourceLocalHistoricalDependencyKeys(sourcePath, record)];
  for (const [index, key] of canonical.entries()) {
    if (!historical.includes(key) && canonical.indexOf(key) === index) yield key;
  }
}

/** Project current memberships while preserving historical raw keys and occurrence multiplicity. */
export function* sourceLocalStoredDependencyKeys(sourcePath: string, record: StoredSourceFact): IterableIterator<string> {
  yield* sourceLocalHistoricalDependencyKeys(sourcePath, record);
  yield* sourceLocalAdditionalUrlKeys(sourcePath, record);
}

/** Append only per-fact memberships absent from the authenticated historical owner projection. */
export function* sourceLocalStoredUpgradeKeys(sourcePath: string, record: StoredSourceFact,
  version: SourceLocalDependencyOwner["version"]): IterableIterator<string> {
  if (version < 4) yield* sourceLocalAdditionalUrlKeys(sourcePath, record);
  if (version === 1 && (record.kind === "reference-candidate" || record.kind === "host-literal")) {
    const resolver = sourceLocalResolverDependencyKey(record.rawTarget, sourcePath);
    if (resolver) yield resolver;
  }
  if (version < 3 && record.kind === "tag") {
    let previous: string | null = null;
    for (const path of canonicalTagPaths(record.value)) {
      if (previous !== null) yield sourceLocalDependencyKey("node", previous);
      previous = path;
    }
  }
}

export function sourceLocalDependencyState(revision = 0, complete = false, pending = 0): SourceLocalDependencyState {
  return { key: SOURCE_LOCAL_DEPENDENCY_STATE_KEY, version: SOURCE_LOCAL_STATE_VERSION, revision, complete, pending };
}

export function validSourceLocalDependencyState(value: unknown): value is SourceLocalDependencyState {
  return sourceObject(value) && Object.keys(value).length === 5 && value.key === SOURCE_LOCAL_DEPENDENCY_STATE_KEY
    && (value.version === 1 || value.version === 2 || value.version === SOURCE_LOCAL_STATE_VERSION) && sourceCount(value.revision) && typeof value.complete === "boolean" && sourceCount(value.pending);
}

export function validSourceLocalDependencyOwner(value: unknown): value is SourceLocalDependencyOwner {
  return sourceObject(value) && Object.keys(value).length === 9 && (value.version === 1 || value.version === 2 || value.version === 3 || value.version === SOURCE_LOCAL_DEPENDENCY_VERSION)
    && typeof value.sourceId === "string" && value.sourceId.length > 0
    && typeof value.sourceRevision === "string" && value.sourceRevision.length > 0
    && (value.state === "complete" || value.state === "tombstone")
    && sourceCount(value.sequence) && value.sequence > 0 && sourceCount(value.order) && sourceCount(value.markdownOrder)
    && sourceCount(value.records) && typeof value.digest === "string" && /^[a-f0-9]{64}$/.test(value.digest);
}

export function validSourceLocalDependencyRow(value: unknown): value is SourceLocalDependencyRow {
  if (!sourceObject(value) || Object.keys(value).length !== 5 || value.version !== 1
    || typeof value.sourceId !== "string" || value.sourceId.length === 0
    || typeof value.sourceRevision !== "string" || value.sourceRevision.length === 0
    || !sourceCount(value.index) || typeof value.key !== "string") return false;
  try {
    const tuple: unknown = JSON.parse(value.key);
    return Array.isArray(tuple) && tuple.length === 2 && ["node", "field", "literal", "family", "resolver"].includes(String(tuple[0]))
      && typeof tuple[1] === "string" && JSON.stringify(tuple) === value.key;
  } catch { return false; }
}

export function validSourceLocalDependencyKeyState(value: unknown): value is SourceLocalDependencyKeyState {
  if (!sourceObject(value) || Object.keys(value).length !== 3 || value.version !== 1
    || typeof value.key !== "string" || !sourceCount(value.count)) return false;
  try {
    const tuple: unknown = JSON.parse(value.key);
    return Array.isArray(tuple) && tuple.length === 2 && ["node", "field", "literal", "family", "resolver"].includes(String(tuple[0]))
      && typeof tuple[1] === "string" && JSON.stringify(tuple) === value.key;
  } catch { return false; }
}


export function validSourceLocalDependencyRepair(value: unknown): value is SourceLocalDependencyRepair {
  return sourceObject(value) && Object.keys(value).length === 8 && value.version === 1
    && typeof value.sourceId === "string" && value.sourceId.length > 0
    && (value.fromRevision === null || typeof value.fromRevision === "string" && value.fromRevision.length > 0)
    && sourceCount(value.fromRecords) && sourceCount(value.fromIndex) && value.fromIndex <= value.fromRecords
    && (value.toRevision === null || typeof value.toRevision === "string" && value.toRevision.length > 0)
    && sourceCount(value.toRecords) && sourceCount(value.toIndex) && value.toIndex <= value.toRecords
    && (value.fromRevision !== null || value.fromRecords === 0 && value.fromIndex === 0)
    && (value.toRevision !== null || value.toRecords === 0 && value.toIndex === 0);
}
