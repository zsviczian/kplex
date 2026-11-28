/** Read-only publication content adapter. Markdown-it parses inert syntax and the Vault resolves local targets. */
import type {MarkdownIt, StateInline, Token} from "markdown-it";
import {getFrontMatterInfo, parseLinktext, type App, type CachedMetadata, type TFile} from "obsidian";
import {parseBodyMetadataCore} from "../../core/parser/metadata";
import {isPublicationId, isPublicationPath} from "../../core/plex/publication";
import {PUBLICATION_CONTENT_MAX_CHARS, publicationExternalLink, publicationFragment, publicationNodeLink, sanitizePublicationContent} from "../../ui/features/publicationContent";
import {markdownBuffersMatchSaved} from "./embeddedMarkdownLeaf";
import {renderPublicationDrawing, reviewPublicationDrawing} from "./publishDrawing";

const maximumSource = 2 * 1024 * 1024;
const maximumMedia = 32 * 1024 * 1024;
const maximumText = 64 * 1024 * 1024;
const maximumEmbedDepth = 5;
const maximumReferences = 200_000;
const raster = /^(?:png|jpg|jpeg|gif|webp|avif)$/;
const audio = /^(?:mp3|ogg|wav)$/;
const video = /^(?:mp4|webm)$/;
type WarningCode = "excluded" | "unresolved" | "remote-media" | "unsupported" | "cycle" | "fragment" | "drawing-unsupported" | "asset-metadata";
export type PublicationContentWarning = Readonly<{source: string; target?: string; code: WarningCode; blocking?: boolean}>;
export type PublicationAssetCandidate = Readonly<{path: string; bytes: number; retainsMetadata: boolean}>;
export type CapturedPublicationContent = Readonly<{
  notes: ReadonlyMap<string, {html: string; text: string}>;
  assets: readonly {path: string; bytes: Uint8Array<ArrayBuffer>; sourcePath: string}[];
  warnings: readonly PublicationContentWarning[];
  isCurrent: () => boolean;
}>;
type Input = Readonly<{app: App; notes: ReadonlyMap<string, string>; current: () => boolean; signal?: AbortSignal;
  yieldWork?: () => Promise<void>; mediaAllowed?: (file: TFile) => boolean}>;
type CaptureInput = Input & Readonly<{ownerDocument: Document; approvedMedia: ReadonlySet<string>; allowUnsupportedDrawings?: boolean}>;
type Reference = Readonly<{target: string; label: string; embed: boolean; wiki: boolean}>;
type Resolved = Readonly<{file: TFile; fragment: string}>;
type ReadNote = Readonly<{file: TFile; source: string; body: string; offset: number; cache: CachedMetadata; drawing: boolean}>;

export class PublicationContentError extends Error {
  /** Keep diagnostics local to the author and leave public copy to the caller. */
  constructor(readonly reason: "stale" | "limit" | "drawing-unsupported" | "media-invalid" | "dirty", readonly path?: string) { super(reason); }
}

/** Mark Obsidian references in the ordinary Markdown inline stream, respecting fenced/code syntax. */
function wikiReference(state: StateInline, silent: boolean): boolean {
  const from = state.pos, embed = state.src.startsWith("![[", from), start = from + (embed ? 3 : 2);
  if (!embed && !state.src.startsWith("[[", from)) return false;
  // Inspect only the grammar's maximum reference width. An unmatched repeated opener cannot
  // send this rule repeatedly scanning the remaining body.
  const local = state.src.slice(start, Math.min(start + 2048, state.posMax));
  const end = local.indexOf("]]");
  if (end < 1 || /[\r\n[]/.test(local.slice(0, end))) return false;
  const value = local.slice(0, end), separator = value.indexOf("|");
  const target = (separator < 0 ? value : value.slice(0, separator)).trim();
  if (!target) return false;
  if (!silent) {
    const token = state.push("publication_reference", "", 0);
    const suffix = separator < 0 ? "" : value.slice(separator + 1).trim();
    token.meta = {target, label: embed && /^\d+(?:x\d+)?$/.test(suffix) ? "" : suffix, embed, wiki: true} satisfies Reference;
  }
  state.pos = start + end + 2;
  return true;
}

/** Create the converter only for an explicitly opened publication workflow. */
async function markdownConverter(): Promise<MarkdownIt> {
  const {default: Markdown} = await import("markdown-it");
  // Tokenize raw HTML so it can be elided rather than exported as visible attribute text.
  const parser = new Markdown({html: true, xhtmlOut: true, linkify: false, typographer: false, maxNesting: 40});
  parser.inline.ruler.before("link", "publication_reference", wikiReference);
  // Links are parsed before they are reviewed and replaced. A rejected scheme must not be
  // rendered back as the original Markdown literal containing a private destination.
  parser.validateLink = () => true;
  parser.normalizeLink = input => input;
  parser.renderer.rules.publication_reference = (tokens, index) => tokens[index].content;
  parser.renderer.rules.html_inline = () => "";
  parser.renderer.rules.html_block = () => "";
  return parser;
}

/** Encode user-authored text in generated XHTML without introducing raw markup. */
function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replace(/[\p{Cc}\ufffe\uffff]/gu, value => ["\t", "\n", "\r"].includes(value) ? value : "");
}

