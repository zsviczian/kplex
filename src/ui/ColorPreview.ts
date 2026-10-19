/**
 * Two synthetic color-use examples for an open editor. Production node paint helpers supply hatch,
 * text, border and gate treatment; a static labelled connector uses the same source contract. No
 * graph, predicate, note read, image or real host-mode mutation participates. CSS snapshots refresh
 * only for completed theme names/context changes; local picker paint coalesces to one owner frame.
 * Compass examples reuse the viewport clipper and composite source alpha with mode/theme intensity.
 */
import {sampledColorValue} from "../adapters/obsidian/sampledColorValue";
import { NODE_COLOR_FIELDS, LINK_COLOR_FIELDS, isThemeColorName, parseLiteralColor, formatLiteralColor, type ColorValue } from "../core/contracts/colorValue";
import {compassPolygons} from "../core/plex/compassBackground";
import {compassIntensity, COMPASS_DIRECTIONS, COMPASS_COLOR_VARIABLES, COMPASS_SEMANTIC_SLOTS, type CompassDirection} from "../core/plex/colorPreferences";
import { SEMANTIC_COLOR_DEFAULTS, type ColorPreferencesV1, type SemanticColorPair } from "../core/plex/colorPreferences";
import { colorContrastRatio, compositeColor } from "../core/plex/colorContrast";
import { ThemePreviewSampler, THEME_PREVIEW_TOKENS, THEME_PREVIEW_CONTEXT_LIMIT, type ThemePreviewPair } from "../adapters/obsidian/themePreview";
import { ColorSampleReader } from "../adapters/obsidian/colorSample";
import { alphaHexToCss, nodePaint, nodeColorFallback, NATIVE_NODE_PAINT, NATIVE_CANVAS_FILL, NATIVE_LINK_STROKE, NATIVE_LINK_TEXT, NATIVE_LINK_LABEL_FILL, type NodePaintFallbacks } from "../index/style";
import type { NodeStyle, LinkStyle } from "../types";
import type { Translator } from "../lang";
import type {StyleEditorModal} from "./StyleEditorModal";

export type ColorPreviewTarget = Readonly<{ kind: "node"; field: typeof NODE_COLOR_FIELDS[number] }>
  | Readonly<{ kind: "link"; field: typeof LINK_COLOR_FIELDS[number] }> | Readonly<{ kind: "canvas" }> | Readonly<{kind: "compass"; direction?: CompassDirection}>;
export type ColorPreviewOptions = Readonly<{
  /** Optional native host ownership; reusable previews themselves acquire no plugin or theme library. */
  bindEditor?: (editor: StyleEditorModal) => void;
  onContextChange?: () => void;
  sourceScope: HTMLElement; translate: Translator; target: ColorPreviewTarget;
  fallbacks?: NodePaintFallbacks;
  inherit?: () => ColorValue | undefined;
  pairDraft?: () => SemanticColorPair;
  preferences: (draftSource?: ColorValue) => ColorPreferencesV1; nodeStyle: () => NodeStyle; linkStyle: () => LinkStyle; background: () => ColorValue | undefined;
}>;
type PreviewCard = Readonly<{ root: HTMLElement; canvas: HTMLElement; status: HTMLElement; help: HTMLElement; contrast: HTMLElement }>;
const PREVIEW_PUBLIC_TOKENS = ["--canvas-background", "--kplex-panel", "--kplex-canvas-background", "--kplex-node-fill", "--kplex-node-text",
  "--kplex-node-border", "--kplex-node-hatch-color", "--kplex-gate-stroke-color", "--kplex-gate-fill-color", "--kplex-link-color", "--kplex-link-text",
  "--kplex-link-label-background", "--kplex-semantic-origin", "--kplex-semantic-development", "--kplex-semantic-support", "--kplex-semantic-challenge"];

/** One editor's preview/cache lifetime; mode-specific colors are installed on private cards only. */
export class ColorPreview {
  private readonly root: HTMLElement;
  private readonly cards: Readonly<Record<"light" | "dark", PreviewCard>>;
  private readonly sampler = new ThemePreviewSampler();
  private readonly reader: ColorSampleReader;
  private readonly view: Window;
  private samples: ThemePreviewPair | null = null;
  private value: ColorValue | undefined;
  private generation = 0;
  private pendingKey = "";
  private releaseContext: (() => void) | null = null;
  private frame: number | null = null;
  private contextStale = true;
  private contextTimer: number | null = null;
  private disposed = false;

