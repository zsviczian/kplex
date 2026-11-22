/** Owning-document property text metrics for all canvas layouts. One temporary shared-markup
 * probe captures CSS font/spacing/line boxes; cached Canvas advances shape actual strings.
 * Unsupported advanced font features use a cached actual-DOM measurement rather than estimates.
 * No source, semantic index, global document, resource fetching or persistent state belongs here. */
import {nodePropertyFontSize, type NodePropertyLine, type NodePropertyMeasurement, type NodePropertyMeasure} from "../../core/plex/nodeProperties";
import {appendNodePropertyCaption} from "../NodePropertyCaption";

type TextFont = Readonly<{font: string; kerning: CanvasFontKerning; caps: CanvasFontVariantCaps;
  letterSpacing: string; wordSpacing: string; direction: CanvasDirection; extra: number; features: string; dom: boolean}>;
type FontContext = Readonly<{value: TextFont; label: TextFont; iconWidth: number; gap: number; extra: number; height: number; dom: boolean}>;
const CACHE_LIMIT = 8192;

/** CSS nowrap collapses whitespace before shaping; raw Canvas text does not do that for us. */
function renderedText(value: string): string {return value.replace(/[ \t\r\n\f]+/g, " ").replace(/^ +| +$/g, "");}
/** Computed dimensions are pixel values; normal/nonfinite optional spacing contributes zero. */
function pixels(value: string): number {const number = Number.parseFloat(value);return Number.isFinite(number) ? number : 0;}
/** Include the painted span's CSS box and margins independently of its shaped text advance. */
function horizontalBox(style: CSSStyleDeclaration): number {
  return pixels(style.paddingLeft) + pixels(style.paddingRight) + pixels(style.borderLeftWidth) + pixels(style.borderRightWidth)
    + pixels(style.marginLeft) + pixels(style.marginRight);
}

/** Keep one context and bounded text cache tied to the exact viewport document and font size. */
export class NodePropertyTextMeasurement {
  private readonly owner: Document;
  private readonly fontSize: number;
  private context: CanvasRenderingContext2D | null;
  private snapshot: FontContext | null = null;
  private signature = "";
  private disposed = false;
  private readonly cache = new Map<string, NodePropertyMeasurement>();

  /** The detached Canvas inherits the probe's actual font explicitly and never uses a global realm. */
  constructor(private readonly root: HTMLElement, fontSize: number) {
    this.owner = root.ownerDocument;this.fontSize = nodePropertyFontSize(fontSize);
    const canvas = root.createEl("canvas");canvas.remove();this.context = canvas.getContext("2d");this.refresh();
  }

  /** A migrated or retired view cannot measure through its old document's fonts or cached values. */
  private current(): boolean {return !this.disposed && this.root.isConnected && this.root.ownerDocument === this.owner && !!this.owner.defaultView && !this.owner.defaultView.closed;}

  /** Build exactly the shared label/icon/value markup, outside the camera transform, and remove it synchronously. */
  private withProbe<T>(line: NodePropertyLine, read: (row: HTMLElement, view: Window) => T): T | undefined {
    if (!this.current()) return undefined;
    const probe = this.root.createDiv({cls: "kplex-thought kplex-property-measurement", attr: {"aria-hidden": "true"}});
    probe.style.setProperty("--kplex-node-property-font-size", `${this.fontSize}px`);
    try {
      const properties = probe.createSpan({cls: "kplex-node-properties"});appendNodePropertyCaption(properties, line);
      const row = properties.querySelector<HTMLElement>(".kplex-node-property");
      return row ? read(row, this.owner.defaultView!) : undefined;
    } finally {probe.remove();}
  }

