/** Read-only adapter for the companion's documented SVG export and link rewrite capabilities. */
import {FileView, parseLinktext, type App, type TFile} from "obsidian";
import {publicationFragment, publicationNodeLink} from "../../ui/features/publicationContent";

type LinkContext = {originalLink: string; obsidianLink: string; linkedFile: TFile | null; hostFile: TFile};
type ExportLinkHook = (data: LinkContext) => string;
type DrawingLoader = {loadSceneFiles: (args: unknown) => Promise<void>; terminate: boolean; emptyPDFDocsMap?: () => void};
type DrawingAPI = {
  createSVG(path: string, includeFonts: boolean, settings: object, loader: DrawingLoader, theme: string,
    padding: number, rewriteObsidianLinks: boolean, includeInternalLinks: boolean): Promise<SVGSVGElement | null>;
  getEmbeddedFilesLoader(isDark: boolean): DrawingLoader;
  decompressFromBase64(data: string): string;
  destroy(): void;
};
type DrawingBridge = {
  getAPI?: () => DrawingAPI | null;
  verifyMinimumPluginVersion?: (minimum: string) => boolean;
  decompressFromBase64?: (data: string) => string;
  onUpdateElementLinkForExportHook?: ExportLinkHook;
};
type DrawingWindow = Window & typeof window & {ExcalidrawAutomate?: DrawingBridge};
type SourceInput = Readonly<{app: App; owner: Window & typeof window; file: TFile; source: string;
  notes: ReadonlyMap<string, string>; current: () => void}>;
const activeExports = new WeakMap<DrawingBridge, Promise<SVGSVGElement>>();
const maxVectorSource = 1024 * 1024;
const maxCompressedScene = 32_768;
const svgNamespace = "http://www.w3.org/2000/svg";

export type PublicationDrawingDiagnostic = Readonly<{
  phase: "review" | "export";
  stage: "bridge" | "template" | "format" | "dependencies" | "size" | "compression" | "scene" | "element" | "font"
    | "hook" | "loader" | "render" | "svg" | "sanitization" | "cleanup";
}>;

export class PublicationDrawingError extends Error {
  /** Keep foreign exception details and drawing source out of local diagnostics. */
  constructor(readonly diagnostic: PublicationDrawingDiagnostic) { super(diagnostic.stage); }
}

/** Vector publication requires the version that supports dependency isolation and link rewriting. */
function bridgeFor(owner: Window): DrawingBridge | null {
  // Excalidraw installs its public gateway in the app window. A modal can be owned by a popout.
  const bridge = (window as DrawingWindow).ExcalidrawAutomate ?? (owner as DrawingWindow).ExcalidrawAutomate;
  if (!bridge?.getAPI || bridge.verifyMinimumPluginVersion?.("2.29.0") !== true) return null;
  return bridge;
}

