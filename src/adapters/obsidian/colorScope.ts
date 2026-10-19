/**
 * View/editor-local CSS binding for saved color identities. Only configured unique references are
 * validated; no stylesheet enumeration, graph scan, note read or storage belongs to this owner.
 * Private properties paint live DOM/SVG. The caller supplies CSS-change subscription and disposes
 * the exact scope on close/migration. Picker movement updates local values, never theme snapshots.
 */
import { isPaletteColorId, isThemeColorName, parseLiteralColor, colorValuesEqual, type ColorValue } from "../../core/contracts/colorValue";
import { cyclicSemanticColorSlots, SEMANTIC_COLOR_SLOTS, semanticSlotForVariable, SEMANTIC_COLOR_DEFAULTS, type ColorPreferencesV1 } from "../../core/plex/colorPreferences";
import { colorValueCss, paletteColorProperty, semanticColorCss, themeColorProperty } from "./colorPresentation";

export type ColorScopeConfiguration = Readonly<{ preferences: ColorPreferencesV1; references: readonly ColorValue[] }>;
export type ColorScopeIssue = Readonly<{ source: ColorValue; reason: "invalid-name" | "missing-palette" | "invalid-color" | "semantic-cycle" }>;
export type ColorScopeOptions = Readonly<{
  mode?: "light" | "dark"; observe?: boolean;
  subscribeCss?: (changed: () => void) => () => void;
  onChange?: (issues: readonly ColorScopeIssue[]) => void;
}>;

/** One owning document/scope's aliases; dormant native defaults need no watcher or private declaration. */
export class ColorScope {
  private readonly owner: Document;
  private readonly view: Window;
  private config: ColorScopeConfiguration;
  private readonly values = new Map<string, string>();
  private observer: MutationObserver | null = null;
  private releaseCss: (() => void) | null = null;
  private frame: number | null = null;
  private disposed = false;
  private issues: readonly ColorScopeIssue[] = [];

  /** Configure one exact scope and perform a bounded first validation without changing public variables. */
  constructor(private readonly scope: HTMLElement, config: ColorScopeConfiguration, private readonly options: ColorScopeOptions = {}) {
    this.owner = scope.ownerDocument;
    const view = this.owner.defaultView;
    if (!view) throw new Error("Color scope has no owning window");
    this.view = view; this.config = config;
    try { this.refresh(); } catch (error) { this.dispose(); throw error; }
  }

  /** Publish current source choices locally; the settings queue has already decided durable ownership. */
  update(config: ColorScopeConfiguration): void { if (!this.disposed) { this.config = config; this.refresh(); } }
  /** Return repair feedback without exposing sampled values as new saved identities. */
  getIssues(): readonly ColorScopeIssue[] { return this.issues; }

  /** Coalesce real CSS/context changes; there is never an idle animation-frame loop. */
  invalidate(): void {
    if (this.disposed || this.frame !== null) return;
    this.frame = this.view.requestAnimationFrame(/** Apply the newest scope state before its next paint. */ () => { this.frame = null; this.refresh(); });
  }

