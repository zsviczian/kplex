/**
 * Preview-only, owner-document color sampling. A bounded, script-free isolated document resolves
 * already loaded CSS in both Obsidian modes. Samples never become saved colors or live graph
 * defaults. The one optional Compass opacity is sampled separately as a bounded numeric input.
 * The editor owns invalidation/disposal; normal rendering never enumerates stylesheets.
 */
import {compassCssIntensity} from "../../core/plex/colorPreferences";
import {isThemeColorName} from "../../core/contracts/colorValue";

export type AppearanceMode = "light" | "dark";
export const THEME_PREVIEW_TOKENS = ["--background-primary", "--background-secondary", "--background-primary-alt",
  "--text-normal", "--text-muted", "--background-modifier-border", "--interactive-accent", "--text-on-accent",
  "--graph-line", "--color-purple", "--color-green", "--color-cyan", "--color-orange"] as const;
export type ThemePreviewSample = Readonly<{
  colors: Readonly<Record<string, string>>;
  /** Only the finite optional Compass opacity input is sampled as a number, separately from colors. */
  compassOpacity?: number;
  confidence: "matched" | "estimated";
}>;
export type ThemePreviewPair = Readonly<{
  light: ThemePreviewSample; dark: ThemePreviewSample; activeMode: AppearanceMode;
  reasons: readonly string[]; stylesheetCount: number; cssBytes: number;
}>;
export const THEME_PREVIEW_CONTEXT_LIMIT = 32;
const MAX_BYTES = 8 * 1024 * 1024, MAX_SHEETS = 128, MAX_RULES = 30_000;

type ContextBudget = {properties: number; bytes: number; limited: boolean};
/** Copy bounded authored CSS inputs and theme attributes only, without note/resource-bearing data. */
function copyContext(source: HTMLElement, target: HTMLElement, budget: ContextBudget): void {
  for (let i = 0; i < source.style.length; i++) {
    const name = source.style.item(i); if (!name.startsWith("--")) continue;
    const value = source.style.getPropertyValue(name);
    budget.bytes += (name.length + value.length) * 2;
    if (++budget.properties > 512 || budget.bytes > 128 * 1024) { budget.limited = true; break; }
    target.style.setProperty(name, value, source.style.getPropertyPriority(name));
  }
  let attributes = 0;
  for (const attribute of Array.from(source.attributes)) if (/^data-(theme|color|style|css)(-|$)/.test(attribute.name)) {
    if (++attributes > 32 || attribute.value.length > 256) { budget.limited = true; continue; }
    target.setAttribute(attribute.name, attribute.value);
  }
  target.dir = source.dir;
}

/** Resolve complete CSS colors in their actual scope, including modern color syntax and alpha. */
function sampleColors(scope: HTMLElement, tokens: readonly string[], createProbe: () => HTMLElement, expressions: Readonly<Record<string, string>> = {}): Record<string, string> {
  const owner = scope.ownerDocument, view = owner.defaultView;
  if (!view) return {};
  const computed = view.getComputedStyle(scope), probe = createProbe(), colors: Record<string, string> = {};
  scope.append(probe);
  try {
    for (const token of tokens) {
      const expression = expressions[token];
      if (expression !== undefined) probe.style.setProperty("--_kplex-preview-expression", expression);
      const raw = expression === undefined ? computed.getPropertyValue(token).trim()
        : view.getComputedStyle(probe).getPropertyValue("--_kplex-preview-expression").trim();
      probe.style.removeProperty("color");
      if (raw) probe.style.setProperty("color", raw);
      colors[token] = probe.style.getPropertyValue("color") ? view.getComputedStyle(probe).color : "";
    }
  } finally { probe.remove(); }
  return colors;
}

/** One open editor's snapshot lifetime; cancellation cannot publish a retired frame's result. */
export class ThemePreviewSampler {
  private revision = 0;
  private disposed = false;
  private frame: HTMLIFrameElement | null = null;
  private cancelLoad: (() => void) | null = null;
  private cached: { scope: HTMLElement; owner: Document; tokens: string; value: ThemePreviewPair } | null = null;

  /** Retire cached colors after a real owner-scope or CSS change, never on picker drag. */
  invalidate(): void { this.revision++; this.cached = null; this.cancelLoad?.(); this.frame?.remove(); this.frame = null; }

  /** Release the exact isolated document and its CSS; no polling/listeners survive the editor. */
  dispose(): void { this.disposed = true; this.invalidate(); }

