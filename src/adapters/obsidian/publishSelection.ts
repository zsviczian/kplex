/** User-triggered, native publication inventory and single-use UUID consent. It owns no graph work. */
import {getAllTags, getFrontMatterInfo, type App, type CachedMetadata, type TAbstractFile, type TFile} from "obsidian";
import {normalizeFieldName} from "../../core/contracts/fieldName";
import {nodeId, type GraphNodeView} from "../../core/graph/model";
import {GraphPredicateEngine} from "../../core/plex/predicate";
import {
  MAX_PUBLISH_INVENTORY, parsePublishProfile, publishUuidFields, reviewPublishSelection,
  type PublishProfile, type PublishSelection, type PublishSelectionNote, type PublishUuidChange,
} from "../../application/publish/selection";
import {markdownBuffersMatchSaved} from "./embeddedMarkdownLeaf";
import {createLegacyPropertyProvider} from "./predicateContracts";
import {SavedRelationshipPendingError, writeRelationshipMetadata} from "./relationshipMetadataWrite";

/** The established metadata convergence owner shares an eight-MiB decode budget across reads. */
const MAX_PUBLISH_UUID_SOURCE_BYTES = 1_500_000;
const DEFAULT_METADATA_SETTLE_MS = 12_000;

export type PublishSelectionPreview = PublishSelection & Readonly<{reviewId: string | null}>;
export type NativePublishSelection = Readonly<{
  selection: PublishSelection;
  files: readonly TFile[];
  isCurrent(): boolean;
  fileIsCurrent(file: TFile): boolean;
}>;
export type PublishUuidReceipt = Readonly<{
  path: string;
  state: "saved" | "saved-unverified" | "failed" | "stale" | "dirty" | "unavailable";
}>;
export type PublishUuidOutcome = Readonly<{
  state: "complete" | "partial" | "blocked" | "cancelled" | "stale";
  receipts: readonly PublishUuidReceipt[];
  remaining: number;
}>;
export type PublishSelectionOptions = Readonly<{
  current?(): boolean;
  createId?(): string;
  yield?(): Promise<void>;
  metadataSettleMs?: number;
}>;

type NativeNote = Readonly<{file: TFile; path: string; mtime: number; size: number; cache: CachedMetadata}>;
type WriteClaim = Readonly<{note: NativeNote; change: PublishUuidChange; body: string; otherFields: string}>;
type ReviewLifetime = {
  stale: boolean;
  claim: WriteClaim | null;
  release(): void;
  cancelWrite?: () => void;
};
type ActiveReview = Readonly<{
  id: string;
  selection: PublishSelection;
  notes: ReadonlyMap<string, NativeNote>;
  lifetime: ReviewLifetime;
  current(): boolean;
}>;

/** The optional known native signal can report pending indexing, never certify missing caches. */
function nativeMetadataPending(app: App): boolean {
  const metadata = app.metadataCache as typeof app.metadataCache & {isCacheClean?(): unknown};
  try { return metadata.isCacheClean?.() === false; }
  catch { return true; }
}

/** Observe the exact native file object and its document revision, including same-path replacements. */
function nativeNoteCurrent(app: App, note: NativeNote): boolean {
  const {file, path, mtime, size, cache} = note;
  return file.path === path && file.stat.size === size && file.stat.mtime === mtime
    && app.vault.getFileByPath(path) === file && app.metadataCache.getFileCache(file) === cache;
}

/** Only note/file predicates use this native metadata snapshot. It confers no graph authority. */
function candidateFor(note: NativeNote): GraphNodeView {
  const {file, path, mtime, size, cache} = note;
  return {
    id: nodeId(path), path, mtime, name: file.basename, kind: "document", resolution: "resolved",
    url: null, aliases: [], get tags() {return getAllTags(cache) ?? [];}, noteType: null,
    primaryStyleTag: null, styleTags: [], maxLabelLength: 0,
    file: {name: file.name, path, extension: file.extension, basename: file.basename, mtime, ctime: file.stat.ctime, size},
  };
}