  /** Capture shaping inputs once per CSS context; uncommon unsupported font features remain exact via DOM. */
  private font(style: CSSStyleDeclaration): TextFont {
    const caps = style.fontVariantCaps;
    const supportedCaps = caps === "small-caps" || caps === "all-small-caps" || caps === "petite-caps" || caps === "all-petite-caps"
      || caps === "unicase" || caps === "titling-caps" ? caps : "normal";
    const letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
    const wordSpacing = style.wordSpacing === "normal" ? "0px" : style.wordSpacing;
    const kerning = style.fontKerning === "none" || style.fontKerning === "normal" ? style.fontKerning : "auto";
    const stretch = style.getPropertyValue("font-stretch");
    const advanced = style.fontFeatureSettings && style.fontFeatureSettings !== "normal"
      || style.fontVariationSettings && style.fontVariationSettings !== "normal"
      || style.fontVariantNumeric && style.fontVariantNumeric !== "normal"
      || style.fontVariantLigatures && style.fontVariantLigatures !== "normal"
      || style.fontVariantEastAsian && style.fontVariantEastAsian !== "normal"
      || stretch && stretch !== "normal" && stretch !== "100%"
      || style.textTransform && style.textTransform !== "none" || style.fontOpticalSizing === "none";
    return {font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, caps: supportedCaps,
      kerning, letterSpacing, wordSpacing, direction: style.direction === "rtl" ? "rtl" : "ltr", extra: horizontalBox(style),
      features: JSON.stringify([style.fontFeatureSettings, style.fontVariationSettings, style.fontVariantNumeric, style.fontVariantLigatures, style.fontVariantEastAsian, stretch, style.textTransform, style.fontOpticalSizing]),
      dom: !this.context || !!advanced || !!pixels(letterSpacing) && !("letterSpacing" in this.context)
        || !!pixels(wordSpacing) && !("wordSpacing" in this.context)};
  }

  /** Reuse metrics when CSS is unchanged; completed font loads force a fresh shaped-text cache. */
  refresh(force = false): boolean {
    const next = this.withProbe({field: "measurement", text: "M", label: "M", icon: "tag"}, /** Read shared CSS boxes only during context changes, never once per painted node. */ (row, view) => {
      const value = row.querySelector<HTMLElement>(".kplex-node-property-value")!, label = row.querySelector<HTMLElement>(".kplex-node-property-label")!;
      const icon = row.querySelector<HTMLElement>(".kplex-node-property-icon")!, style = view.getComputedStyle(row);
      const height = row.getBoundingClientRect().height;
      return {value: this.font(view.getComputedStyle(value)), label: this.font(view.getComputedStyle(label)),
        iconWidth: icon.getBoundingClientRect().width + pixels(view.getComputedStyle(icon).marginLeft) + pixels(view.getComputedStyle(icon).marginRight),
        gap: pixels(style.columnGap), extra: horizontalBox(style), height,
        dom: style.lineHeight === "normal"} satisfies FontContext;
    });
    if (!next || next.height <= 0) return false;
    const signature = JSON.stringify(next);if (!force && signature === this.signature) return false;
    this.snapshot = next;this.signature = signature;this.cache.clear();return true;
  }

  /** Apply each part's actual computed font/spacing before asking the native shaping engine for its advance. */
  private width(text: string, font: TextFont): number {
    const context = this.context!;context.font = font.font;context.fontKerning = font.kerning;context.fontVariantCaps = font.caps;context.direction = font.direction;
    if ("letterSpacing" in context) context.letterSpacing = font.letterSpacing;
    if ("wordSpacing" in context) context.wordSpacing = font.wordSpacing;
    return context.measureText(renderedText(text)).width + font.extra;
  }

  /** Cache shaped strings by actual painted content. Hits perform no DOM/style/layout reads. */
  readonly measure: NodePropertyMeasure = line => {
    if (!this.current() || !this.snapshot) return undefined;
    const key = JSON.stringify([line.text, line.label ?? "", line.icon ?? ""]), previous = this.cache.get(key);
    if (previous) return previous;
    const snapshot = this.snapshot;
    let measurement: NodePropertyMeasurement | undefined;
    if (snapshot.dom || snapshot.value.dom || snapshot.label.dom) {
      measurement = this.withProbe(line, /** Advanced CSS that Canvas cannot express is measured once per cached actual row. */ row => {
        const rect = row.getBoundingClientRect();return rect.height > 0 ? {width: rect.width, height: rect.height} : undefined;
      });
    } else {
      const parts = 1 + Number(Boolean(line.label)) + Number(Boolean(line.icon));
      measurement = {width: snapshot.extra + this.width(line.text, snapshot.value)
        + (line.label ? this.width(`${line.label}:`, snapshot.label) : 0) + (line.icon ? snapshot.iconWidth : 0) + (parts - 1) * snapshot.gap,
      height: snapshot.height};
    }
    if (!measurement || !Number.isFinite(measurement.width) || measurement.width < 0) return undefined;
    if (this.cache.size >= CACHE_LIMIT) {const oldest = this.cache.keys().next();if (!oldest.done) this.cache.delete(oldest.value);}
    this.cache.set(key, measurement);return measurement;
  };

  /** Retire the document/font capability and all text references; already detached probes own no observers. */
  dispose(): void {this.disposed = true;this.context = null;this.snapshot = null;this.cache.clear();}
}
