/**
 * Explicit placeholder destination changes over approved native reference occurrences. The shared
 * parser supplies literal spans, MetadataCache approves source occurrences, and Vault.process owns
 * exact-text persistence. Plans are byte/source bounded and ephemeral; no index policy, automatic
 * link-update preference, broad note scan or background scheduling is introduced here.
 */
import { normalizePath, type App, type Reference, type ReferenceCache, type TFile } from "obsidian";
import { iterateInternalLinkTokens, type InternalLinkToken } from "../../core/parser/metadata";
import { extractLinksFromValue } from "../../index/fieldParser";
import { SOURCE_DECODE_BUDGET_BYTES } from "../../index/SourceFacts";

type Replacement = Readonly<{ start: number; end: number; kind: "wiki" | "markdown" }>;
type RelocationSource = Readonly<{ file: TFile; path: string; mtime: number; size: number; text: string; replacements: readonly Replacement[] }>;
/** One modal-local continuation; fulfilled native writes retire only their own source authority. */
export type PlaceholderRelocation = {
  readonly oldPath: string;
  readonly sources: readonly RelocationSource[];
  readonly completed: Set<TFile>;
  target: Readonly<{ file: TFile; path: string }> | null;
};

/** Mirror the established host resolver's URI/subpath handling without inventing a basename match. */
function coordinate(raw: string): string {
  let value = raw.trim();
  try { value = decodeURIComponent(value); } catch { /* Existing host resolution also retains undecodable spellings. */ }
  return normalizePath(value.split("#", 1)[0]).replace(/\.md$/i, "");
}

