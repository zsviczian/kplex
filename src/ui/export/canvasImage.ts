/** Rasterize a detached canvas snapshot with the browser's existing HTML/SVG renderer.
 * Image-local styles/fonts live only inside a serialized SVG graphic, never in an app stylesheet.
 * No live view, editor, camera, graph or native-window capture is used during rasterization. */
import {canvasRasterSize, type CanvasRasterSize} from "../../core/plex/export/imageDimensions";
import {compassPolygons} from "../../core/plex/compassBackground";
import type {CanvasImageSnapshot} from "./canvasImageSnapshot";
import {CANVAS_GRAPHIC_CSS} from "./canvasImageStyles";
import {CanvasImageError, ImageExportLifetime, type ImageExportGuard} from "./imageExportLifetime";

export type CanvasImageScope = "canvas" | "viewport";
export type CanvasPng = Readonly<CanvasRasterSize & {blob: Blob; scope: CanvasImageScope; transparentBackground: boolean}>;

/** Render every world-space scene edge inside a finite output allocation; scaling never crops bounds. */
export async function renderCanvasPng(document: Document, snapshot: CanvasImageSnapshot, scope: CanvasImageScope,
  options: ImageExportGuard & Readonly<{scale?: number; maximumPixels?: number; transparentBackground?: boolean}>): Promise<CanvasPng> {
  const owner = document.defaultView;if (!owner) throw new CanvasImageError("retired");
  const lifetime = new ImageExportLifetime(owner, options), fragment = document.adoptNode(createFragment());
  const canvas = fragment.createEl("canvas"), image = fragment.createEl("img");
  try {
    lifetime.check();const full = scope === "canvas", transparentBackground = options.transparentBackground === true, bounds = full ? snapshot.bounds : {x: 0, y: 0, ...snapshot.viewport};
    const size = canvasRasterSize(bounds.width, bounds.height, options.scale ?? 2, options.maximumPixels);
    const svg = fragment.createSvg("svg", {attr: {xmlns: "http://www.w3.org/2000/svg", width: String(bounds.width), height: String(bounds.height), viewBox: `0 0 ${bounds.width} ${bounds.height}`}});
    // A graphic's font and pseudo-element rules must be self-contained: SVG image documents cannot inherit document.fonts or application stylesheets.
    const stylesheet = svg.createSvg("style");stylesheet.textContent = snapshot.css + "\n" + snapshot.fonts + "\n" + CANVAS_GRAPHIC_CSS;
    const foreign = svg.createSvg("foreignObject", {attr: {x: "0", y: "0", width: String(bounds.width), height: String(bounds.height)}});
    const outer = foreign.createDiv();outer.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    outer.classList.add("kp-export-stage");outer.setCssProps({width: `${bounds.width}px`, height: `${bounds.height}px`, "--kp-export-background": transparentBackground ? "transparent" : snapshot.background.color, "--kp-export-background-image": transparentBackground ? "none" : snapshot.background.image});
    const parser = new owner.DOMParser();
    if (snapshot.compass && !transparentBackground) {
      const parsed = parser.parseFromString(snapshot.compass.markup, "image/svg+xml"), backdrop = parsed.documentElement as unknown as SVGSVGElement;
      if (parsed.querySelector("parsererror")) throw new CanvasImageError("capture");
      if (full) {
        backdrop.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);backdrop.setCssProps({width: `${bounds.width}px`, height: `${bounds.height}px`});
        const polygons = compassPolygons(bounds.width, bounds.height, {x: snapshot.compass.center.x - bounds.x, y: snapshot.compass.center.y - bounds.y});
        (["north", "east", "south", "west"] as const).forEach(/** Reuse the existing constant-size tint geometry, never a second background renderer. */ (direction, index) => {
          backdrop.children[index]?.setAttribute("points", polygons[direction].map(/** Serialize existing bounded vertices only. */ point => `${point.x},${point.y}`).join(" "));
        });
      }
      outer.appendChild(backdrop);
    }
    const transform = outer.createDiv({cls: "kp-export-camera"});transform.setCssProps({transform: full ? `matrix(${1 / snapshot.camera.scale},0,0,${1 / snapshot.camera.scale},${-snapshot.camera.x / snapshot.camera.scale - bounds.x},${-snapshot.camera.y / snapshot.camera.scale - bounds.y})` : "none"});
    const parsed = parser.parseFromString(snapshot.markup, "application/xhtml+xml");if (parsed.querySelector("parsererror")) throw new CanvasImageError("capture");transform.appendChild(parsed.documentElement);
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new owner.XMLSerializer().serializeToString(svg))}`;
    await lifetime.wait(image.decode());canvas.width = size.width;canvas.height = size.height;
    const context = canvas.getContext("2d");if (!context) throw new CanvasImageError("capture");context.drawImage(image, 0, 0, size.width, size.height);
    image.removeAttribute("src");
    const blob = await lifetime.wait(new Promise<Blob>(/** Native encoding stays bounded by the preflight pixel policy. */ (resolve, reject) => canvas.toBlob(/** A retired encode cannot publish a missing image. */ value => value ? resolve(value) : reject(new CanvasImageError("capture")), "image/png")));
    return {...size, blob, scope, transparentBackground};
  } catch (error) {if (error instanceof CanvasImageError) throw error;throw new CanvasImageError("capture");}
  finally {lifetime.dispose();image.removeAttribute("src");canvas.width = 0;canvas.height = 0;fragment.replaceChildren();}
}
