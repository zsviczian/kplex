/** Detach the current HTML/SVG canvas for image export. No graph, renderer, source reader,
 * camera writer, native editor API or plugin singleton is accepted by this service. */
import {CANVAS_IMAGE_LIMITS} from "../../core/plex/export/imageDimensions";
import {CanvasImageStyles, canvasImageFonts, type ImageWarnings} from "./canvasImageStyles";
import {CanvasImageError, ImageExportLifetime, type ImageExportGuard} from "./imageExportLifetime";

type Box = Readonly<{x: number; y: number; width: number; height: number}>;
export type CanvasImageSnapshot = Readonly<{
  markup: string; css: string; fonts: string; compass?: Readonly<{markup: string; center: Readonly<{x: number; y: number}>}>;
  bounds: Box; viewport: Readonly<{width: number; height: number}>;
  camera: Readonly<{x: number; y: number; scale: number}>; background: Readonly<{color: string; image: string}>;
  warnings: Readonly<ImageWarnings>; elements: number;
}>;
export type CanvasImageCaptureOptions = ImageExportGuard & Readonly<{center?: HTMLElement | null; maximumElements?: number; maximumCharacters?: number}>;
const CROP = "[data-kplex-path], .kplex-view-region > rect, .kplex-view-region > path, .kplex-view-guide, .kplex-view-guide-caption, .kplex-edge-visible, .kplex-edge-label, .kplex-area-frame, .kplex-central-editor-overlay";
const OMIT = new Set(["script", "style", "iframe", "webview", "object", "embed", "audio", "video", "link", "meta", "base"]);

/** Intersect with actual internal scrolling/overflow clips; the outer camera viewport is deliberately excluded. */
function intersect(rect: Box, clip: Box): Box {
  const x = Math.max(rect.x, clip.x), y = Math.max(rect.y, clip.y);
  return {x, y, width: Math.max(0, Math.min(rect.x + rect.width, clip.x + clip.width) - x), height: Math.max(0, Math.min(rect.y + rect.height, clip.y + clip.height) - y)};
}

/** Copy decoded pixels only. Export never starts an image download or circumvents consent/CORS. */
function inlineBitmap(source: Element, clone: Element & {style: CSSStyleDeclaration}, fragment: DocumentFragment, scale: number, warnings: ImageWarnings): number {
  const tag = source.tagName.toLowerCase();if (tag !== "img" && tag !== "canvas") return 0;
  const image = source as HTMLImageElement | HTMLCanvasElement;
  const width = tag === "img" ? (image as HTMLImageElement).naturalWidth : (image as HTMLCanvasElement).width;
  const height = tag === "img" ? (image as HTMLImageElement).naturalHeight : (image as HTMLCanvasElement).height;
  if (!width || !height || tag === "img" && !(image as HTMLImageElement).complete) {warnings.media++;clone.classList.add("kp-export-missing");clone.removeAttribute("src");return 0;}
  const canvas = fragment.createEl("canvas");
  try {
    const rect = source.getBoundingClientRect(), ratio = Math.min(1, 1024 / width, 1024 / height, Math.max(1, rect.width / scale * 3) / width, Math.max(1, rect.height / scale * 3) / height);
    canvas.width = Math.max(1, Math.ceil(width * ratio));canvas.height = Math.max(1, Math.ceil(height * ratio));
    const context = canvas.getContext("2d");if (!context) throw new CanvasImageError("capture");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const src = canvas.toDataURL("image/png");
    if (tag === "img") {clone.setAttribute("src", src);clone.removeAttribute("srcset");clone.removeAttribute("loading");}
    else {
      const replacement = fragment.createEl("img");for (const attribute of Array.from(clone.attributes)) replacement.setAttribute(attribute.name, attribute.value);
      replacement.src = src;clone.replaceWith(replacement);
    }
    return src.length;
  } catch {warnings.media++;clone.classList.add("kp-export-missing");clone.removeAttribute("src");return 0;}
  finally {canvas.width = 0;canvas.height = 0;canvas.remove();}
}