/** Preserve the missing-vs-value distinction and require the reviewed physical key. */
function reviewedPropertyMatches(frontmatter: Readonly<Record<string, unknown>>, change: PublishUuidChange): boolean {
  const fields = publishUuidFields(frontmatter, change.property), [prior] = fields;
  if (!prior) return change.before === undefined;
  if (fields.length !== 1 || prior.property !== change.property || change.before === undefined) return false;
  if (Array.isArray(change.before)) {
    const value = prior.value, expected = change.before;
    return Array.isArray(value) && value.length === expected.length && expected.every(
      /** Preserve the exact scalar type and list order approved in the review. */ (item, index) => Object.is(item, value[index]));
  }
  return Object.is(prior.value, change.before);
}

/** Keep the positional cache bookkeeping out of a before/after comparison of authored values. */
function otherFrontmatter(cache: CachedMetadata, property: string): string {
  const frontmatter: Readonly<Record<string, unknown>> = cache.frontmatter ?? {};
  const key = normalizeFieldName(property);
  return JSON.stringify(Object.keys(frontmatter).sort().filter(
    /** Ignore only the approved key and the host's nonauthored position field. */ name => name !== "position" && normalizeFieldName(name) !== key)
    .map(/** Compare deterministic ordering of unrelated authored metadata entries. */ name => [name, frontmatter[name]]));
}

/** Frontmatter formatting belongs to FileManager. The body after its exact native boundary is opaque. */
function bodyAfterFrontmatter(saved: string): string {
  return saved.slice(getFrontMatterInfo(saved).contentStart).replace(/\r\n/g, "\n");
}

/** Observe all changes relevant to selection/duplicate detection for exactly one active preview. */
function watchReview(app: App): ReviewLifetime {
  const lifetime: ReviewLifetime = {stale: false, claim: null, release: () => {}};
  /** Once stale, the current helper must settle with truthful persisted/pending status. */
  const invalidate = (): void => {
    if (lifetime.stale) return;
    lifetime.stale = true;
    lifetime.cancelWrite?.();
  };
  /** Only Markdown note contents can change the duplicate-ID inventory or a note/file rule. */
  const isMarkdown = (file: TAbstractFile): boolean => "extension" in file && file.extension === "md";
  /** Folder topology changes can invalidate previously captured recursive selection. */
  const topology = (file: TAbstractFile): void => {
    if (!("extension" in file) || isMarkdown(file)) invalidate();
  };
  const refs = [app.vault.on("create", topology), app.vault.on("rename", topology), app.vault.on("delete", topology),
    app.vault.on("modify", /** The UUID claim is only issued inside the guarded native write callback. */ file => {
      if (isMarkdown(file) && lifetime.claim?.note.file !== file) invalidate();
    })];
  const metadataRef = app.metadataCache.on("changed", /** An event for the claimed file must still carry only the reviewed change. */ (file, text, cache) => {
    if (lifetime.stale || !isMarkdown(file)) return;
    const claim = lifetime.claim;
    if (!claim || claim.note.file !== file || file.path !== claim.change.path) { invalidate(); return; }
    try {
      const fields = publishUuidFields(cache.frontmatter ?? {}, claim.change.property), [value] = fields;
      if (fields.length === 1 && value.property === claim.change.property && value.value === claim.change.after
        && claim.body === bodyAfterFrontmatter(text) && claim.otherFields === otherFrontmatter(cache, claim.change.property)) return;
    } catch { /* A malformed observation cannot validate the consented write. */ }
    invalidate();
  });
  lifetime.release = /** Retire by exact event ref regardless of how the scope ended. */ () => {
    invalidate();
    for (const ref of refs) app.vault.offref(ref);
    app.metadataCache.offref(metadataRef);
  };
  return lifetime;
}

/** A failed preview supplies a local reason, without retaining write or export capabilities. */
function blockedPreview(profile: PublishProfile, code: "metadata-unavailable" | "stale" | "limit", path?: string): PublishSelectionPreview {
  return {profile, selectedPaths: [], identities: [], issues: [{code, ...(path ? {path} : {})}], changes: [], reviewId: null};
}

/** One host lifetime owns at most one preview or serial write batch. Reconciliation must complete
 * before the next write. Reopening the workflow captures a fresh scope and fresh ID decisions. */