/** Use the canonical metadata grammar and omit private inline fields and Obsidian comments. */
function publicBody(body: string): string {
  const {inlineFieldOccurrences} = parseBodyMetadataCore(body);
  let visible = "", cursor = 0;
  for (const {start, end} of inlineFieldOccurrences.sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (start < cursor) continue;
    visible += body.slice(cursor, start);
    cursor = end;
  }
  visible += body.slice(cursor);
  // A missing closing marker still denotes text hidden in Obsidian. Retire it to EOF.
  return visible.replace(/%%[\s\S]*?(?:%%|$)/g, "");
}

/** Classify only local, explicitly supported media containers. SVG input from arbitrary files is excluded. */
function assetExtension(file: TFile): string | null {
  const extension = file.extension.toLowerCase();
  return raster.test(extension) || audio.test(extension) || video.test(extension) || extension === "pdf" ? extension : null;
}

/** Report containers whose approved bytes retain authored or embedded metadata. */
function retainsMetadata(extension: string): boolean { return extension !== "png"; }

/** Read actual binary magic before labeling a downloaded resource as media. */
function supportedBinary(bytes: Uint8Array<ArrayBuffer>, extension: string): boolean {
  const ascii = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (bytes.length < 12) return false;
  if (extension === "png") return bytes[0] === 137 && ascii(1, 7) === "PNG\r\n\x1a\n";
  if (extension === "jpg" || extension === "jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (extension === "gif") return /^GIF8[79]a$/.test(ascii(0, 6));
  if (extension === "webp") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
  if (extension === "wav") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE";
  if (extension === "avif" || extension === "mp4") return ascii(4, 4) === "ftyp";
  if (extension === "ogg") return ascii(0, 4) === "OggS";
  if (extension === "webm") return bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163;
  if (extension === "mp3") return ascii(0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224);
  return extension === "pdf" && ascii(0, 5) === "%PDF-";
}

/** Keep visual PNG chunks and discard arbitrary text, EXIF, profiles and trailing bytes. */
function cleanPng(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const chunks: Uint8Array<ArrayBuffer>[] = [bytes.subarray(0, 8)];
  const known = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "sRGB", "gAMA", "cHRM", "acTL", "fcTL", "fdAT"]);
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8, pixels = false, ended = false;
  while (offset + 12 <= bytes.length) {
    const length = data.getUint32(offset), next = offset + length + 12;
    if (next > bytes.length) break;
    const kind = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (offset === 8 && (kind !== "IHDR" || length !== 13 || !data.getUint32(16) || !data.getUint32(20)
      || data.getUint32(16) * data.getUint32(20) > 36_000_000)) break;
    if (known.has(kind)) chunks.push(bytes.subarray(offset, next));
    if (kind === "IDAT") pixels = true;
    if (kind === "IEND") { ended = length === 0; break; }
    offset = next;
  }
  if (!pixels || !ended) throw new PublicationContentError("media-invalid");
  const result = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let written = 0;
  for (const chunk of chunks) { result.set(chunk, written); written += chunk.length; }
  return result;
}

/** Use exact saved identities for each content read and never structurally broaden note membership. */
class ContentCapture {
  readonly warnings: PublicationContentWarning[] = [];
  readonly files = new Map<string, {file: TFile; mtime: number; size: number}>();
  private readonly warningKeys = new Set<string>();
  private readonly readNotes = new Map<string, ReadNote>();
  private loadedChars = 0;
  private references = 0;
  private steps = 0;

  /** Own transient parsing and reference work for one preview or capture. */
  constructor(readonly input: Input, private readonly parser: MarkdownIt) {}

