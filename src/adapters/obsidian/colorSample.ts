/**
 * Editor-only color sampling for alpha/composited contrast and explicit source-to-fixed conversion.
 * CSS resolves in the actual owning scope. Common RGB values use the portable parser; modern color
 * spaces use one lazily allocated 1px sRGB canvas. No images, resources, note data or saved writes.
 */
import { parseLiteralColor, type LiteralColor } from "../../core/contracts/colorValue";

/** One editor document's tiny conversion resource; normal graph rendering never uses it. */
export class ColorSampleReader {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private disposed = false;

  /** Keep color resolution tied to the editor's document, including native popout windows. */
  constructor(private readonly owner: Document) {}

  /** Return the rendered complete color without changing its literal/reference source in settings. */
  read(scope: HTMLElement, color: string): LiteralColor | null {
    if (this.disposed || scope.ownerDocument !== this.owner || !scope.isConnected) return null;
    const view = this.owner.defaultView; if (!view) return null;
    const probe = scope.createSpan({ attr: { "aria-hidden": "true" } });
    probe.setCssStyles({ position: "fixed", left: "-100000px", visibility: "hidden", pointerEvents: "none" });
    let complete: string;
    try {
      probe.style.setProperty("--_kplex-sample-input", color);
      const resolved = view.getComputedStyle(probe).getPropertyValue("--_kplex-sample-input").trim();
      if (!resolved) return null;
      probe.style.setProperty("color", resolved);
      if (!probe.style.getPropertyValue("color")) return null;
      complete = view.getComputedStyle(probe).color;
    } finally { probe.remove(); }
    const parsed = parseLiteralColor(complete); if (parsed) return parsed;
    try {
      if (!this.canvas) {
        const helpers = this.owner.win as Window & { createEl: typeof createEl };
        this.canvas = helpers.createEl("canvas"); this.canvas.width = 1; this.canvas.height = 1;
        this.context = this.canvas.getContext("2d", { willReadFrequently: true });
      }
      const context = this.context; if (!context) return null;
      // Different sentinels distinguish rejected assignments from an actual black/white color.
      context.fillStyle = "#000000"; context.fillStyle = complete; const first = context.fillStyle;
      context.fillStyle = "#ffffff"; context.fillStyle = complete; if (context.fillStyle !== first) return null;
      context.clearRect(0, 0, 1, 1); context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      const slashAlpha = /\/\s*((?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(%)?\s*\)$/i.exec(complete);
      const alpha = slashAlpha ? Number(slashAlpha[1]) / (slashAlpha[2] ? 100 : 1) : pixel[3] / 255;
      return { red: pixel[0], green: pixel[1], blue: pixel[2], alpha };
    } catch { return null; }
  }

  /** Release conversion state and fence late editor callbacks without retaining an isolated document. */
  dispose(): void { this.disposed = true; this.context = null; this.canvas = null; }
}
