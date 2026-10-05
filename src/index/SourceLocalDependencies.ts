/**
 * Durable source-local semantic dependency memberships. These rows are a neutral derivative of one
 * selected source revision: no settings, relationship roles, presentation policy or graph pages are
 * stored here. Immutable membership rows are selected only through the source-local owner record,
 * which is activated in the same IndexedDB transaction as the source head.
 */
import { canonicalTagPaths } from "../core/graph/tagPaths";
import { SOURCE_DECODE_BUDGET_BYTES, sourceCount, sourceObject, type SourceHead, type StoredSourceFact } from "./SourceFacts";

export const SOURCE_LOCAL_DEPENDENCY_STORE = "sourceLocalDependencies";
export const SOURCE_LOCAL_OWNER_STORE = "sourceLocalDependencyOwners";
export const SOURCE_LOCAL_KEY_STORE = "sourceLocalDependencyKeys";
export const SOURCE_LOCAL_REPAIR_STORE = "sourceLocalDependencyRepairs";
export const SOURCE_LOCAL_LOOKUP_INDEX = "sourceLocalLookup";
export const SOURCE_LOCAL_REVISION_INDEX = "sourceLocalRevision";
export const SOURCE_LOCAL_DEPENDENCY_STATE_KEY = "source-local-dependency-state";
export const SOURCE_LOCAL_DEPENDENCY_VERSION = 3;
/** State format 2 certifies that the inventory closed the ancestor-aware owner projection. */
export const SOURCE_LOCAL_STATE_VERSION = 2;
export const SOURCE_LOCAL_DEPENDENCY_BUDGET = SOURCE_DECODE_BUDGET_BYTES;

export type SourceLocalDependencyState = Readonly<{
  key: typeof SOURCE_LOCAL_DEPENDENCY_STATE_KEY;
  version: 1 | 2;
  revision: number;
  complete: boolean;
  /** Number of selected-owner count journals that must finish before closed-world lookups resume. */
  pending: number;
}>;

export type SourceLocalDependencyOwner = Readonly<{
  /** Versions 1/2 retain accepted projections; version 3 adds canonical tag ancestor memberships. */
  version: 1 | 2 | 3;
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
 * Project one stored neutral fact onto direct contributor memberships. This intentionally follows
 * the same incidence vocabulary as contributor summaries, but operates before canonical replay so
 * source activation can persist the derivative atomically without a second family pass.
 */
export function* sourceLocalStoredDependencyKeys(sourcePath: string, record: StoredSourceFact): IterableIterator<string> {
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
    try { yield sourceLocalDependencyKey("node", new URL(record.url).origin); } catch { /* malformed URL has no origin input */ }
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

/** Append only memberships absent from the authenticated historical owner projection. */
export function* sourceLocalStoredUpgradeKeys(sourcePath: string, record: StoredSourceFact,
  version: SourceLocalDependencyOwner["version"]): IterableIterator<string> {
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
    && (value.version === 1 || value.version === SOURCE_LOCAL_STATE_VERSION) && sourceCount(value.revision) && typeof value.complete === "boolean" && sourceCount(value.pending);
}

export function validSourceLocalDependencyOwner(value: unknown): value is SourceLocalDependencyOwner {
  return sourceObject(value) && Object.keys(value).length === 9 && (value.version === 1 || value.version === 2 || value.version === SOURCE_LOCAL_DEPENDENCY_VERSION)
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