  /** Let author cancellation and native metadata events run during large bounded selections. */
  checkpoint(path: string, interval: number): Promise<void> | null {
    if (++this.steps % interval || !this.input.yieldWork) return null;
    return this.input.yieldWork().then(() => this.current(path));
  }

  /** Fence abort and publication revision before and after foreign asynchronous work. */
  current(path?: string): void {
    this.input.signal?.throwIfAborted();
    if (!this.input.current()) throw new PublicationContentError("stale", path);
    if (!path) return;
    const stamp = this.files.get(path);
    if (stamp && (this.input.app.vault.getFileByPath(path) !== stamp.file || stamp.file.path !== path
      || stamp.file.stat.mtime !== stamp.mtime || stamp.file.stat.size !== stamp.size)) throw new PublicationContentError("stale", path);
  }

  /** Retain tracked file IDs only while the preview/capture is in progress. */
  observe(file: TFile): void {
    if (!this.files.has(file.path)) this.files.set(file.path, {file, mtime: file.stat.mtime, size: file.stat.size});
    this.current(file.path);
  }

  /** Deduplicate only local author-facing diagnostics. */
  warn(source: string, code: WarningCode, target?: string, blocking?: boolean): void {
    const key = JSON.stringify([source, code, target]);
    if (this.warningKeys.has(key)) return;
    this.warningKeys.add(key);
    this.warnings.push({source, target, code, blocking});
  }