export function createPublishSelection(app: App, options: PublishSelectionOptions = {}) {
  let disposed = false, applying = false, sequence = 0, active: ActiveReview | null = null;
  let observation: ReviewLifetime | null = null;
  /** Both the feature owner and this concrete session can retire work. */
  const live = (): boolean => !disposed && options.current?.() !== false;
  const yieldWork = options.yield ?? (/** Let native Vault events run between bounded metadata batches. */ (): Promise<void> =>
    new Promise(/** Coordination uses the host window and settles even after a popout closes. */ resolve => window.setTimeout(resolve, 0)));
  const createId = options.createId ?? (/** Only a fresh, opaque supported ID enters a new proposal. */ (): string => window.crypto.randomUUID());

  /** Release observers immediately when a profile or owning modal retires. */
  function invalidate(): void {
    const previous = observation;
    observation = null; active = null;
    previous?.release();
  }

  /** Inventory all note UUIDs through native metadata, never through reads of unrelated note bodies. */
  async function preview(value: PublishProfile, current: () => boolean = () => true): Promise<PublishSelectionPreview> {
    const profile = parsePublishProfile(value);
    if (!live() || !current() || applying) return blockedPreview(profile, "stale");
    invalidate();
    const lifetime = watchReview(app);
    observation = lifetime;
    /** During admission no newer preview or out-of-band metadata change may take ownership. */
    const isCurrent = (): boolean => observation === lifetime && !lifetime.stale && live() && current();
    try {
      if (nativeMetadataPending(app)) return blockedPreview(profile, "metadata-unavailable");
      const markdown = app.vault.getMarkdownFiles();
      if (markdown.length > MAX_PUBLISH_INVENTORY) return blockedPreview(profile, "limit");
      const notes: PublishSelectionNote[] = [], observed = new Map<string, NativeNote>();
      for (let i = 0; i < markdown.length; i++) {
        if (i && i % 128 === 0) await yieldWork();
        if (!isCurrent()) return blockedPreview(profile, "stale");
        const file = markdown[i], path = file.path, cache = app.metadataCache.getFileCache(file);
        if (!cache || observed.has(path) || app.vault.getFileByPath(path) !== file)
          return blockedPreview(profile, "metadata-unavailable", path);
        const note = {file, path, cache, mtime: file.stat.mtime, size: file.stat.size};
        observed.set(path, note);
        notes.push({path, candidate: candidateFor(note), uuidFields: publishUuidFields(cache.frontmatter ?? {}, profile.uuidProperty)});
      }
      const selection = reviewPublishSelection(profile, {
        notes, folderExists: /** Root is an explicit folder rule; other paths are exact native coordinates. */ path => path === "/" || Boolean(app.vault.getFolderByPath(path)),
        predicates: new GraphPredicateEngine(createLegacyPropertyProvider(app, isCurrent,
          /** Bind availability-aware note reads to this inventory's exact file identity. */ node => node.path ? observed.get(node.path)?.file : undefined)),
      }, createId);
      if (!isCurrent() || nativeMetadataPending(app)) return blockedPreview(profile, "stale");
      if (selection.issues.length) return {...selection, reviewId: null};
      const id = `publish-${++sequence}`;
      const selected = new Map<string, NativeNote>();
      for (const path of selection.selectedPaths) {
        const note = observed.get(path);
        if (!note || !nativeNoteCurrent(app, note)) return blockedPreview(profile, "stale", path);
        selected.set(path, note);
      }
      active = {id, selection, notes: selected, lifetime, current: isCurrent};
      // Callers can edit their displayed copy; it never modifies the stored consent plan.
      return {...structuredClone(selection), reviewId: id};
    } finally {
      if (observation === lifetime && active?.lifetime !== lifetime) invalidate();
    }
  }

  /** Export sees only exact selected incarnations with already-persisted unique UUIDs. */
  function capture(reviewId: string): NativePublishSelection | null {
    const review = active;
    if (!review || review.id !== reviewId || !review.current() || nativeMetadataPending(app) || review.selection.changes.length) return null;
    const notes = [...review.notes.values()];
    if (notes.some(/** Export may start only from the approved physical and metadata revisions. */ note => !nativeNoteCurrent(app, note))) return null;
    return {
      selection: structuredClone(review.selection), files: notes.map(/** Pass exact native objects only to the export adapter. */ note => note.file),
      isCurrent: /** A selected-content boundary can fail closed without rescanning all selected notes on each slice. */ () => review.current() && !nativeMetadataPending(app),
      fileIsCurrent: /** Recheck the individual object's complete stamp after awaiting a read. */ file => {
        const note = review.notes.get(file.path);
        return Boolean(note && note.file === file && review.current() && nativeNoteCurrent(app, note));
      },
    };
  }

  /** Check saved text and native buffer identity immediately before the FileManager callback. */
  async function writeId(review: ActiveReview, change: PublishUuidChange, current: () => boolean): Promise<PublishUuidReceipt> {
    const {path} = change, note = review.notes.get(path);
    /** Each attempted path has exactly one persisted, pending or refused outcome. */
    const result = (state: PublishUuidReceipt["state"]): PublishUuidReceipt => ({path, state});
    if (!note || !current() || !nativeNoteCurrent(app, note)) return result("stale");
    if (!Number.isFinite(note.size) || note.size < 0 || note.size > MAX_PUBLISH_UUID_SOURCE_BYTES) return result("unavailable");
    const {file} = note, lifetime = review.lifetime;
    let timer: number | undefined;
    try {
      const saved = await app.vault.read(file);
      if (!current() || !nativeNoteCurrent(app, note)) return result("stale");
      if (!markdownBuffersMatchSaved(app, file, saved, true)) return result("dirty");
      const body = bodyAfterFrontmatter(saved), otherFields = otherFrontmatter(note.cache, change.property);
      await writeRelationshipMetadata(app, file, new Set([normalizeFieldName(change.property)]), /** Change only the exact approved property and value. */ frontmatter => {
        if (!reviewedPropertyMatches(frontmatter, change)) throw new Error("stale-publish-uuid");
        // Own only its exact native persistence notifications; all other edits retire the review.
        lifetime.claim = {note, change, body, otherFields};
        Object.defineProperty(frontmatter, change.property, {value: change.after, enumerable: true, writable: true, configurable: true});
      }, {
        own: /** Keep existing metadata convergence observation within this batch's lifetime. */ cancel => {
          lifetime.cancelWrite = cancel;
          timer = window.setTimeout(cancel, options.metadataSettleMs ?? DEFAULT_METADATA_SETTLE_MS);
          return /** Retire the timer and observer hook in every terminal outcome. */ () => {
            lifetime.cancelWrite = undefined;
            if (timer !== undefined) window.clearTimeout(timer);
          };
        },
        pending: /** Progress belongs to the native publishing workflow, not relationship notifications. */ () => {},
        savedPendingMessage: /** Machine reason used only to map the per-file receipt. */ () => "publish-uuid-metadata-pending",
        current: /** The native awaited read can race another edit after our initial buffer check. */ () =>
          current() && nativeNoteCurrent(app, note) && markdownBuffersMatchSaved(app, file, saved, true),
        preparingMessage: /** A retired review cannot authorize a new write. */ () => "stale-publish-uuid",
      });
      return result("saved");
    } catch (error) {
      if (error instanceof SavedRelationshipPendingError) return result("saved-unverified");
      if (!current() || error instanceof Error && error.message === "stale-publish-uuid" || !nativeNoteCurrent(app, note)) return result("stale");
      return result("failed");
    } finally { lifetime.claim = null; }
  }

  /** Consume one explicitly confirmed plan. A partial result never rolls back or retries a native save. */
  async function applyIds(reviewId: string, confirm: boolean, current: () => boolean = () => true): Promise<PublishUuidOutcome> {
    const review = active, receipts: PublishUuidReceipt[] = [];
    if (!review || review.id !== reviewId || applying || !review.current()) return {state: "stale", receipts, remaining: 0};
    const {changes} = review.selection;
    if (!confirm || !changes.length) return {state: "blocked", receipts, remaining: changes.length};
    active = null; applying = true;
    /** The original profile review and explicit confirmation each fence all remaining writes. */
    const approved = (): boolean => review.current() && current();
    try {
      let state: PublishUuidOutcome["state"] = "complete";
      for (const change of changes) {
        if (!approved()) { state = receipts.length ? "partial" : current() ? "stale" : "cancelled"; break; }
        const receipt = await writeId(review, change, approved);
        receipts.push(receipt);
        if (receipt.state === "saved") continue;
        state = receipts.some(/** Preservation of any committed prefix makes this a partial outcome. */ item => item.state === "saved" || item.state === "saved-unverified") ? "partial" :
          receipt.state === "stale" ? "stale" : "blocked";
        break;
      }
      return {state, receipts, remaining: changes.length - receipts.length};
    } finally { applying = false; invalidate(); }
  }

  return {preview, capture, applyIds, invalidate,
    /** Complete or retire all owned callbacks when the publishing modal/plugin closes. */
    dispose(): void { disposed = true; invalidate(); }};
}
