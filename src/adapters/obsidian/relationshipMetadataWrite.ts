/**
 * Lifecycle-owned frontmatter write convergence. A saved mutation remains pending until Obsidian's
 * current metadata and changed-event body agree with all affected properties and the current file
 * revision. Timers report pending work; they never authorize a stale cache or complete a commit.
 */
import type { App, CachedMetadata, EventRef, TFile } from "obsidian";
import { normalizeFieldName } from "../../core/parser/metadata";
import { iterateReferencePayloadChunks } from "../../core/parser/referenceValues";
import { SOURCE_DECODE_BUDGET_BYTES } from "../../index/SourceFacts";

/** Canonical bounded property payload; missing and conflicting ontology fields are observed too. */
export function relationshipMetadataPayload(frontmatter: Record<string, unknown>, fields: ReadonlySet<string>): string {
  const values = Object.keys(frontmatter).filter(
    /** Compare actual normalized property coordinates while retaining original keys and value grammar. */
    key => fields.has(normalizeFieldName(key))).sort().map(
    /** Preserve complete affected values rather than just the desired target's membership. */
    key => [key, frontmatter[key]]);
  let result = "";
  for (const chunk of iterateReferencePayloadChunks(values)) {
    if (2 * (result.length + chunk.length) > SOURCE_DECODE_BUDGET_BYTES) throw new Error("decode-budget");
    result += chunk;
  }
  return result;
}

/** The host distinguishes cancellation after persistence from a write that never happened. */
export class SavedRelationshipPendingError extends Error {
  /** Carry exact notice ownership so a session can retain saved state without repeating a service notice. */
  constructor(message: string, readonly noticeReported = false) { super(message); }
}

/** A cancellation registration belongs to the plugin lifetime, never to a detached modal/document. */
export type RelationshipWriteLifetime = Readonly<{
  own(cancel: () => void): () => void;
  pending(): void;
  savedPendingMessage(): string;
  current?(): boolean;
  preparingMessage?(): string;
}>;

/**
 * Observe before writing, then await exact current metadata/body convergence. A genuine unchanged
 * no-op may reuse the original file/cache identity. Rename, deletion and unload release every owned
 * listener and reject truthfully after saving; no polling or timeout-based authority is introduced.
 */