  /** Resolve written targets through the native context and current exact Vault identities. */
  resolve(note: ReadNote, ref: Reference): Resolved | null {
    if (++this.references > maximumReferences) throw new PublicationContentError("limit", note.file.path);
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\\)/i.test(ref.target)) {
      if (ref.embed) this.warn(note.file.path, "remote-media");
      return null;
    }
    const split = parseLinktext(ref.target);
    let path = split.path;
    if (!ref.wiki) {
      try { path = decodeURIComponent(path); } catch { this.warn(note.file.path, "unresolved"); return null; }
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(path) || /[\p{Cc}\\]/u.test(path)) return null;
    const file = path ? this.input.app.metadataCache.getFirstLinkpathDest(path, note.file.path) : note.file;
    if (!file || this.input.app.vault.getFileByPath(file.path) !== file) {
      this.warn(note.file.path, "unresolved", ref.target); return null;
    }
    return {file, fragment: split.subpath};
  }

  /** Read only selected Markdown and detect dirty buffers without committing them. */
  async note(path: string): Promise<ReadNote> {
    this.current(path);
    const existing = this.readNotes.get(path);
    if (existing) return existing;
    const file = this.input.app.vault.getFileByPath(path);
    if (!this.input.notes.has(path) || !file || file.extension !== "md") throw new PublicationContentError("stale", path);
    this.observe(file);
    if (file.stat.size > maximumSource) throw new PublicationContentError("limit", path);
    const cache = this.input.app.metadataCache.getFileCache(file);
    if (!cache) throw new PublicationContentError("stale", path);
    const source = await this.input.app.vault.read(file);
    this.current(path);
    if (!markdownBuffersMatchSaved(this.input.app, file, source)) throw new PublicationContentError("dirty", path);
    this.loadedChars += source.length;
    if (source.length > maximumSource || this.loadedChars > maximumText) throw new PublicationContentError("limit", path);
    const frontmatter = getFrontMatterInfo(source);
    if (!frontmatter.exists && /^\uFEFF?---\r?\n/.test(source)) throw new PublicationContentError("stale", path);
    const drawing = file.path.toLowerCase().endsWith(".excalidraw.md") || Boolean(Reflect.getOwnPropertyDescriptor(cache.frontmatter ?? {}, "excalidraw-plugin"));
    const note = {file, source, body: source.slice(frontmatter.contentStart), offset: frontmatter.contentStart, cache, drawing};
    this.readNotes.set(path, note);
    return note;
  }

  /** Walk the actual Markdown token tree instead of scanning arbitrary text or code. */
  referencesIn(body: string): readonly Reference[] {
    return this.parser.parse(publicBody(body), {}).flatMap(token => (token.children ?? []).flatMap(child => this.reference(child) ?? []));
  }

  /** Map just reference-bearing tokens to a narrow native resolver input. */
  private reference(token: Token): Reference | null {
    if (token.type === "publication_reference") return token.meta as Reference;
    if (token.type === "link_open") return {target: String(token.attrGet("href") ?? ""), label: "", embed: false, wiki: false};
    if (token.type === "image") return {target: String(token.attrGet("src") ?? ""), label: token.content, embed: true, wiki: false};
    return null;
  }

  /** Match heading and block snapshots using native cached source ranges. */
  private section(note: ReadNote, subpath: string): string | null {
    if (!subpath) return note.body;
    const canonical = publicationFragment(subpath);
    const start = Math.max(0, note.offset);
    if (canonical.startsWith("b-")) {
      const block = Object.entries(note.cache.blocks ?? {}).find(([id]) => publicationFragment(`^${id}`) === canonical)?.[1];
      return block ? note.source.slice(Math.max(start, block.position.start.offset), block.position.end.offset) : null;
    }
    const headings = note.cache.headings ?? [], index = headings.findIndex(heading => publicationFragment(heading.heading) === canonical);
    if (index < 0) return null;
    const heading = headings[index], next = headings.slice(index + 1).find(other => other.level <= heading.level);
    return note.source.slice(Math.max(start, heading.position.start.offset), next?.position.start.offset);
  }

  /** Apply a selected reference, with exact asset or UUID membership preceding all emitted output. */
  private async resolveMarkup(note: ReadNote, ref: Reference, stack: readonly string[], useAsset: AssetFor, drawingFor: DrawingFor): Promise<{inner: string; href?: string}> {
    this.current(note.file.path);
    const external = publicationExternalLink(ref.target);
    if (external && !ref.embed) return {inner: escape(ref.label), href: external};
    const hit = this.resolve(note, ref);
    if (!hit) return {inner: escape(ref.label)};
    const path = hit.file.path, id = this.input.notes.get(path);
    if (id) {
      const fragment = publicationFragment(hit.fragment), href = publicationNodeLink(id, fragment);
      if (!ref.embed) return {inner: escape(ref.label || hit.file.basename), href};
      if (stack.includes(path) || stack.length >= maximumEmbedDepth) {
        this.warn(note.file.path, "cycle", path); return {inner: escape(ref.label)};
      }
      const nested = await this.note(path);
      if (nested.drawing) return {inner: `<figure>${await drawingFor(nested)}</figure>`};
      const selected = this.section(nested, hit.fragment);
      if (selected === null) { this.warn(note.file.path, "fragment", path); return {inner: escape(ref.label)}; }
      const content = await this.renderMarkdown(nested, selected, [...stack, path], useAsset, drawingFor);
      return {inner: `<section>${content}</section>`};
    }
    const extension = assetExtension(hit.file);
    const asset = extension && await useAsset(hit.file, extension);
    if (asset && extension) {
      const src = `./${asset}`, label = escape(ref.label);
      if (!ref.embed || extension === "pdf") return {inner: label || escape(extension.toUpperCase()), href: src};
      if (raster.test(extension)) return {inner: `<img src="${src}" alt="${label}" />`};
      if (audio.test(extension)) return {inner: `<audio src="${src}">${label}</audio>`};
      return {inner: `<video src="${src}">${label}</video>`};
    }
    this.warn(note.file.path, extension ? "excluded" : hit.file.extension === "md" ? "excluded" : "unsupported", path);
    return {inner: escape(ref.label)};
  }

  /** Build bounded XHTML, using the original Markdown renderer only after every target is decided. */
  async renderMarkdown(note: ReadNote, body: string, stack: readonly string[], useAsset: AssetFor, drawingFor: DrawingFor): Promise<string> {
    const tokens = this.parser.parse(publicBody(body), {});
    let generated = 0;
    for (let row = 0; row < tokens.length; row++) {
      const token = tokens[row], children = token.children;
      if (token.type === "heading_open" && tokens[row + 1]?.type === "inline") {
        const fragment = publicationFragment(tokens[row + 1].content);
        if (fragment) token.attrSet("id", fragment);
      }
      if (!children) continue;
      const last = children.at(-1);
      const block = last?.type === "text" && /\s\^([-\w]+)\s*$/.exec(last.content);
      if (block && last && tokens[row - 1]?.type === "paragraph_open") {
        const fragment = publicationFragment(`^${block[1]}`);
        if (fragment) tokens[row - 1].attrSet("id", fragment);
        last.content = last.content.slice(0, block.index);
      }
      const tagStack: {tag: string; omitLabel: boolean}[] = [];
      for (const child of children) {
        const ref = this.reference(child);
        if (child.type === "link_close") { child.tag = tagStack.pop()?.tag ?? "span"; continue; }
        if (tagStack.at(-1)?.omitLabel) { child.content = ""; continue; }
        if (!ref) continue;
        const markup = await this.resolveMarkup(note, ref, stack, useAsset, drawingFor);
        const pause = this.checkpoint(note.file.path, 128);
        if (pause) await pause;
        generated += markup.inner.length + (markup.href?.length ?? 0);
        if (generated > PUBLICATION_CONTENT_MAX_CHARS) throw new PublicationContentError("limit", note.file.path);
        if (child.type === "link_open") {
          child.attrs = [];
          if (markup.href) child.attrSet("href", markup.href);
          child.tag = markup.href ? "a" : "span";
          tagStack.push({tag: child.tag, omitLabel: !markup.href && child.markup === "autolink"});
        } else {
          child.type = "publication_reference";
          child.content = markup.href ? `<a href="${escape(markup.href)}">${markup.inner}</a>` : markup.inner;
        }
      }
    }
    for (let row = 0; row < tokens.length; row++) {
      const token = tokens[row], inline = tokens[row + 2];
      if (token.type !== "blockquote_open" || inline?.type !== "inline") continue;
      const marker = /^\[!([\w-]{1,32})\][+-]?(?:\s|$)/.exec(inline.content);
      if (marker) {
        token.attrSet("data-callout", marker[1].toLowerCase());
        const first = inline.children?.[0];
        if (first?.type === "text" && first.content.startsWith(marker[0])) first.content = first.content.slice(marker[0].length);
      }
    }
    return this.parser.renderer.render(tokens, this.parser.options, {});
  }

  /** Verify every saved file again after the last awaited export operation. */
  finish(): void { for (const path of this.files.keys()) this.current(path); this.current(); }
}