  /** Mount static real-use examples and lazily request the first bounded theme snapshot. */
  constructor(container: HTMLElement, private readonly options: ColorPreviewOptions, initial: ColorValue | undefined) {
    const view = container.ownerDocument.defaultView; if (!view) throw new Error("Preview has no owning window");
    this.view = view; this.value = initial; this.reader = new ColorSampleReader(container.ownerDocument);
    this.root = container.createDiv({ cls: "kplex-color-previews" });
    /** The same sample structure is reused in each mode; no second graph renderer is mounted. */
    const card = (mode: "light" | "dark"): PreviewCard => {
      const root = this.root.createEl("section", { cls: "kplex-color-preview" });
      const heading = root.createDiv({ cls: "kplex-color-preview-heading" });
      heading.createEl("strong", { text: options.translate(`colors.${mode}`) });
      const status = heading.createSpan({ cls: "setting-item-description" });
      const canvas = root.createDiv({ cls: "kplex-color-preview-canvas", attr: { "aria-label": options.translate("colors.samplePreview") } });
      const svg = canvas.createSvg("svg", { attr: { viewBox: "0 0 300 140", "aria-hidden": "true", focusable: "false" } });
      if (options.target.kind === "compass") {
        const compass = svg.createSvg("g", {cls: "kplex-color-preview-compass"});
        const polygons = compassPolygons(300, 140, {x: 150, y: 70});
        for (const direction of COMPASS_DIRECTIONS) compass.createSvg("polygon", {attr: {points: polygons[direction].map(/** Reuse the viewport clipper for a fixed synthetic center. */ point => `${point.x},${point.y}`).join(" ")}});
      }
      svg.createSvg("path", { attr: { d: "M 18 108 C 55 108 62 70 105 70", fill: "none", stroke: "var(--_kplex-preview-link)", "stroke-width": "2" } });
      const node = canvas.createDiv({ cls: "kplex-color-preview-node", text: options.translate("colors.sampleNode") });
      node.createSpan({ cls: "kplex-color-preview-gate", attr: { "aria-hidden": "true" } });
      node.createSpan({ cls: "kplex-color-preview-gate is-empty", attr: { "aria-hidden": "true" } });
      canvas.createSpan({ cls: "kplex-color-preview-label", text: options.translate("colors.sampleLink") });
      return { root, canvas, status, help: root.createDiv({cls: "setting-item-description"}), contrast: root.createDiv({ cls: "kplex-color-preview-contrast" }) };
    };
    this.cards = { light: card("light"), dark: card("dark") }; void this.readTheme();
    const observer = new (this.view as Window & {MutationObserver: typeof MutationObserver}).MutationObserver(records => { if (records.some(record => record.attributeName === "class" || record.attributeName === "style" || /^data-(theme|color|style|css)(-|$)/.test(record.attributeName ?? ""))) this.invalidate(); });
    const contexts = new Set([options.sourceScope.ownerDocument.body, options.sourceScope.ownerDocument.documentElement]);
    for (let element: HTMLElement | null = options.sourceScope, depth = 0; element && depth < THEME_PREVIEW_CONTEXT_LIMIT; element = element.parentElement, depth++) contexts.add(element);
    for (const context of contexts) observer.observe(context, {attributes: true});
    const resized = (): void => this.invalidate();
    this.view.addEventListener("resize", resized);
    this.releaseContext = () => { observer.disconnect(); this.view.removeEventListener("resize", resized); };
  }