/** Encode literal vault components for Markdown targets and quoted YAML without changing slash structure. */
function encodeReferencePath(path: string): string {
  return path.split("/").map(/** RFC 3986 also escapes delimiters left literal by encodeURIComponent. */ part =>
    encodeURIComponent(part).replace(/[!'()*]/g, /** Preserve the literal character through either link syntax and YAML quoting. */ character =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");
}

/** Emit the customary wiki form, falling back to encoded Markdown only when the current resolver round-trips it. */
export function placeholderReference(app: App, source: TFile, path: string, alias: string, unsupported: string): string {
  const label = alias.trim() || path.split("/").pop() || path;
  const escaped = label.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
  const reference = path.includes("]") || path.includes("[")
    ? `[${escaped}](${encodeReferencePath(path)})`
    : `[[${path}|${label}]]`;
  const targets = extractLinksFromValue(app, reference, source);
  if (targets.length !== 1 || coordinate(targets[0]) !== normalizePath(path).replace(/\.md$/i, "") || path.includes("#") || label.includes("]]")) throw new Error(unsupported);
  return reference;
}

/** Capture only references whose native target remains this exact unresolved coordinate. */
export async function capturePlaceholderRelocation(app: App, oldPath: string, knownSources: readonly TFile[], changed: string): Promise<PlaceholderRelocation> {
  if (knownSources.length > 256) throw new Error(changed);
  const wanted = coordinate(oldPath), candidates = new Map(knownSources.map(/** Known provenance narrows the source identities. */ file => [file.path, file] as const));
  const unresolved = app.metadataCache.unresolvedLinks;
  for (const sourcePath in unresolved) {
    const links = unresolved[sourcePath];
    let matches = false;
    for (const target in links) if (links[target] > 0 && coordinate(target) === wanted) { matches = true; break; }
    if (!matches) continue;
    const file = app.vault.getFileByPath(sourcePath);
    if (!file || file.extension !== "md") throw new Error(changed);
    candidates.set(sourcePath, file);
    if (candidates.size > 256) throw new Error(changed);
  }
  const sources: RelocationSource[] = [];
  let retained = 0;
  for (const [path, file] of candidates) {
    if (file.extension !== "md") throw new Error(changed);
    const cache = app.metadataCache.getFileCache(file), mtime = file.stat.mtime, size = file.stat.size;
    if (!cache || retained + 8 * size > SOURCE_DECODE_BUDGET_BYTES) throw new Error(changed);
    const text = await app.vault.cachedRead(file);
    retained += 8 * text.length + 512;
    if (retained > SOURCE_DECODE_BUDGET_BYTES || file.path !== path || file.stat.mtime !== mtime || file.stat.size !== size
      || app.vault.getFileByPath(path) !== file || app.metadataCache.getFileCache(file) !== cache) throw new Error(changed);
    const replacements = new Map<number, Replacement>();
    /** Native refs, not lexical resemblance in prose/code/comments, grant edit authority. */
    const matches = (reference: Reference): boolean => coordinate(reference.link) === wanted
      && app.metadataCache.getFirstLinkpathDest(reference.link.split("#", 1)[0], path) === null;
    /** Preserve the literal heading/block suffix while changing only its approved path substring. */
    const add = (token: InternalLinkToken, offset: number): void => {
      const literalHash = token.rawTarget.indexOf("#"), encodedHash = token.rawTarget.toLocaleLowerCase().indexOf("%23");
      const hash = literalHash < 0 ? encodedHash : encodedHash < 0 ? literalHash : Math.min(literalHash, encodedHash);
      const end = hash < 0 ? token.targetEnd : token.targetStart + hash;
      const replacement = { start: offset + token.targetStart, end: offset + end, kind: token.kind };
      const previous = replacements.get(replacement.start);
      if (previous && (previous.end !== replacement.end || previous.kind !== replacement.kind)) throw new Error(changed);
      if (!previous) { retained += 128; if (retained > SOURCE_DECODE_BUDGET_BYTES) throw new Error(changed); }
      replacements.set(replacement.start, replacement);
    };
    /** Native body/embed arrays approve one actual reference at a time without deprecated iteration APIs or copying the lists. */
    const approveBodyReference = (reference: ReferenceCache): void => {
      if (!matches(reference)) return;
      const start = reference.position.start.offset, end = reference.position.end.offset;
      if (text.slice(start, end) !== reference.original) throw new Error(changed);
      let approved: InternalLinkToken | null = null;
      for (const token of iterateInternalLinkTokens(reference.original)) {
        if (coordinate(token.rawTarget) !== wanted || !(token.start === 0 || token.start === 1 && reference.original.startsWith("!"))
          || token.end !== reference.original.length) continue;
        if (approved) throw new Error(changed);
        approved = token;
      }
      if (!approved) throw new Error(changed);
      add(approved, start);
    };
    for (const reference of cache.links ?? []) approveBodyReference(reference);
    for (const reference of cache.embeds ?? []) approveBodyReference(reference);
    const groups = new Map<string, number>();
    let frontmatterCount = 0;
    for (const reference of cache.frontmatterLinks ?? []) {
      if (!matches(reference)) continue;
      frontmatterCount++;
      if (!groups.has(reference.original)) { retained += 128 + 2 * reference.original.length; if (retained > SOURCE_DECODE_BUDGET_BYTES) throw new Error(changed); }
      groups.set(reference.original, (groups.get(reference.original) ?? 0) + 1);
    }
    if (frontmatterCount) {
      const position = cache.frontmatterPosition;
      if (!position) throw new Error(changed);
      const textPart = text.slice(position.start.offset, position.end.offset), observed = new Map<string, number>();
      for (const token of iterateInternalLinkTokens(textPart)) {
        if (coordinate(token.rawTarget) !== wanted) continue;
        const original = textPart.slice(token.start, token.end), count = (observed.get(original) ?? 0) + 1, expected = groups.get(original);
        if (expected === undefined || count > expected) throw new Error(changed);
        observed.set(original, count); add(token, position.start.offset);
      }
      for (const [original, count] of groups) if (observed.get(original) !== count) throw new Error(changed);
    }
    if (!replacements.size) throw new Error(changed);
    const ordered = [...replacements.values()].sort(/** Nonoverlapping right-to-left patches retain every unrelated byte. */ (a, b) => b.start - a.start);
    for (let index = 1; index < ordered.length; index++) if (ordered[index].end > ordered[index - 1].start) throw new Error(changed);
    sources.push({ file, path, mtime, size, text, replacements: ordered });
  }
  return { oldPath, sources, completed: new Set(), target: null };
}

/** Recheck native identities and exact bytes inside each atomic Vault callback; earlier durable sources survive later failures. */
export async function applyPlaceholderRelocation(app: App, plan: PlaceholderRelocation, created: TFile, current: () => boolean, changed: string): Promise<void> {
  plan.target ??= { file: created, path: created.path };
  const { path: targetPath, file: target } = plan.target;
  /** Accepted references remain bound to the exact destination across every asynchronous native boundary. */
  const assertTargetCurrent = (): void => {
    if (!current() || created !== target || targetPath === plan.oldPath || created.path !== targetPath || app.vault.getFileByPath(targetPath) !== created) throw new Error(changed);
  };
  assertTargetCurrent();
  for (const source of plan.sources) {
    // This source's disk operation was already accepted. Skipping it preserves both our committed
    // reference and any later user edits; stale source evidence cannot authorize a second write.
    if (plan.completed.has(source.file)) continue;
    await app.vault.process(source.file, /** Only the captured old coordinate may change; aliases, subpaths and all surrounding text remain exact. */ text => {
      if (!current() || targetPath === plan.oldPath || created.path !== targetPath || app.vault.getFileByPath(targetPath) !== created
        || source.file.path !== source.path || app.vault.getFileByPath(source.path) !== source.file
        || source.file.stat.mtime !== source.mtime || source.file.stat.size !== source.size || text !== source.text) throw new Error(changed);
      const pieces: string[] = [];
      const encodedTarget = encodeReferencePath(targetPath);
      let cursor = text.length;
      for (const item of source.replacements) {
        pieces.push(text.slice(item.end, cursor), encodedTarget);
        cursor = item.start;
      }
      pieces.push(text.slice(0, cursor));
      return pieces.reverse().join("");
    });
    plan.completed.add(source.file);
    assertTargetCurrent();
  }
  assertTargetCurrent();
}