type AssetFor = (file: TFile, extension: string) => Promise<string | null>;
type DrawingFor = (note: ReadNote) => Promise<string>;

/** Review discovered asset paths without exporting bytes or modifying notes. */
export async function inspectPublicationContent(input: Input): Promise<{assets: readonly PublicationAssetCandidate[]; warnings: readonly PublicationContentWarning[]}> {
  const work = new ContentCapture(input, await markdownConverter()), assets = new Map<string, PublicationAssetCandidate>();
  for (const path of input.notes.keys()) {
    const note = await work.note(path);
    const pause = work.checkpoint(path, 16);
    if (pause) await pause;
    if (note.drawing) {
      if (!reviewPublicationDrawing(input.app, note.file, note.source)) work.warn(path, "drawing-unsupported", undefined, true);
      continue;
    }
    for (const reference of work.referencesIn(note.body)) {
      const pause = work.checkpoint(path, 128);
      if (pause) await pause;
      if (!reference.embed && publicationExternalLink(reference.target)) continue;
      const hit = work.resolve(note, reference);
      if (!hit || input.notes.has(hit.file.path)) continue;
      const extension = assetExtension(hit.file);
      if (!extension) { work.warn(path, hit.file.extension === "md" ? "excluded" : "unsupported", hit.file.path); continue; }
      if (input.mediaAllowed && !input.mediaAllowed(hit.file)) { work.warn(path, "excluded", hit.file.path); continue; }
      if (hit.file.stat.size > maximumMedia) { work.warn(path, "unsupported", hit.file.path); continue; }
      work.observe(hit.file);
      assets.set(hit.file.path, {path: hit.file.path, bytes: hit.file.stat.size, retainsMetadata: retainsMetadata(extension)});
      if (retainsMetadata(extension)) work.warn(path, "asset-metadata", hit.file.path);
    }
  }
  work.finish();
  return {assets: [...assets.values()].sort((a, b) => a.path.localeCompare(b.path)), warnings: work.warnings};
}