  /** Change only local preview paint; a completed new theme name may need one cached CSS snapshot. */
  update(value: ColorValue | undefined, finishedThemeName = false): void {
    if (this.disposed) return; this.value = value;
    if (finishedThemeName) void this.readTheme(); else this.schedulePaint();
  }
  /** Palette/semantic publications repaint current drafts; CSS harvesting occurs only for newly needed tokens. */
  refreshSources(): void { if (!this.disposed) {void this.readTheme(); this.schedulePaint();} }
  /** Real owner CSS/context changes retire old snapshots without persisting sampled RGB values. */
  invalidate(): void {
    if (this.disposed) return;
    this.pendingKey = ""; this.contextStale = true; this.sampler.invalidate(); this.schedulePaint();
    if (this.contextTimer !== null) this.view.clearTimeout(this.contextTimer);
    this.contextTimer = this.view.setTimeout(/** Harvest after context/resize bursts settle, never every animation frame. */ () => {
      this.contextTimer = null; if (!this.disposed) void this.readTheme();
    }, 100);
  }
  /** Stop pending local paint, isolated frame work and converter ownership before native modal teardown. */
  dispose(): void {
    if (this.disposed) return; this.disposed = true; this.generation++; this.releaseContext?.(); this.releaseContext = null; this.sampler.dispose(); this.reader.dispose();
    if (this.contextTimer !== null) this.view.clearTimeout(this.contextTimer); this.contextTimer = null;
    if (this.frame !== null) this.view.cancelAnimationFrame(this.frame); this.frame = null; this.root.remove();
  }

  /** Request only configured example sources and fixed native/public tokens, never discover arbitrary theme variables. */
  private async readTheme(): Promise<void> {
    const tokens = new Set<string>([...THEME_PREVIEW_TOKENS, ...PREVIEW_PUBLIC_TOKENS]);
    if (this.options.target.kind === "compass") for (const token of [...Object.values(COMPASS_COLOR_VARIABLES), "--kplex-compass-opacity"]) tokens.add(token);
    const node = this.options.nodeStyle(), link = this.options.linkStyle(), preferences = this.options.preferences(this.value);
    const references = [...NODE_COLOR_FIELDS.map(field => node[field]), ...LINK_COLOR_FIELDS.map(field => link[field]), this.options.background(), this.value, this.options.inherit?.(),
      ...Object.values(preferences.semantic), ...(this.options.target.kind === "compass" ? Object.values(preferences.compass.fills) : [])];
    for (const value of references) if (value && typeof value !== "string" && value.kind === "theme" && isThemeColorName(value.variable) && !value.variable.startsWith("--_kplex-")) tokens.add(value.variable);
    const native = this.options.fallbacks ?? NATIVE_NODE_PAINT;
    const expressions = Object.fromEntries(Object.entries(native).map(([key, value]) => [`--kplex-preview-${key}`, value]));
    Object.assign(expressions, {"--kplex-preview-canvas": NATIVE_CANVAS_FILL, "--kplex-preview-link": NATIVE_LINK_STROKE,
      "--kplex-preview-label-fill": NATIVE_LINK_LABEL_FILL, "--kplex-preview-label-text": NATIVE_LINK_TEXT});
    const key = JSON.stringify([[...tokens].sort(), expressions]); if (this.pendingKey === key) return;
    this.pendingKey = key; this.contextStale = true; this.schedulePaint(); const generation = ++this.generation;
    try {
      const samples = await this.sampler.sample(this.options.sourceScope, [...tokens].sort(), expressions);
      if (this.disposed || generation !== this.generation) return; this.samples = samples; this.contextStale = false; this.options.onContextChange?.(); this.schedulePaint();
    } catch { if (!this.disposed && generation === this.generation) { this.samples = null; this.schedulePaint(); } }
  }

  /** Coalesce native color-picker streams; no frame is scheduled after the most recent paint settles. */
  private schedulePaint(): void {
    if (this.disposed || this.frame !== null) return;
    this.frame = this.view.requestAnimationFrame(/** Paint only these two synthetic examples from the latest local draft. */ () => {
      this.frame = null; if (!this.disposed) { this.paint("light"); this.paint("dark"); }
    });
  }

  /** Resolve preview-only source values in one sampled mode without altering saved source identities. */
  private resolve(value: ColorValue | undefined, mode: "light" | "dark", fallback: string): string {
    if (typeof value === "string" && !this.reader.read(this.cards[mode].canvas, value)) return fallback;
    return sampledColorValue(value, mode, this.samples, this.options.preferences(this.value), fallback, this.options.pairDraft?.());
  }

