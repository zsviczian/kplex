/** Computed-style snapshots for isolated SVG graphics. No stylesheet is injected into Obsidian.
 * Shared declarations are deduplicated in the serialized image to bound large-canvas memory;
 * native DOM/CSS still owns all painting and layout. */
import {CANVAS_IMAGE_LIMITS} from "../../core/plex/export/imageDimensions";
import {CanvasImageError, type ImageExportLifetime} from "./imageExportLifetime";

export const CANVAS_GRAPHIC_CSS = ".kp-export-root{position:absolute;left:0;top:0;right:auto;bottom:auto;overflow:visible;background:transparent;transform:none;transform-origin:0 0}.kp-export-stage{position:relative;overflow:hidden;background-color:var(--kp-export-background);background-image:var(--kp-export-background-image)}.kp-export-camera{position:absolute;left:0;top:0;transform-origin:0 0}.kp-export-missing{visibility:hidden}";

export type ImageWarnings = {media: number; fonts: number; scroll: number};
const GEOMETRY = /^(?:left|right|top|bottom|inset.*|width|height|min-.*|max-.*|inline-size|block-size|margin.*|padding.*|transform.*|z-index|order|flex-basis|x|y|d|cx|cy|r|rx|ry)$/;

/** Capture deduplicated browser-resolved rules, including actual pseudo-element paint. */
export class CanvasImageStyles {
  readonly fonts = new Set<string>();
  private readonly classes = new Map<string, string>();
  private readonly rules: string[] = [];
  private readonly pseudos = new Map<string, string>();
  private characters = 0;
  /** Resolve URLs only against this exact source document. */
  constructor(private readonly document: Document, private readonly owner: Window, private readonly maximumCharacters: number = CANVAS_IMAGE_LIMITS.characters) {}
  /** Prevent absolute same-document SVG references from pointing back into the live application. */
  private localReferences(value: string): string {
    return value.replace(/url\(["']?([^)'" ]+)["']?\)/g, /** Only references to this document become local SVG fragments. */ (original: string, url: string) => {
      try {const parsed = new URL(url, this.document.location.href);return parsed.hash && parsed.href.split("#")[0] === this.document.location.href.split("#")[0] ? `url(${parsed.hash})` : original;}
      catch {return original;}
    });
  }
  /** Copy geometry inline and deduplicate resolved paint; source CSS variables cannot leak into the image. */
  copy(source: Element, target: Element & {style: CSSStyleDeclaration}): CSSStyleDeclaration {
    const computed = this.owner.getComputedStyle(source), declarations: string[] = [];
    target.removeAttribute("style");
    for (let index = 0; index < computed.length; index++) {
      const key = computed.item(index);
      if (key.startsWith("--") || key.startsWith("animation") || key.startsWith("transition")) continue;
      const value = this.localReferences(computed.getPropertyValue(key));
      if (GEOMETRY.test(key)) target.style.setProperty(key, value);else declarations.push(`${key}:${value};`);
    }
    for (const family of computed.fontFamily.split(",")) this.fonts.add(family.trim().replace(/^["']|["']$/g, ""));
    const text = declarations.join("");let name = this.classes.get(text);
    if (!name) {name = `kp-export-${this.classes.size}`;this.classes.set(text, name);this.append(`.${name}{${text}}`);}
    target.classList.add(name);
    if (source.namespaceURI === "http://www.w3.org/1999/xhtml") for (const pseudo of ["::before", "::after"]) {
      const style = this.owner.getComputedStyle(source, pseudo);
      if (style.content === "none" || style.content === "normal" || style.display === "none") continue;
      const values: string[] = [];
      for (let index = 0; index < style.length; index++) {
        const key = style.item(index);
        if (!key.startsWith("--") && !key.startsWith("animation") && !key.startsWith("transition")) values.push(`${key}:${this.localReferences(style.getPropertyValue(key))};`);
      }
      // Identical parent declarations can still have different pseudo paint.
      const body = values.join(""), key = pseudo + body;let own = this.pseudos.get(key);
      if (!own) {own = `kp-export-p${this.pseudos.size}`;this.pseudos.set(key, own);this.append(`.${own}${pseudo}{${body}}`);}
      target.classList.add(own);
    }
    return computed;
  }
  /** Bound the entire stylesheet while it is being constructed, before allocating a raster. */
  private append(rule: string): void {this.characters += rule.length;if (this.characters > this.maximumCharacters) throw new CanvasImageError("limit");this.rules.push(rule);}
  /** Return image-local declarations; no CSS is installed in the owning application. */
  serialize(): string {return this.rules.join("\n");}
}

/** Read a local cached resource with a hard byte budget and cancellable stream ownership. */
async function localFontData(url: string, lifetime: ImageExportLifetime, maximum: number): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol === "data:") {if (url.length > maximum * 1.5) throw new CanvasImageError("limit");return url;}
  if (parsed.protocol !== "app:" && parsed.protocol !== "blob:") throw new CanvasImageError("capture");
  const response = await lifetime.wait(lifetime.owner.fetch(url, {signal: lifetime.controller.signal}));
  if (!response.ok || !response.body) throw new CanvasImageError("capture");
  const reader = response.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = [];let size = 0;
  try {
    for (;;) {const item = await lifetime.wait(reader.read());if (item.done) break;size += item.value.byteLength;if (size > maximum) throw new CanvasImageError("limit");chunks.push(new Uint8Array(item.value));}
  } finally {await reader.cancel().catch(/** Closed streams need no further cleanup. */ () => undefined);reader.releaseLock();}
  const blob = new lifetime.owner.Blob(chunks, {type: response.headers.get("content-type") ?? "application/octet-stream"});
  return lifetime.wait(new Promise<string>(/** FileReader keeps binary conversion browser/mobile safe. */ (resolve, reject) => {
    const file = new lifetime.owner.FileReader(), signal = lifetime.controller.signal;let settled = false;
    /** Release the reader's cancellation forwarding on every native completion. */
    const finish = (reason?: "retired" | "capture"): void => {
      if (settled) return;settled = true;signal.removeEventListener("abort", abort);
      file.onload = null;file.onerror = null;file.onabort = null;
      if (reason || typeof file.result !== "string") reject(new CanvasImageError(reason ?? "capture"));else resolve(file.result);
    };
    /** A retired capture does not leave binary conversion running in a closed window. */
    const abort = (): void => {file.abort();finish("retired");};
    file.onload = /** The reader produces one bounded data URL. */ () => finish();
    file.onerror = /** Hide native resource details from product feedback. */ () => finish("capture");
    file.onabort = /** Cancellation shares the same idempotent release. */ () => finish("retired");signal.addEventListener("abort", abort, {once: true});
    try {if (signal.aborted) abort();else file.readAsDataURL(blob);}catch {finish("capture");}
  }));
}

/** Inline only actually used local font rules; external destinations are never fetched. */
export async function canvasImageFonts(document: Document, used: ReadonlySet<string>, lifetime: ImageExportLifetime, warnings: ImageWarnings): Promise<string> {
  const faces: CSSFontFaceRule[] = [];let visited = 0;
  /** Inspect browser-parsed CSSOM rather than implementing a CSS parser. */
  const scan = (rules: CSSRuleList): void => {
    for (let index = 0; index < rules.length; index++) {
      if (++visited > 30_000) {warnings.fonts++;return;}
      const rule = rules.item(index);if (!rule) continue;
      const FontRule = document.defaultView?.CSSFontFaceRule;
      if (FontRule && rule instanceof FontRule) {
        const face = rule;
        if (used.has(face.style.getPropertyValue("font-family").replace(/^["']|["']$/g, ""))) faces.push(face);
      } else if ("cssRules" in rule) scan((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {lifetime.check();try {scan(sheet.cssRules);}catch {warnings.fonts++;}}
  if (faces.length > 24) throw new CanvasImageError("limit");
  const cache = new Map<string, string>(), output: string[] = [];let characters = 0;
  for (const face of faces) {
    lifetime.check();let css = face.cssText, available = true;
    for (const match of css.matchAll(/url\(["']?([^)'" ]+)["']?\)/g)) {
      try {
        const url = new URL(match[1], face.parentStyleSheet?.href ?? document.location.href).href;
        let data = cache.get(url);if (!data) {data = await localFontData(url, lifetime, 3_000_000);cache.set(url, data);}
        css = css.replace(match[0], `url("${data}")`);
      } catch (error) {lifetime.check();if (error instanceof CanvasImageError && error.reason === "limit") throw error;warnings.fonts++;available = false;break;}
    }
    if (available) {characters += css.length;if (characters > 6_000_000) throw new CanvasImageError("limit");output.push(css);}
    await lifetime.yield();
  }
  // Document-only FontFace buffers cannot be extracted. Disclose these instead of silently fetching a substitute.
  document.fonts.forEach(/** A missing CSSOM source cannot be recovered from a loaded FontFace buffer. */ face => {if (face.status === "loaded" && used.has(face.family.replace(/^["']|["']$/g, ""))
    && !faces.some(/** Known browser-parsed rules account for their own loaded families. */ rule => rule.style.getPropertyValue("font-family").replace(/^["']|["']$/g, "") === face.family.replace(/^["']|["']$/g, ""))) warnings.fonts++;});
  return output.join("\n");
}