  /** Release subscriptions, pending owner-window callbacks and only the private properties this owner installed. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.observer?.disconnect(); this.observer = null; this.releaseCss?.(); this.releaseCss = null;
    if (this.frame !== null) this.view.cancelAnimationFrame(this.frame); this.frame = null;
    for (const [name, value] of this.values) if (this.scope.style.getPropertyValue(name) === value) this.scope.style.removeProperty(name);
    this.values.clear();
  }

  /** Resolve custom properties as complete colors in this actual view/editor scope, once per unique source. */
  private refresh(): void {
    if (this.disposed) return;
    if (this.scope.ownerDocument !== this.owner || !this.scope.isConnected || this.view.closed) { this.dispose(); return; }
    const preferences = this.config.preferences, references = [...this.config.references];
    for (const slot of SEMANTIC_COLOR_SLOTS) { const value = preferences.semantic[slot]; if (value !== undefined) references.push(value); }
    const desired = new Map<string, string>(), issues: ColorScopeIssue[] = [], themes = new Set<string>();
    const pairs = new Map(preferences.palette.map(/** Palette labels never become CSS identities. */ pair => [pair.id, pair]));
    const mode = this.options.mode ?? (this.owner.body.classList.contains("theme-light") ? "light" : "dark");
    for (const source of references) {
      if (typeof source === "string") continue;
      if (source.kind === "palette") {
        const pair = isPaletteColorId(source.id) ? pairs.get(source.id) : undefined;
        if (!pair || !parseLiteralColor(pair[mode])) issues.push({ source, reason: "missing-palette" });
        else desired.set(paletteColorProperty(source.id), pair[mode]);
      } else if (source.kind === "theme") {
        if (!isThemeColorName(source.variable) || source.variable.startsWith("--_kplex-")) issues.push({ source, reason: "invalid-name" });
        else themes.add(source.variable);
      }
    }
    const cycles = new Set(cyclicSemanticColorSlots(preferences));
    const semanticNeeded = themes.size > 0 || SEMANTIC_COLOR_SLOTS.some(slot => preferences.semantic[slot] !== undefined);
    if (semanticNeeded) {
      const computed = this.view.getComputedStyle(this.scope), probe = this.scope.createSpan({ attr: { "aria-hidden": "true" } });
      probe.setCssStyles({ position: "fixed", left: "-100000px", visibility: "hidden", pointerEvents: "none" });
      /** Reject defined non-colors before they can poison a valid consumer's variable fallback. */
      const validColor = (raw: string): boolean => {
        probe.style.removeProperty("color"); if (raw) probe.style.setProperty("color", raw);
        return !!probe.style.getPropertyValue("color");
      };
      try {
        for (const slot of SEMANTIC_COLOR_SLOTS) {
          const publicName = `--kplex-semantic-${slot}`;
          const fallback = validColor(computed.getPropertyValue(publicName).trim()) ? `var(${publicName})`
            : validColor(computed.getPropertyValue(SEMANTIC_COLOR_DEFAULTS[slot]).trim()) ? `var(${SEMANTIC_COLOR_DEFAULTS[slot]})` : "var(--text-normal)";
          const value = preferences.semantic[slot];
          if (value !== undefined && cycles.has(slot)) issues.push({ source: value, reason: "semantic-cycle" });
          desired.set(`--_kplex-color-semantic-${slot}`, value === undefined || cycles.has(slot) ? fallback : colorValueCss(value, fallback));
        }
        // Validate ordinary inputs first so the finite semantic chain can report its true cause.
        for (const variable of themes) {
          if (semanticSlotForVariable(variable)) continue;
          if (validColor(computed.getPropertyValue(variable).trim())) desired.set(themeColorProperty(variable), `var(${variable})`);
          else issues.push({ source: { kind: "theme", variable }, reason: "invalid-color" });
        }
        /** Trace at most four configured slots; this is source repair feedback, never graph semantics. */
        const semanticIssue = (slot: typeof SEMANTIC_COLOR_SLOTS[number], seen = new Set<string>()): ColorScopeIssue["reason"] | undefined => {
          if (cycles.has(slot) || seen.has(slot)) return "semantic-cycle";
          const value = preferences.semantic[slot]; if (value === undefined || typeof value === "string") return undefined;
          const existing = issues.find(issue => colorValuesEqual(issue.source, value)); if (existing) return existing.reason;
          const dependency = value.kind === "theme" ? semanticSlotForVariable(value.variable) : undefined;
          return dependency === undefined ? undefined : semanticIssue(dependency, new Set([...seen, slot]));
        };
        for (const variable of themes) {
          const slot = semanticSlotForVariable(variable); if (!slot) continue;
          desired.set(themeColorProperty(variable), semanticColorCss(slot));
          const reason = semanticIssue(slot); if (reason) issues.push({source: {kind: "theme", variable}, reason});
        }
      } finally { probe.remove(); }
    }
    // There is no await: all earlier external mutations are included in the computed snapshot.
    // Disconnecting only for our own property writes prevents a self-triggered observer loop.
    this.observer?.disconnect();
    for (const name of this.values.keys()) if (!desired.has(name)) this.scope.style.removeProperty(name);
    for (const [name, value] of desired) if (this.scope.style.getPropertyValue(name) !== value) this.scope.style.setProperty(name, value);
    this.values.clear(); for (const [name, value] of desired) this.values.set(name, value);
    this.issues = issues;
    const watching = this.options.observe !== false && references.some(/** Literals alone follow normal CSS with no JavaScript mode watcher. */ source => typeof source !== "string");
    if (watching) {
      if (!this.observer) {
        const constructors = this.view as Window & { MutationObserver: typeof MutationObserver };
        this.observer = new constructors.MutationObserver(/** Observe only theme-relevant context attributes, never child/note mutations. */ records => { if (records.some(record => record.attributeName === "class" || record.attributeName === "style" || /^data-(theme|color|style|css)(-|$)/.test(record.attributeName ?? ""))) this.invalidate(); });
      }
      const targets = new Set<HTMLElement>([this.owner.documentElement, this.owner.body]);
      for (let element: HTMLElement | null = this.scope, depth = 0; element && depth < 32; element = element.parentElement, depth++) targets.add(element);
      for (const target of targets) this.observer.observe(target, { attributes: true });
      this.releaseCss ??= this.options.subscribeCss?.(/** Loaded stylesheet changes share the same coalesced local validation. */ () => this.invalidate()) ?? null;
    } else { this.releaseCss?.(); this.releaseCss = null; }
    this.options.onChange?.(issues);
  }
}