/** Prevent drawing-template compatibility redirects and separate dirty drawing lifetimes. */
function canAdmitTemplate(app: App, file: TFile): boolean {
  if (file.extension !== "md" || /[#|\u005b\u005d\p{Cc}]/u.test(file.path)
    || app.metadataCache.getFirstLinkpathDest(file.path, "") !== file) return false;
  const legacyCompanion = app.vault.getFileByPath(`${file.path.slice(0, -3)}.excalidraw`);
  if (legacyCompanion && legacyCompanion.stat.mtime > file.stat.mtime) return false;
  let open = false;
  app.workspace.iterateAllLeaves(leaf => {
    const view = leaf.view;
    if (view instanceof FileView && view.file === file && view.getViewType() === "excalidraw") open = true;
  });
  return !open;
}

/** Inspect but never rebuild the scene. Allow bundled fonts and geometry-only drawing templates. */
function preflightVector(source: string, decompress: (data: string) => string, phase: PublicationDrawingDiagnostic["phase"]): void {
  /** Do not catch or surface companion error text, which can contain vault paths or source bytes. */
  const failure = (stage: PublicationDrawingDiagnostic["stage"]) => new PublicationDrawingError({phase, stage});
  if (source.length > maxVectorSource) throw failure("size");
  // The companion processes drawings in raw or parsed text mode before its isolated file loader.
  // Refuse transclusions, on-load settings, embedded file maps and custom font/glyph loads first.
  const normalized = source.replace(/\r\n?/g, "\n");
  const fence = /^#{1,2} Drawing[ \t]*\n[ \t\n]*```(json|compressed-json)[ \t]*\n([\s\S]+?)\n```(?=\n|$)/gm;
  const matches = [...normalized.matchAll(fence)], match = matches[0];
  const chapter = [...normalized.matchAll(/^#{1,2} Drawing[ \t]*(?:\n|$)/gm)];
  if (matches.length !== 1 || !match || chapter.length !== 1 || chapter[0].index !== match.index) throw failure("format");
  if (/^\s*excalidraw-onload-script\s*:/im.test(normalized)
    || /!\[\[|!\[[^\]\n]*\]\(/.test(normalized.slice(0, match.index))) throw failure("dependencies");
  const embedded = /^#{1,2} (?:Embedded Files|Markdown Images)[ \t]*\n([^#]*)(?=^#{1,2} |$)/gm;
  for (const entry of normalized.slice(0, match.index).matchAll(embedded)) {
    if (entry[1].replace(/[\s%]/g, "")) throw failure("dependencies");
  }
  const encoded = match[2].trim();
  if (match[1] === "compressed-json" && (encoded.length > maxCompressedScene || !/^[a-z0-9+/=\r\n]+$/i.test(encoded))) throw failure("compression");
  let json: string;
  try { json = match[1] === "json" ? encoded : decompress(encoded.replace(/[\r\n]/g, "")); }
  catch { throw failure("compression"); }
  if (!json || json.length > maxVectorSource) throw failure("size");
  let scene: {elements?: unknown; files?: unknown};
  try { scene = JSON.parse(json) as typeof scene; }
  catch { throw failure("scene"); }
  if (!scene || typeof scene !== "object") throw failure("scene");
  const vectorTypes = new Set(["rectangle", "diamond", "ellipse", "line", "arrow", "freedraw", "text", "frame", "magicframe"]);
  if (scene.files && typeof scene.files === "object" && Object.keys(scene.files).length) throw failure("dependencies");
  if (!Array.isArray(scene.elements) || scene.elements.length > 2_000) throw failure("element");
  for (const unknownElement of scene.elements as unknown[]) {
    if (!unknownElement || typeof unknownElement !== "object" || !("type" in unknownElement) || typeof unknownElement.type !== "string"
      || !vectorTypes.has(unknownElement.type)) throw failure("element");
    if (unknownElement.type === "text" && (!("fontFamily" in unknownElement) || typeof unknownElement.fontFamily !== "number"
      || ![1, 2, 3, 5, 6, 7, 8, 9, 10].includes(unknownElement.fontFamily))) throw failure("font");
  }
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u.test(`${normalized.slice(0, match.index)}${json}`)) {
    throw failure("font");
  }
}

/** Check the local companion and saved vector template without opening a drawing or leasing any hook. */
export function reviewPublicationDrawing(app: App, file: TFile, source: string): PublicationDrawingDiagnostic | null {
  let stage: PublicationDrawingDiagnostic["stage"] = "bridge";
  try {
    const bridge = bridgeFor(window);
    const decompress = bridge?.decompressFromBase64;
    if (!bridge || !decompress) return {phase: "review", stage};
    stage = "template";
    if (!canAdmitTemplate(app, file)) return {phase: "review", stage};
    preflightVector(source, data => Reflect.apply(decompress, bridge, [data]), "review");
    return null;
  } catch (error) { return error instanceof PublicationDrawingError ? error.diagnostic : {phase: "review", stage}; }
}

/** Recover only the fragment from a proven companion-resolved link. */
function linkFragment(source: string): string {
  const target = /^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/.exec(source)?.[1]
    ?? /^\[[^\]]*\]\(([^)]+)\)$/.exec(source)?.[1] ?? source;
  return publicationFragment(parseLinktext(target).subpath);
}

/** Restore the unrelated hook, retire this loader and destroy the local API on every exit. */
function releaseDrawing(bridge: DrawingBridge, descriptor: PropertyDescriptor | undefined, hook: ExportLinkHook | undefined,
  loader: DrawingLoader | undefined, api: DrawingAPI): void {
  let failed = false;
  try {
    if (hook && bridge.onUpdateElementLinkForExportHook === hook) {
      if (descriptor) Object.defineProperty(bridge, "onUpdateElementLinkForExportHook", descriptor);
      else Reflect.deleteProperty(bridge, "onUpdateElementLinkForExportHook");
    }
  } catch { failed = true; }
  try { if (loader) { loader.terminate = true; loader.emptyPDFDocsMap?.(); } }
  catch { failed = true; }
  try { api.destroy(); }
  catch { failed = true; }
  if (failed) throw new PublicationDrawingError({phase: "export", stage: "cleanup"});
}

/** Use the companion global hook only for this one exact host file, restoring its previous descriptor. */
async function exportVector(input: SourceInput, bridge: DrawingBridge): Promise<SVGSVGElement> {
  input.current();
  if (!canAdmitTemplate(input.app, input.file)) throw new PublicationDrawingError({phase: "export", stage: "template"});
  let api: DrawingAPI | null | undefined;
  try { api = bridge.getAPI?.(); } catch { throw new PublicationDrawingError({phase: "export", stage: "bridge"}); }
  if (!api || api === bridge || typeof api.createSVG !== "function" || typeof api.getEmbeddedFilesLoader !== "function"
    || typeof api.decompressFromBase64 !== "function" || typeof api.destroy !== "function") throw new PublicationDrawingError({phase: "export", stage: "bridge"});
  const scopedApi = api;
  const descriptor = Object.getOwnPropertyDescriptor(bridge, "onUpdateElementLinkForExportHook");
  const old = bridge.onUpdateElementLinkForExportHook;
  let activeHook: ExportLinkHook | undefined;
  let loader: DrawingLoader | undefined;
  let stage: PublicationDrawingDiagnostic["stage"] = "hook";
  try {
    preflightVector(input.source, data => scopedApi.decompressFromBase64(data), "export");
    if (descriptor && !descriptor.configurable) throw new PublicationDrawingError({phase: "export", stage});
    stage = "loader";
    loader = scopedApi.getEmbeddedFilesLoader(false);
    if (!loader || typeof loader.loadSceneFiles !== "function" || typeof loader.terminate !== "boolean") throw new PublicationDrawingError({phase: "export", stage});
    // This loader instance belongs only to this export. No image reads, plugin Markdown
    // postprocessors, network paths, data images, PDF loaders or nested drawing renders run.
    loader.loadSceneFiles = async () => { input.current(); };
    activeHook = data => {
      if (data.hostFile !== input.file) return old ? Reflect.apply(old, bridge, [data]) : data.obsidianLink;
      const linked = data.linkedFile;
      const id = linked && input.app.vault.getFileByPath(linked.path) === linked && input.notes.get(linked.path);
      return id ? publicationNodeLink(id, linkFragment(data.originalLink)) : "about:blank";
    };
    stage = "hook";
    Object.defineProperty(bridge, "onUpdateElementLinkForExportHook", {value: activeHook, configurable: true, writable: true, enumerable: descriptor?.enumerable ?? true});
    input.current();
    stage = "render";
    const svg = await scopedApi.createSVG(input.file.path, false, {withBackground: false, withTheme: false, isMask: false, skipInliningFonts: true}, loader, "light", 12, true, true);
    input.current();
    if (bridge.onUpdateElementLinkForExportHook !== activeHook) throw new PublicationDrawingError({phase: "export", stage: "hook"});
    if (svg?.namespaceURI !== svgNamespace || svg.localName !== "svg" || svg.querySelector("foreignObject,image,iframe")) {
      throw new PublicationDrawingError({phase: "export", stage: "svg"});
    }
    // Copy the SVG before serializing. Companion-created namespaces and metadata are not part
    // of the transfer, and the consumer independently reconstructs only safe geometry and links.
    return svg;
  } catch (error) {
    throw error instanceof PublicationDrawingError ? error : new PublicationDrawingError({phase: "export", stage});
  } finally {
    releaseDrawing(bridge, descriptor, activeHook, loader, scopedApi);
  }
}

/** Export one serialized vector drawing through isolated Excalidraw Automate. */
export async function renderPublicationDrawing(input: SourceInput): Promise<SVGSVGElement> {
  const bridge = bridgeFor(input.owner);
  if (!bridge) throw new PublicationDrawingError({phase: "export", stage: "bridge"});
  const predecessor = activeExports.get(bridge);
  const current = (predecessor ? predecessor.catch(() => undefined) : Promise.resolve()).then(() => exportVector(input, bridge));
  activeExports.set(bridge, current);
  try { return await current; }
  finally { if (activeExports.get(bridge) === current) activeExports.delete(bridge); }
}