/** Capture immutable serialized presentation and resource qualifications in bounded, cancellable batches. */
export async function captureCanvasImage(source: HTMLElement, options: CanvasImageCaptureOptions): Promise<CanvasImageSnapshot> {
  const document = source.ownerDocument, owner = document.defaultView;
  if (!owner || !source.isConnected) throw new CanvasImageError("retired");
  let changed = false;const theme = document.body.classList.contains("theme-dark");
  const observer = new owner.MutationObserver(/** Retire torn DOM snapshots instead of mixing two source presentations. */ () => {changed = true;});
  const lifetime = new ImageExportLifetime(owner, {signal: options.signal, current: /** A migrated root cannot borrow its old document's renderer. */ () => !changed && document.body.classList.contains("theme-dark") === theme && source.isConnected && source.ownerDocument === document && options.current()});
  const fragment = document.adoptNode(createFragment()), warnings: ImageWarnings = {media: 0, fonts: 0, scroll: 0};
  try {
    await lifetime.yield();
    const animations = source.getAnimations({subtree: true}).filter(/** Wait for finite geometry motion; do not finish or cancel the live animation. */ animation => animation.effect instanceof owner.KeyframeEffect
      && Number.isFinite(animation.effect.getTiming().iterations) && animation.effect.getKeyframes().some(/** Carets/spinners and paint-only effects cannot delay geometry capture. */ frame => ["transform", "left", "top", "width", "height"].some(key => key in frame)));
    if (animations.length) await lifetime.wait(Promise.allSettled(animations.map(/** A canceled live motion can settle normally without changing export ownership. */ animation => animation.finished)));
    observer.observe(source, {subtree: true, childList: true, attributes: true, characterData: true});
    lifetime.check();const cameraElement = source.querySelector<HTMLElement>(":scope > .kplex-camera");
    if (!cameraElement) throw new CanvasImageError("capture");
    const matrix = new owner.DOMMatrix(owner.getComputedStyle(cameraElement).transform), viewport = source.getBoundingClientRect();
    if (![matrix.a, matrix.d, matrix.e, matrix.f, viewport.width, viewport.height].every(Number.isFinite) || matrix.a <= 0 || Math.abs(matrix.a - matrix.d) > 0.00001 || matrix.b || matrix.c || !viewport.width || !viewport.height) throw new CanvasImageError("capture");
    const maximumCharacters = Math.min(options.maximumCharacters ?? CANVAS_IMAGE_LIMITS.characters, CANVAS_IMAGE_LIMITS.characters);
    const styles = new CanvasImageStyles(document, owner, maximumCharacters), root = source.cloneNode(false) as HTMLElement, computed = styles.copy(source, root);
    const background = {color: computed.backgroundColor, image: computed.backgroundImage};
    if (background.image.includes("url(")) {warnings.media++;background.image = "none";}
    root.classList.add("kp-export-root");
    for (let index = root.style.length - 1; index >= 0; index--) {const key = root.style.item(index);if (/^(?:left|top|right|bottom|inset.*|transform.*)$/.test(key)) root.style.removeProperty(key);}
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, elements = 0, characters = 0, lastYield = owner.performance.now();
    const maximumElements = Math.min(options.maximumElements ?? CANVAS_IMAGE_LIMITS.elements, CANVAS_IMAGE_LIMITS.elements);
    const unlimited: Box = {x: -10_000_000, y: -10_000_000, width: 20_000_000, height: 20_000_000};
    let compass: SVGSVGElement | null = null;
    const pending: {source: Node; parent: Node; clip: Box; opacity: number}[] = [];
    for (const child of Array.from(source.children).reverse()) {
      if (child === cameraElement || child.classList.contains("kplex-central-editor-overlay")) pending.push({source: child, parent: root, clip: unlimited, opacity: 1});
      else if (child.classList.contains("kplex-compass-background") && owner.getComputedStyle(child).display !== "none") {
        compass = child.cloneNode(false) as SVGSVGElement;styles.copy(child, compass);
        for (const polygon of Array.from(child.children).reverse()) pending.push({source: polygon, parent: compass, clip: unlimited, opacity: 1});
      }
    }
    while (pending.length) {
      lifetime.check();
      if (owner.performance.now() - lastYield >= 8) {await lifetime.yield();lastYield = owner.performance.now();}
      const row = pending.pop()!, node = row.source;
      if (node.nodeType !== 1) {if (node.nodeType === 3) {characters += node.textContent?.length ?? 0;if (characters > maximumCharacters) throw new CanvasImageError("limit");row.parent.appendChild(node.cloneNode(false));}continue;}
      const element = node as Element, tag = element.tagName.toLowerCase();
      if (OMIT.has(tag)) {if (!["script", "style", "link", "meta", "base"].includes(tag)) warnings.media++;continue;}
      if (++elements > maximumElements) throw new CanvasImageError("limit");
      const clone = element.cloneNode(false) as Element & {style: CSSStyleDeclaration};
      const css = styles.copy(element, clone);if (css.display === "none") continue;
      const opacity = row.opacity * Number(css.opacity || 1), rect = element.getBoundingClientRect();let clip = row.clip;
      if (element.matches(CROP) && opacity > 0 && css.visibility !== "hidden"
        && rect.right >= clip.x && rect.left <= clip.x + clip.width && rect.bottom >= clip.y && rect.top <= clip.y + clip.height) {
        const painted = intersect({x: rect.left, y: rect.top, width: rect.width, height: rect.height}, clip);
        if (painted.width || painted.height) {
          left = Math.min(left, (painted.x - viewport.left - matrix.e) / matrix.a);top = Math.min(top, (painted.y - viewport.top - matrix.f) / matrix.a);
          right = Math.max(right, (painted.x + painted.width - viewport.left - matrix.e) / matrix.a);bottom = Math.max(bottom, (painted.y + painted.height - viewport.top - matrix.f) / matrix.a);
        }
      }
      // HTML overflow clips descendants, not the parent card/region itself. A zero-sized camera never clips world content.
      if (element !== cameraElement && element.namespaceURI === "http://www.w3.org/1999/xhtml") {
        const clippedX = css.overflowX !== "visible", clippedY = css.overflowY !== "visible";
        if (clippedX || clippedY) clip = intersect(clip, {x: clippedX ? rect.left : unlimited.x, y: clippedY ? rect.top : unlimited.y,
          width: clippedX ? rect.width : unlimited.width, height: clippedY ? rect.height : unlimited.height});
      }
      row.parent.appendChild(clone);characters += inlineBitmap(element, clone, fragment, matrix.a, warnings);
      for (const attribute of Array.from(clone.attributes)) if (attribute.name !== "src") characters += attribute.value.length;
      if (characters > maximumCharacters) throw new CanvasImageError("limit");
      if (tag === "input") {clone.setAttribute("value", (element as HTMLInputElement).value);if ((element as HTMLInputElement).checked) clone.setAttribute("checked", "");else clone.removeAttribute("checked");}
      if (tag === "textarea") {clone.textContent = (element as HTMLTextAreaElement).value;continue;}
      if (tag === "img" || tag === "canvas") continue;
      const html = element as HTMLElement;
      if (html.classList.contains("kplex-zone-scroll") || html.classList.contains("kplex-expanded-scroll")) if (html.scrollHeight > html.clientHeight + 1 || html.scrollWidth > html.clientWidth + 1) warnings.scroll++;
      let parent: Node = clone;
      if (html.scrollTop || html.scrollLeft) {
        const inner = fragment.createDiv();inner.setCssProps({width: `${html.scrollWidth}px`, height: `${html.scrollHeight}px`, transform: `translate(${-html.scrollLeft}px, ${-html.scrollTop}px)`});clone.appendChild(inner);parent = inner;
      }
      for (const child of Array.from(element.childNodes).reverse()) pending.push({source: child, parent, clip, opacity});

    }
    const fonts = await canvasImageFonts(document, styles.fonts, lifetime, warnings), css = styles.serialize();
    const serializer = new owner.XMLSerializer(), markup = serializer.serializeToString(root), compassMarkup = compass ? serializer.serializeToString(compass) : undefined;
    if (markup.length + css.length + fonts.length + (compassMarkup?.length ?? 0) > maximumCharacters || ![left, top, right, bottom].every(Number.isFinite)) throw new CanvasImageError("limit");
    // Epsilon absorbs native transform rounding at half/double zoom without clipping a painted edge.
    const x = Math.floor(left + 0.001) - 24, y = Math.floor(top + 0.001) - 24;
    const center = (options.center ?? cameraElement.querySelector<HTMLElement>("[data-kplex-path]"))?.getBoundingClientRect();
    lifetime.check();return {markup, css, fonts, bounds: {x, y, width: Math.ceil(right - 0.001) + 24 - x, height: Math.ceil(bottom - 0.001) + 24 - y},
      viewport: {width: source.clientWidth, height: source.clientHeight}, camera: {x: matrix.e, y: matrix.f, scale: matrix.a}, background, warnings, elements,
      compass: compassMarkup && center ? {markup: compassMarkup, center: {x: ((center.left + center.right) / 2 - viewport.left - matrix.e) / matrix.a, y: ((center.top + center.bottom) / 2 - viewport.top - matrix.f) / matrix.a}} : undefined};
  } finally {observer.disconnect();lifetime.dispose();fragment.replaceChildren();}
}
