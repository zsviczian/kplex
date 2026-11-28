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
const activeExports = new WeakMap<DrawingBridge, Promise<string>>();
const maxVectorSource = 1024 * 1024;
const maxCompressedScene = 32_768;
const svgNamespace = "http://www.w3.org/2000/svg";

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
function preflightVector(source: string, decompress: (data: string) => string): void {
  if (source.length > maxVectorSource) throw new Error("Drawing exceeds publication bounds");
  // The companion processes drawings in raw or parsed text mode before its isolated file loader.
  // Refuse transclusions, on-load settings, embedded file maps and custom font/glyph loads first.
  const normalized = source.replace(/\r\n?/g, "\n");
  const fence = /^#{1,2} Drawing[ \t]*\n[ \t\n]*```(json|compressed-json)[ \t]*\n([\s\S]+?)\n```(?=\n|$)/gm;
  const matches = [...normalized.matchAll(fence)], match = matches[0];
  const chapter = [...normalized.matchAll(/^#{1,2} Drawing[ \t]*(?:\n|$)/gm)];
  if (matches.length !== 1 || !match || chapter.length !== 1 || chapter[0].index !== match.index
    || /^\s*excalidraw-onload-script\s*:/im.test(normalized)
    || /!\[\[|!\[[^\]\n]*\]\(/.test(normalized.slice(0, match.index))) throw new Error("Unsupported drawing data");
  const embedded = /^#{1,2} (?:Embedded Files|Markdown Images)[ \t]*\n([^#]*)(?=^#{1,2} |$)/gm;
  for (const entry of normalized.slice(0, match.index).matchAll(embedded)) {
    if (entry[1].replace(/[\s%]/g, "")) throw new Error("Drawing embeds additional sources");
  }
  const encoded = match[2].trim();
  if (match[1] === "compressed-json" && (encoded.length > maxCompressedScene || !/^[a-z0-9+/=\r\n]+$/i.test(encoded))) throw new Error("Drawing exceeds compression bounds");
  const json = match[1] === "json" ? encoded : decompress(encoded);
  if (!json || json.length > maxVectorSource) throw new Error("Drawing exceeds publication bounds");
  const scene = JSON.parse(json) as {elements?: unknown; files?: unknown};
  const vectorTypes = new Set(["rectangle", "diamond", "ellipse", "line", "arrow", "freedraw", "text", "frame", "magicframe"]);
  if (scene.files && typeof scene.files === "object" && Object.keys(scene.files).length) throw new Error("Drawing contains embedded files");
  if (!Array.isArray(scene.elements) || scene.elements.length > 2_000) throw new Error("Drawing exceeds publication element bounds");
  for (const unknownElement of scene.elements as unknown[]) {
    if (!unknownElement || typeof unknownElement !== "object" || !("type" in unknownElement) || typeof unknownElement.type !== "string"
      || !vectorTypes.has(unknownElement.type)) throw new Error("Drawing contains non-vector elements");
    if (unknownElement.type === "text" && (!("fontFamily" in unknownElement) || typeof unknownElement.fontFamily !== "number"
      || ![1, 2, 3, 5, 6, 7, 8, 9, 10].includes(unknownElement.fontFamily))) throw new Error("Drawing contains an unbundled font");
  }
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u.test(`${normalized.slice(0, match.index)}${json}`)) {
    throw new Error("Drawing requires lazily loaded CJK font subsets");
  }
}

/** Check the local companion and saved vector template without opening a drawing or leasing any hook. */
export function reviewPublicationDrawing(app: App, file: TFile, source: string): boolean {
  try {
    const bridge = bridgeFor(window);
    const decompress = bridge?.decompressFromBase64;
    if (!bridge || !decompress || !canAdmitTemplate(app, file)) return false;
    preflightVector(source, data => Reflect.apply(decompress, bridge, [data]));
    return true;
  } catch { return false; }
}

/** Recover only the fragment from a proven companion-resolved link. */
function linkFragment(source: string): string {
  const target = /^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/.exec(source)?.[1]
    ?? /^\[[^\]]*\]\(([^)]+)\)$/.exec(source)?.[1] ?? source;
  return publicationFragment(parseLinktext(target).subpath);
}

/** Use the companion global hook only for this one exact host file, restoring its previous descriptor. */
async function exportVector(input: SourceInput, bridge: DrawingBridge): Promise<string> {
  input.current();
  if (!canAdmitTemplate(input.app, input.file)) throw new Error("Drawing template unavailable");
  const api = bridge.getAPI?.();
  if (!api || api === bridge || typeof api.createSVG !== "function" || typeof api.getEmbeddedFilesLoader !== "function"
    || typeof api.decompressFromBase64 !== "function" || typeof api.destroy !== "function") throw new Error("Drawing bridge unavailable");
  const descriptor = Object.getOwnPropertyDescriptor(bridge, "onUpdateElementLinkForExportHook");
  const old = bridge.onUpdateElementLinkForExportHook;
  let activeHook: ExportLinkHook | undefined;
  let loader: DrawingLoader | undefined;
  try {
    preflightVector(input.source, data => api.decompressFromBase64(data));
    if (descriptor && !descriptor.configurable) throw new Error("Drawing link hook cannot be leased");
    loader = api.getEmbeddedFilesLoader(false);
    if (!loader || typeof loader.loadSceneFiles !== "function" || typeof loader.terminate !== "boolean") throw new Error("Drawing loader unavailable");
    // This loader instance belongs only to this export. No image reads, plugin Markdown
    // postprocessors, network paths, data images, PDF loaders or nested drawing renders run.
    loader.loadSceneFiles = async () => { input.current(); };
    activeHook = data => {
      if (data.hostFile !== input.file) return old ? Reflect.apply(old, bridge, [data]) : data.obsidianLink;
      const linked = data.linkedFile;
      const id = linked && input.app.vault.getFileByPath(linked.path) === linked && input.notes.get(linked.path);
      return id ? publicationNodeLink(id, linkFragment(data.originalLink)) : "about:blank";
    };
    Object.defineProperty(bridge, "onUpdateElementLinkForExportHook", {value: activeHook, configurable: true, writable: true, enumerable: descriptor?.enumerable ?? true});
    input.current();
    const svg = await api.createSVG(input.file.path, false, {withBackground: false, withTheme: false, isMask: false, skipInliningFonts: true}, loader, "light", 12, true, true);
    input.current();
    if (bridge.onUpdateElementLinkForExportHook !== activeHook || svg?.namespaceURI !== svgNamespace || svg.localName !== "svg"
      || svg.querySelector("foreignObject,image,iframe")) throw new Error("Drawing output is unavailable or includes active content");
    // Return SVG only. The publication consumer reconstructs safe geometry/links and rejects
    // script, metadata, generated font CSS, namespaces and unapproved attributes independently.
    return new input.owner.XMLSerializer().serializeToString(svg);
  } finally {
    try {
      if (activeHook && bridge.onUpdateElementLinkForExportHook === activeHook) {
        if (descriptor) Object.defineProperty(bridge, "onUpdateElementLinkForExportHook", descriptor);
        else Reflect.deleteProperty(bridge, "onUpdateElementLinkForExportHook");
      }
      if (loader) { loader.terminate = true; loader.emptyPDFDocsMap?.(); }
    } finally {
      api.destroy();
    }
  }
}

/** Export one serialized vector drawing through isolated Excalidraw Automate. */
export async function renderPublicationDrawing(input: SourceInput): Promise<string> {
  const bridge = bridgeFor(input.owner);
  if (!bridge) throw new Error("Compatible Excalidraw unavailable");
  const predecessor = activeExports.get(bridge);
  const current = (predecessor ? predecessor.catch(() => "") : Promise.resolve("")).then(() => exportVector(input, bridge));
  activeExports.set(bridge, current);
  try { return await current; }
  finally { if (activeExports.get(bridge) === current) activeExports.delete(bridge); }
}
