/**
 * Durable source-local semantic dependency memberships. These rows are a neutral derivative of one
 * selected source revision: no settings, relationship roles, presentation policy or graph pages are
 * stored here. Immutable membership rows are selected only through the source-local owner record,
 * which is activated in the same IndexedDB transaction as the source head.
 */
import { SOURCE_DECODE_BUDGET_BYTES, sourceCount, sourceObject, type SourceHead, type StoredSourceFact } from "./SourceFacts";

export const SOURCE_LOCAL_DEPENDENCY_STORE = "sourceLocalDependencies";
export const SOURCE_LOCAL_OWNER_STORE = "sourceLocalDependencyOwners";
export const SOURCE_LOCAL_KEY_STORE = "sourceLocalDependencyKeys";
export const SOURCE_LOCAL_LOOKUP_INDEX = "sourceLocalLookup";
export const SOURCE_LOCAL_REVISION_INDEX = "sourceLocalRevision";
export const SOURCE_LOCAL_DEPENDENCY_STATE_KEY = "source-local-dependency-state";
export const SOURCE_LOCAL_DEPENDENCY_VERSION = 1;
export const SOURCE_LOCAL_DEPENDENCY_BUDGET = SOURCE_DECODE_BUDGET_BYTES;

export type SourceLocalDependencyState = Readonly<{
  key: typeof SOURCE_LOCAL_DEPENDENCY_STATE_KEY;
  version: 1;
  revision: number;
  complete: boolean;
}>;

export type SourceLocalDependencyOwner = Readonly<{
  version: 1;
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

export type SourceLocalDependencyRow = Readonly<{
  version: 1;
  sourceId: string;
  sourceRevision: string;
  index: number;
  key: string;
}>;

/** Exact JSON tuples keep kind and opaque identity/value separate without delimiter ambiguity. */
export function sourceLocalDependencyKey(kind: "node" | "field" | "literal" | "family", value: string): string {
  return JSON.stringify([kind, value]);
}

/** Preserve the structural collector's exact canonical tag path normalization. */
function tagSemanticPath(rawTag: string): string | null {
  const canonical = rawTag.replace(/^#/, "").split("/").map((part) => part.trim()).filter(Boolean).join("/");
  return canonical ? `tag:${canonical}` : null;
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
    const semanticPath = tagSemanticPath(record.value);
    if (semanticPath) yield sourceLocalDependencyKey("node", semanticPath);
    yield sourceLocalDependencyKey("family", "tag-tree");
    yield sourceLocalDependencyKey("literal", sourcePath);
    return;
  }
  // file-parent is not emitted by cached canonical replay; current folder topology is supplied
  // independently by the bounded structural host supplement.
}

export function sourceLocalDependencyState(revision = 0, complete = false): SourceLocalDependencyState {
  return { key: SOURCE_LOCAL_DEPENDENCY_STATE_KEY, version: 1, revision, complete };
}

export function validSourceLocalDependencyState(value: unknown): value is SourceLocalDependencyState {
  return sourceObject(value) && Object.keys(value).length === 4 && value.key === SOURCE_LOCAL_DEPENDENCY_STATE_KEY
    && value.version === 1 && sourceCount(value.revision) && typeof value.complete === "boolean";
}

export function validSourceLocalDependencyOwner(value: unknown): value is SourceLocalDependencyOwner {
  return sourceObject(value) && Object.keys(value).length === 9 && value.version === 1
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
    return Array.isArray(tuple) && tuple.length === 2 && ["node", "field", "literal", "family"].includes(String(tuple[0]))
      && typeof tuple[1] === "string" && JSON.stringify(tuple) === value.key;
  } catch { return false; }
}

export function validSourceLocalDependencyKeyState(value: unknown): value is SourceLocalDependencyKeyState {
  if (!sourceObject(value) || Object.keys(value).length !== 3 || value.version !== 1
    || typeof value.key !== "string" || !sourceCount(value.count)) return false;
  try {
    const tuple: unknown = JSON.parse(value.key);
    return Array.isArray(tuple) && tuple.length === 2 && ["node", "field", "literal", "family"].includes(String(tuple[0]))
      && typeof tuple[1] === "string" && JSON.stringify(tuple) === value.key;
  } catch { return false; }
}