/** Convert approved content into detached HTML and content-addressed media, without any host writes. */
export async function capturePublicationContent(input: CaptureInput): Promise<CapturedPublicationContent> {
  const work = new ContentCapture(input, await markdownConverter()), owner = input.ownerDocument.defaultView;
  if (!owner) throw new PublicationContentError("stale");
  const bySource = new Map<string, string>(), assets = new Map<string, CapturedPublicationContent["assets"][number]>();
  const notes = new Map<string, {html: string; text: string}>(), drawingCache = new Map<string, string>();
  const nodeIds = new Set(input.notes.values());
  if (nodeIds.size !== input.notes.size || ![...nodeIds].every(isPublicationId)) throw new PublicationContentError("stale");
  let assetSize = 0, totalHtml = 0;
  const serializer = new owner.XMLSerializer();

  /** Stage a normalized derivative rather than an original private name or encoded SVG scene. */
  const stageAsset = async (sourcePath: string, extension: string, bytes: Uint8Array<ArrayBuffer>): Promise<string> => {
    const hash = [...new Uint8Array(await owner.crypto.subtle.digest("SHA-256", bytes))].map(byte => byte.toString(16).padStart(2, "0")).join("");
    work.current(sourcePath);
    const path = `assets/${hash}.${extension === "jpeg" ? "jpg" : extension}`;
    if (!isPublicationPath(path)) throw new PublicationContentError("media-invalid", sourcePath);
    bySource.set(sourcePath, path);
    if (!assets.has(path)) { assets.set(path, {path, bytes, sourcePath}); assetSize += bytes.byteLength; }
    if (assetSize > 192 * 1024 * 1024) throw new PublicationContentError("limit", sourcePath);
    return path;
  };

  /** Resolve only exact preapproved media and deduplicate by staged public bytes. */
  const useAsset: AssetFor = async (file, extension) => {
    const sourcePath = file.path;
    if (!input.approvedMedia.has(sourcePath) || input.mediaAllowed && !input.mediaAllowed(file)) return null;
    const previous = bySource.get(sourcePath);
    if (previous) return previous;
    work.observe(file);
    if (file.stat.size > maximumMedia) throw new PublicationContentError("limit", sourcePath);
    const raw = new Uint8Array(await input.app.vault.readBinary(file));
    work.current(sourcePath);
    if (raw.length > maximumMedia || !supportedBinary(raw, extension)) throw new PublicationContentError("media-invalid", sourcePath);
    return stageAsset(sourcePath, extension, extension === "png" ? cleanPng(raw) : raw);
  };
  /** Cache conversion of an explicitly selected vector drawing for this publication only. */
  const drawingFor: DrawingFor = async note => {
    const path = note.file.path, previous = drawingCache.get(path);
    if (previous !== undefined) return previous;
    try {
      const svg = await renderPublicationDrawing({app: input.app, owner, file: note.file, source: note.source, notes: input.notes,
        current: () => work.current(path)});
      work.current(path);
      const clean = sanitizePublicationContent(svg, input.ownerDocument, {nodeIds, assetPaths: new Set()});
      const root = clean.firstElementChild;
      if (!root || root.localName !== "svg") throw new PublicationContentError("drawing-unsupported", path);
      // A standalone asset lives one directory below index.html. The inline copy stays rooted at
      // the publication URL and is scoped independently when a browser mounts the same diagram.
      const standalone = root.cloneNode(true) as Element;
      for (const anchor of Array.from(standalone.querySelectorAll("a[href^='?node=']"))) {
        anchor.setAttribute("href", `../${anchor.getAttribute("href") ?? ""}`);
      }
      await stageAsset(path, "svg", new TextEncoder().encode(serializer.serializeToString(standalone)));
      const inline = serializer.serializeToString(root);
      drawingCache.set(path, inline);
      return inline;
    } catch (error) {
      work.current(path);
      if (error instanceof PublicationContentError && error.reason !== "drawing-unsupported") throw error;
      if (!input.allowUnsupportedDrawings) throw new PublicationContentError("drawing-unsupported", path);
      work.warn(path, "drawing-unsupported", undefined, true);
      drawingCache.set(path, "");
      return "";
    }
  };
  for (const [path, id] of input.notes) {
    const note = await work.note(path);
    const pause = work.checkpoint(path, 16);
    if (pause) await pause;
    const raw = note.drawing ? await drawingFor(note) : await work.renderMarkdown(note, note.body, [path], useAsset, drawingFor);
    work.current(path);
    const document = sanitizePublicationContent(raw, input.ownerDocument, {nodeIds, assetPaths: new Set(assets.keys())});
    const html = Array.from(document.childNodes, child => serializer.serializeToString(child)).join("");
    const text = Array.from(document.childNodes, child => child.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
    totalHtml += html.length;
    if (totalHtml > maximumText) throw new PublicationContentError("limit", path);
    notes.set(id, {html, text});
  }
  work.finish();
  const stamps = Array.from(work.files), {app, signal, current} = input;
  return {notes, assets: [...assets.values()], warnings: work.warnings, isCurrent: () => {
    return !signal?.aborted && current() && stamps.every(([path, stamp]) => app.vault.getFileByPath(path) === stamp.file
      && stamp.file.path === path && stamp.file.stat.mtime === stamp.mtime && stamp.file.stat.size === stamp.size);
  }};
}