  /** Apply complete mode colors only to private preview properties, then report composited contrast. */
  private paint(mode: "light" | "dark"): void {
    const card = this.cards[mode], samples = this.samples?.[mode], t = this.options.translate;
    const matched = !this.contextStale && samples?.confidence === "matched";
    card.status.setText(matched ? "" : t("colors.estimated"));
    card.help.setText("");
    if (this.value && typeof this.value !== "string" && this.value.kind === "theme" && this.samples) {
      const variable = this.value.variable, light = this.samples.light.colors[variable], dark = this.samples.dark.colors[variable];
      if ((light || dark) && (!light || !dark || light === dark)) card.help.setText(t("colors.sameVariant"));
    }
    if (!samples?.colors["--background-primary"]) { card.canvas.toggle(false); card.contrast.setText(t("colors.previewUnavailable")); return; }
    card.canvas.toggle(true);
    const fallback = Object.fromEntries(Object.keys(NATIVE_NODE_PAINT).map(key => [key, samples.colors[`--kplex-preview-${key}`] || "transparent"])) as NodePaintFallbacks;
    const node = { ...this.options.nodeStyle() }, link = { ...this.options.linkStyle() };
    let canvas = this.options.background(); const target = this.options.target;
    const inherited = this.value === undefined ? this.options.inherit?.() : this.value;
    if (target.kind === "node") node[target.field] = inherited;
    else if (target.kind === "link") link[target.field] = inherited; else if (target.kind === "canvas") canvas = inherited;
    const opaqueLiteral = [...NODE_COLOR_FIELDS.map(field => node[field]), ...LINK_COLOR_FIELDS.map(field => link[field]), canvas, ...(target.kind === "compass" ? [...Object.values(this.options.preferences(this.value).compass.fills), this.value] : [])]
      .some(value => typeof value === "string" && !parseLiteralColor(value));
    if (opaqueLiteral) { card.status.setText(t("colors.estimated")); card.help.setText(t("colors.estimatedHelp")); }
    for (const field of NODE_COLOR_FIELDS) node[field] = this.resolve(node[field], mode, nodeColorFallback(field, fallback));
    const paint = nodePaint(node, fallback);
    const canvasColor = this.resolve(canvas, mode, samples.colors["--kplex-preview-canvas"]), labelFill = samples.colors["--kplex-preview-label-fill"];
    const stroke = this.resolve(link.strokeColor, mode, samples.colors["--kplex-preview-link"]);
    const labelText = this.resolve(link.textColor, mode, samples.colors["--kplex-preview-label-text"]);
    const panelColor = samples.colors["--kplex-panel"] || samples.colors["--background-primary"];
    const panel = this.reader.read(card.canvas, panelColor), primary = this.reader.read(card.canvas, samples.colors["--background-primary"]);
    const uncertainSurface = !panel || panel.alpha < 1;
    const base = panel?.alpha === 1 ? panel : panel && primary ? compositeColor(panel, primary) : null;
    // Each alternate card owns its backdrop. A transparent sample must not reveal the current
    // native modal, and a translucent panel has an unmodelled ancestor surface rather than proof.
    const previewBase = panel?.alpha === 1 ? panelColor : base ? formatLiteralColor(base) : samples.colors["--background-primary"];
    if (uncertainSurface) { card.status.setText(t("colors.estimated")); card.help.setText(t("colors.estimatedHelp")); }
    card.canvas.setCssProps({ "--_kplex-preview-base": previewBase, "--_kplex-preview-canvas": alphaHexToCss(canvasColor), "--_kplex-preview-node-fill": paint.background,
      "--_kplex-preview-node-text": paint.foreground, "--_kplex-preview-node-border": paint.border, "--_kplex-preview-gate-stroke": paint.gateStroke,
      "--_kplex-preview-gate-fill": paint.gateFill, "--_kplex-preview-link": alphaHexToCss(stroke), "--_kplex-preview-label-fill": labelFill,
      "--_kplex-preview-label-text": alphaHexToCss(labelText) });
    const canvasSample = this.reader.read(card.canvas, canvasColor);
    const fill = this.reader.read(card.canvas, typeof node.backgroundColor === "string" ? node.backgroundColor : fallback.fill), text = this.reader.read(card.canvas, paint.foreground), line = this.reader.read(card.canvas, stroke);
    if (!base || !canvasSample || !fill || !text || !line) { card.contrast.setText(t("colors.contrastUnavailable")); return; }
    const surface = compositeColor(canvasSample, base), nodeSurface = compositeColor(fill, surface);
    const compass = target.kind === "compass" ? card.canvas.querySelector<SVGGElement>(".kplex-color-preview-compass") : null;
    const compassSurfaces = [surface];
    if (compass) {
      compass.style.setProperty("display", target.kind === "compass" ? "" : "none");
      if (target.kind === "compass") {
        compassSurfaces.length = 0;
        const preferences = this.options.preferences(this.value);
        const opacity = preferences.compass.enabled ? compassIntensity(preferences, mode, samples.compassOpacity === undefined ? undefined : String(samples.compassOpacity)) : 0;
        for (let index = 0; index < COMPASS_DIRECTIONS.length; index++) {
          const direction = COMPASS_DIRECTIONS[index], slot = COMPASS_SEMANTIC_SLOTS[direction];
          const lower = this.resolve({kind: "theme", variable: `--kplex-semantic-${slot}`}, mode, samples.colors[SEMANTIC_COLOR_DEFAULTS[slot]] || "transparent");
          const fallbackColor = samples.colors[COMPASS_COLOR_VARIABLES[direction]] || lower;
          const source = target.direction === direction ? inherited : preferences.compass.fills[direction];
          const color = this.resolve(source, mode, fallbackColor), polygon = compass.children[index];
          polygon?.setAttribute("fill", alphaHexToCss(color)); polygon?.setAttribute("fill-opacity", String(opacity));
          const tint = this.reader.read(card.canvas, color);
          if (tint) compassSurfaces.push(compositeColor({...tint, alpha: tint.alpha * opacity}, surface));
        }
      }
    }
    const labelSurface = this.reader.read(card.canvas, labelFill), labelForeground = this.reader.read(card.canvas, labelText);
    let ratio = colorContrastRatio(text, nodeSurface), message: "colors.nodeContrast" | "colors.linkContrast" | "colors.labelContrast" | "colors.borderContrast" | "colors.gateContrast" = "colors.nodeContrast";
    if (target.kind === "link") {
      message = target.field === "textColor" ? "colors.labelContrast" : "colors.linkContrast";
      ratio = target.field === "textColor" ? labelSurface && labelForeground ? colorContrastRatio(labelForeground, compositeColor(labelSurface, surface)) : null : colorContrastRatio(line, surface);
    } else if (target.kind === "node" && ["borderColor", "gateStrokeColor", "gateBackgroundColor"].includes(target.field)) {
      const foreground = this.reader.read(card.canvas, target.field === "borderColor" ? paint.border : target.field === "gateStrokeColor" ? paint.gateStroke : paint.gateFill);
      ratio = foreground ? Math.min(colorContrastRatio(foreground, surface) ?? 0, colorContrastRatio(foreground, nodeSurface) ?? 0) : null;
      message = target.field === "borderColor" ? "colors.borderContrast" : "colors.gateContrast";
    }
    if (target.kind === "compass") {
      const ratios = compassSurfaces.map(/** Evaluate transparent node fill over each actual tinted sector. */ background => colorContrastRatio(text, compositeColor(fill, background)));
      ratio = ratios.length === 4 && ratios.every(/** Unknown alpha composition cannot certify a contrast number. */ value => value !== null) ? Math.min(...ratios) : null;
    }
    // Hatch examples have a varying surface; a scalar ratio cannot certify every stripe.
    if (this.contextStale || opaqueLiteral || uncertainSurface || ratio === null || node.fillStyle === "hachure" || node.fillStyle === "cross-hatch") card.contrast.setText(t("colors.contrastUnavailable"));
    else if (target.kind === "canvas" || target.kind === "compass") {
      const ratios = compassSurfaces.map(/** Essential connector contrast uses the least favorable tinted surface. */ background => colorContrastRatio(line, background));
      const connectorRatio = ratios.every(/** Unknown alpha composition cannot certify a contrast number. */ value => value !== null) ? Math.min(...ratios) : null;
      card.contrast.setText(t("colors.nodeContrast", {ratio: ratio.toFixed(1)}) + " · " + (connectorRatio === null ? t("colors.contrastUnavailable") : t("colors.linkContrast", {ratio: connectorRatio.toFixed(1)})));
    } else card.contrast.setText(t(message, {ratio: ratio.toFixed(1)}));
  }
}