  /** Sample loaded local CSS once per editor revision; unavailable context is explicitly estimated. */
  async sample(scope: HTMLElement, requested: readonly string[] = THEME_PREVIEW_TOKENS, expressions: Readonly<Record<string, string>> = {}): Promise<ThemePreviewPair | null> {
    const tokens = [...new Set([...requested, ...Object.keys(expressions)])];
    if (this.disposed || !scope.isConnected || tokens.length > 64 || tokens.some(token => !isThemeColorName(token)) || Object.keys(expressions).length > 16 || Object.values(expressions).some(value => value.length > 1024)) return null;
    const owner = scope.ownerDocument, view = owner.defaultView;
    if (!view || view.closed) return null;
    const key = JSON.stringify([tokens, expressions]);
    if (this.cached?.scope === scope && this.cached.owner === scope.ownerDocument && this.cached.tokens === key) return this.cached.value;
    this.cancelLoad?.();
    const generation = ++this.revision;
    const activeMode: AppearanceMode = owner.body.classList.contains("theme-light") ? "light" : "dark";
    // Create through the equipped owning window; insertion adopts inert nodes into the isolated
    // document without assuming Obsidian helpers are installed in that script-free iframe realm.
    const helpers = owner.win as Window & { createSpan: typeof createSpan; createDiv: typeof createDiv; createEl: typeof createEl };
    /** The equipped parent factory creates only an inert probe, adopted by its destination scope. */
    const createProbe = (): HTMLElement => helpers.createSpan();
    /** Sample the one supported numeric CSS input only when this preview requests Compass. */
    const sampleOpacity = (element: HTMLElement): number | undefined => tokens.includes("--kplex-compass-opacity")
      ? compassCssIntensity(element.ownerDocument.defaultView?.getComputedStyle(element).getPropertyValue("--kplex-compass-opacity") ?? "") : undefined;
    const liveOpacity = sampleOpacity(scope);
    const live = sampleColors(scope, tokens, createProbe, expressions), reasons: string[] = [], texts: string[] = [];
    // Host scripts can publish only the active mode through inline root colors. Their unavailable
    // alternate execution cannot be inferred by copying CSS; retain live paint and label estimates.
    if ([owner.documentElement, owner.body].some(element => Array.from(element.style).some(name => name.startsWith("--")
      && !name.startsWith("--accent-") && !["--interactive-accent", "--zoom-factor", "--font-text-size", "--indent-size"].includes(name)))) reasons.push("inline-mode-context");
    let cssBytes = 0, ruleCount = 0;
    const sheets = [...Array.from(owner.styleSheets), ...owner.adoptedStyleSheets];
    if (sheets.length > MAX_SHEETS) reasons.push("stylesheet-limit");
    for (const sheet of sheets.slice(0, MAX_SHEETS)) {
      if (sheet.disabled) continue;
      try {
        const rules: string[] = [];
        for (const rule of Array.from(sheet.cssRules)) {
          if ("styleSheet" in rule) { reasons.push("import-unavailable"); continue; }
          const text = rule.cssText;
          cssBytes += text.length * 2;
          if (++ruleCount > MAX_RULES || cssBytes > MAX_BYTES) { reasons.push("stylesheet-limit"); break; }
          rules.push(text);
        }
        const media = sheet.media?.mediaText;
        texts.push(media ? `@media ${media}{${rules.join("\n")}}` : rules.join("\n"));
      } catch { reasons.push("stylesheet-unavailable"); }
      if (ruleCount > MAX_RULES || cssBytes > MAX_BYTES) break;
    }
    /** Preserve accurate current-mode colors while labelling missing alternate context honestly. */
    const fallback = (): ThemePreviewPair => ({
      activeMode, light: { colors: activeMode === "light" ? live : {}, compassOpacity: activeMode === "light" ? liveOpacity : undefined, confidence: activeMode === "light" ? "matched" : "estimated" },
      dark: { colors: activeMode === "dark" ? live : {}, compassOpacity: activeMode === "dark" ? liveOpacity : undefined, confidence: activeMode === "dark" ? "matched" : "estimated" },
      reasons: [...new Set(reasons)], stylesheetCount: texts.length, cssBytes,
    });
    const frame = helpers.createEl("iframe");
    frame.setAttribute("sandbox", "allow-same-origin");
    frame.setAttribute("aria-hidden", "true"); frame.tabIndex = -1;
    for (const [property, value] of Object.entries({ position: "fixed", left: "-100000px", top: "0", width: `${view.innerWidth}px`,
      height: `${view.innerHeight}px`, visibility: "hidden", "pointer-events": "none", border: "0" })) frame.style.setProperty(property, value);
    this.frame?.remove(); this.frame = frame;
    /** Reject every late result after CSS supersession, scope removal or editor disposal. */
    const current = (): boolean => !this.disposed && this.revision === generation && scope.isConnected && scope.ownerDocument === owner && !view.closed;
    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        /** Settle the exact pending load and remove its timer/listener on every terminal path. */
        const finish = (error?: Error): void => {
          if (settled) return;
          settled = true; view.clearTimeout(timer); frame.removeEventListener("load", loaded);
          if (this.cancelLoad === cancelled) this.cancelLoad = null;
          if (error) reject(error); else resolve();
        };
        /** A loaded srcdoc is ready for parent-owned CSS injection, with scripts still disabled. */
        const loaded = (): void => finish();
        /** Closing or superseding the editor promptly settles its retired load. */
        const cancelled = (): void => finish(new Error("preview-cancelled"));
        const timer = view.setTimeout(() => finish(new Error("preview-timeout")), 3000);
        this.cancelLoad = cancelled;
        frame.addEventListener("load", loaded, { once: true });
        frame.srcdoc = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'unsafe-inline\'; img-src \'none\'; font-src \'none\'; connect-src \'none\'; frame-src \'none\'"></head><body></body></html>';
        owner.body.append(frame);
      });
      if (!current()) return null;
      const doc = frame.contentDocument, frameView = frame.contentWindow as (Window & { CSSStyleSheet: typeof CSSStyleSheet }) | null;
      if (!doc || !frameView || typeof frameView.CSSStyleSheet !== "function") throw new Error("isolation-unavailable");
      // Constructed sheets stay in the isolated realm; CSP forbids every external dependency.
      doc.adoptedStyleSheets = texts.map(/** Keep copied CSS in this exact isolated realm. */ text => { const sheet = new frameView.CSSStyleSheet(); sheet.replaceSync(text); return sheet; });
      doc.documentElement.className = owner.documentElement.className;
      doc.documentElement.dir = owner.documentElement.dir;
      const contextBudget: ContextBudget = {properties: 0, bytes: 0, limited: false};
      copyContext(owner.documentElement, doc.documentElement, contextBudget); copyContext(owner.body, doc.body, contextBudget);
      const ancestors: HTMLElement[] = [];
      for (let element: HTMLElement | null = scope; element && element !== owner.body && ancestors.length < THEME_PREVIEW_CONTEXT_LIMIT; element = element.parentElement) ancestors.unshift(element);
      if (ancestors[0]?.parentElement && ancestors[0].parentElement !== owner.body) reasons.push("context-limit");
      let target = doc.body;
      for (const original of ancestors) {
        // Only inert context containers are copied, never note content or resource-bearing DOM.
        const clone = helpers.createDiv(); clone.className = original.className;
        if (original.id) clone.id = original.id;
        copyContext(original, clone, contextBudget); target.append(clone); target = clone;
      }
      if (contextBudget.limited) reasons.push("context-limit");
      const sampled: Partial<Record<AppearanceMode, Record<string, string>>> = {};
      const sampledOpacity: Partial<Record<AppearanceMode, number>> = {};
      for (const mode of ["light", "dark"] as const) {
        doc.body.className = owner.body.className;
        doc.body.classList.remove("theme-light", "theme-dark"); doc.body.classList.add(`theme-${mode}`);
        sampled[mode] = sampleColors(target, tokens, createProbe, expressions);
        sampledOpacity[mode] = sampleOpacity(target);
      }
      if (sampledOpacity[activeMode] !== liveOpacity) reasons.push("active-context-mismatch");
      if (tokens.some(token => sampled[activeMode]?.[token] !== live[token])) reasons.push("active-context-mismatch");
      if (!current()) return null;
      const confidence = reasons.length ? "estimated" : "matched";
      const value: ThemePreviewPair = { activeMode, light: { colors: activeMode === "light" ? live : sampled.light ?? {}, compassOpacity: activeMode === "light" ? liveOpacity : sampledOpacity.light, confidence: activeMode === "light" ? "matched" : confidence },
        dark: { colors: activeMode === "dark" ? live : sampled.dark ?? {}, compassOpacity: activeMode === "dark" ? liveOpacity : sampledOpacity.dark, confidence: activeMode === "dark" ? "matched" : confidence }, reasons: [...new Set(reasons)], stylesheetCount: texts.length, cssBytes };
      this.cached = { scope, owner, tokens: key, value };
      return value;
    } catch (error) {
      if (!current()) return null;
      reasons.push(error instanceof Error && error.message === "preview-timeout" ? "preview-timeout" : "isolation-unavailable"); return fallback();
    } finally { frame.remove(); if (this.frame === frame) this.frame = null; }
  }
}