export async function writeRelationshipMetadata(app: App, file: TFile, fields: ReadonlySet<string>,
  mutate: (frontmatter: Record<string, unknown>) => void, lifetime: RelationshipWriteLifetime): Promise<void> {
  const path = file.path, before = { mtime: file.stat.mtime, size: file.stat.size };
  const beforeCache = app.metadataCache.getFileCache(file);
  // Reject an already oversized observation before allowing any vault mutation.
  const initialPayload = relationshipMetadataPayload(beforeCache?.frontmatter ?? {}, fields);
  // Reserve the changed-event string, the actual current read and both property observations.
  // File bytes bound UTF-16 conservatively; external growth is checked again before reading.
  if (4 * file.stat.size + 4 * initialPayload.length > SOURCE_DECODE_BUDGET_BYTES) throw new Error("decode-budget");
  let expected: string | null = null, saved = false, settled = false, checking = false, generation = 0, noticeReported = false;
  let candidate: { cache: CachedMetadata; data: string } | null = null;
  let timer: number | null = null;
  const refs: Array<readonly ["metadata" | "vault", EventRef]> = [];
  let release = (): void => {};
  let resolve!: () => void, reject!: (error: Error) => void;
  const completion = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  /** Only this observed write knows whether its pending notice already reached the user. */
  const pendingError = (): SavedRelationshipPendingError => new SavedRelationshipPendingError(lifetime.savedPendingMessage(), noticeReported);
  // Cancellation can arrive while processFrontMatter is still awaiting its native write.
  // Retain rejection for the eventual await without an unhandled-rejection event.
  void completion.catch(() => {});
  /** Every terminal outcome removes this exact observer and its existing pending notice timer. */
  const finish = (error?: Error): void => {
    if (settled) return;
    settled = true;
    if (timer !== null) window.clearTimeout(timer);
    for (const [kind, ref] of refs) (kind === "metadata" ? app.metadataCache : app.vault).offref(ref);
    candidate = null; expected = null; release();
    if (error) reject(error); else resolve();
  };
  /** Cancellation after persistence must never be presented as an unsaved relationship. */
  const cancel = (): void => finish(saved ? pendingError() : new Error("cancelled"));
  release = lifetime.own(cancel);
  if (settled) { release(); await completion; return; }
  /** Validate one observed cache against the actual current body, then close its physical/event fence. */
  const check = async (): Promise<void> => {
    if (checking || settled || !saved || expected === null) return;
    checking = true;
    try {
      do {
        const observed = generation;
        if (file.path !== path || app.vault.getFileByPath(path) !== file) { cancel(); return; }
        const cache = app.metadataCache.getFileCache(file);
        if (cache && relationshipMetadataPayload(cache.frontmatter ?? {}, fields) === expected) {
          if (expected === initialPayload && cache === beforeCache && file.stat.mtime === before.mtime && file.stat.size === before.size) { finish(); return; }
          const event = candidate;
          if (event && event.cache === cache) {
            const revision = { mtime: file.stat.mtime, size: file.stat.size };
            if (2 * event.data.length + 2 * file.stat.size + 2 * (initialPayload.length + expected.length) > SOURCE_DECODE_BUDGET_BYTES) {
              finish(pendingError()); return;
            }
            const currentBody = await app.vault.cachedRead(file);
            if (2 * (event.data.length + currentBody.length + initialPayload.length + (expected?.length ?? 0)) > SOURCE_DECODE_BUDGET_BYTES) {
              finish(pendingError()); return;
            }
            if (settled) return;
            if (observed === generation && event.data === currentBody && app.vault.getFileByPath(path) === file
              && file.path === path && app.metadataCache.getFileCache(file) === cache
              && file.stat.mtime === revision.mtime && file.stat.size === revision.size
              && relationshipMetadataPayload(cache.frontmatter ?? {}, fields) === expected) { finish(); return; }
          }
        }
        if (observed === generation) return;
      } while (!settled);
    } catch { finish(pendingError()); }
    finally { checking = false; }
  };
  refs.push(["metadata", app.metadataCache.on("changed", (changed, data, cache) => {
    if (changed !== file || changed.path !== path) return;
    if (2 * (data.length + initialPayload.length + (expected?.length ?? 0)) > SOURCE_DECODE_BUDGET_BYTES) {
      finish(saved ? pendingError() : new Error("decode-budget")); return;
    }
    candidate = { data, cache }; generation++; void check();
  })]);
  refs.push(["vault", app.vault.on("delete", deleted => { if (deleted === file) cancel(); })]);
  refs.push(["vault", app.vault.on("rename", renamed => { if (renamed === file) cancel(); })]);
  try {
    await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
      if (settled || file.path !== path || app.vault.getFileByPath(path) !== file || lifetime.current?.() === false) {
        throw new Error(lifetime.preparingMessage?.() ?? "cancelled");
      }
      mutate(frontmatter);
      expected = relationshipMetadataPayload(frontmatter, fields);
      if (4 * file.stat.size + 2 * (initialPayload.length + expected.length) > SOURCE_DECODE_BUDGET_BYTES) throw new Error("decode-budget");
    });
    saved = true;
    if (!settled) {
      timer = window.setTimeout(() => { if (!settled) { lifetime.pending(); noticeReported = true; } }, 1200);
      void check();
    }
    await completion;
  } catch (error) {
    const failure = saved && !(error instanceof SavedRelationshipPendingError)
      ? pendingError() : error instanceof Error ? error : new Error(String(error));
    finish(failure); throw failure;
  }
}
