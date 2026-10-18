/**
 * Settings-only paired swatches and palette strips. One visible native page shares the existing
 * bounded CSS sampler; rows supply current values/fallbacks. No graph, note, persistence or startup
 * work is acquired. Native render cleanup/window teardown retires subscriptions and pending samples.
 */
import {ThemePreviewSampler, type ThemePreviewPair} from "../adapters/obsidian/themePreview";
import {sampledColorValue} from "../adapters/obsidian/sampledColorValue";
import {isThemeColorName, colorIdentityText, type ColorValue} from "../core/contracts/colorValue";
import {SEMANTIC_COLOR_DEFAULTS} from "../core/plex/colorPreferences";
import type {Translator} from "../lang";
import type {StyleColorContext} from "./StyleColorControls";
import type {ColorPreferencesV1} from "../core/plex/colorPreferences";

export type ColorSwatchItem = Readonly<{id?: string; label: string; value: ColorValue | undefined; inherit?: ColorValue; fallback: string}>;

export type ResolvedSwatch = Readonly<{label: string; color: string}>;

/** Reuse the exact labelled dual-strip markup for sampled settings sources and literal palette pairs. */
export function renderColorStrips(element: HTMLElement, translate: Translator, colors: Readonly<Record<"light" | "dark", readonly ResolvedSwatch[]>>): void {
  element.empty(); element.addClass("kplex-color-strips");
  for (const mode of ["light", "dark"] as const) {
    const row = element.createDiv({cls: "kplex-color-strip"});
    row.createSpan({text: translate(`colors.${mode}`), cls: "kplex-color-strip-label"});
    const cells = row.createDiv({cls: "kplex-color-strip-cells"});
    for (const item of colors[mode]) {
      const swatch = cells.createSpan({cls: "kplex-color-swatch", attr: {role: "img", "aria-label": `${translate(`colors.${mode}`)} · ${item.label}`}});
      if (item.color) swatch.style.setProperty("--kplex-color-swatch", item.color); else swatch.setText("?");
    }
  }
}

/** One small visible list coalesces row construction into one preview harvest, never one per swatch. */
export class ColorSwatchList {
  private readonly sampler = new ThemePreviewSampler();
  private readonly rows = new Map<HTMLElement, {read: () => readonly ColorSwatchItem[]; preferences: () => ColorPreferencesV1}>();
  private readonly releases: Array<() => void> = [];
  private queued = false;
  private snapshot: {key: string; pending: Promise<ThemePreviewPair | null>} | null = null;
  private generation = 0;
  private disposed = false;

  /** Capture an actual mounted native page, with narrow read-only color/CSS capabilities. */
  constructor(private readonly scope: HTMLElement, private readonly context: StyleColorContext, private readonly onDisposed?: () => void) {
    this.releases.push(context.subscribeColors?.(() => this.refresh()) ?? (() => {}));
    this.releases.push(context.subscribeCss?.(() => this.refresh(true)) ?? (() => {}));
    const view = scope.ownerDocument.defaultView;
    if (view) {
      const changed = (): void => this.refresh(true);
      const observer = new (view as Window & {MutationObserver: typeof MutationObserver}).MutationObserver(changed);
      for (const element of new Set([scope.ownerDocument.body, scope.ownerDocument.documentElement, scope])) observer.observe(element, {attributes: true});
      const closed = (): void => this.dispose();
      view.addEventListener("pagehide", closed, {once: true});
      this.releases.push(/** Release exact owning-document registrations even if native row teardown is skipped. */ () => {observer.disconnect(); view.removeEventListener("pagehide", closed);});
    }
  }

  /** Register one pair or sequence; the same renderer is used for properties and parent summaries. */
  add(element: HTMLElement, read: () => readonly ColorSwatchItem[], preferences = this.context.preferences): () => void {
    this.rows.set(element, {read, preferences}); element.addClass("kplex-color-strips"); this.refresh();
    return /** Native row cleanup removes its exact registration without affecting peers. */ () => {this.rows.delete(element); if (!this.rows.size) this.dispose();};
  }

  /** Local parent drafts repaint through the same bounded list owner. */
  update(): void { this.refresh(); }

  /** Native suggestion queries replace their visible rows while retaining this owner's sample cache. */
  clear(): void { this.rows.clear(); this.generation++; }

  /** Release pending isolated work and every page subscription exactly once. */
  dispose(): void {
    if (this.disposed) return; this.disposed = true; this.generation++; this.snapshot = null; this.sampler.dispose();
    for (const release of this.releases.splice(0)) release(); this.rows.clear(); this.onDisposed?.();
  }

  /** Batch synchronous native row creation and reharvest only real CSS changes, never ordinary input. */
  private refresh(cssChanged = false): void {
    if (this.disposed) return;
    if (cssChanged) {this.snapshot = null; this.sampler.invalidate();}
    if (this.queued) return; this.queued = true;
    this.scope.ownerDocument.defaultView?.queueMicrotask(/** Native page construction has attached all sibling descriptions before this bounded read. */ () => {
      this.queued = false; if (!this.disposed) void this.paint();
    });
  }

  /** Resolve only visible configured sources and at most the sampler's established token/expression budgets. */
  private async paint(): Promise<void> {
    const generation = ++this.generation;
    const rows = [...this.rows].filter(([element]) => element.isConnected).map(([element, row]) => ({element, items: row.read(), preferences: row.preferences()}));
    if (!rows.length || !this.scope.isConnected) return;
    const tokens = new Set<string>(Object.values(SEMANTIC_COLOR_DEFAULTS));
    const expressions: Record<string, string> = {}, fallbacks = new Map<string, string>();
    for (const {items} of rows) for (const item of items) if (!fallbacks.has(item.fallback)) {
      const key = `--kplex-swatch-${fallbacks.size}`; fallbacks.set(item.fallback, key); expressions[key] = item.fallback;
    }
    for (const value of rows.flatMap(row => [...row.items.flatMap(item => [item.value, item.inherit]), ...Object.values(row.preferences.semantic)]))
      if (value && typeof value !== "string" && value.kind === "theme" && isThemeColorName(value.variable)) tokens.add(value.variable);
    try {
      const key = JSON.stringify([[...tokens].sort(), expressions]);
      if (this.snapshot?.key !== key) this.snapshot = {key, pending: this.sampler.sample(this.scope, [...tokens].sort(), expressions)};
      const samples = await this.snapshot.pending;
      if (this.disposed || generation !== this.generation) return;
      for (const {element, items, preferences} of rows) {
        if (!element.isConnected || !this.rows.has(element)) continue;
        const colors = {light: [] as ResolvedSwatch[], dark: [] as ResolvedSwatch[]};
        for (const mode of ["light", "dark"] as const) for (const item of items) {
          const fallback = samples?.[mode].colors[fallbacks.get(item.fallback) ?? ""] || "";
          colors[mode].push({color: sampledColorValue(item.value, mode, samples, preferences, sampledColorValue(item.inherit, mode, samples, preferences, fallback)),
            label: `${item.label} · ${colorIdentityText(item.value, preferences.palette) || this.context.translate("colors.inherit")}`});
        }
        renderColorStrips(element, this.context.translate, colors);
      }
    } catch { /* A retired or unavailable theme snapshot cannot mutate preferences or escape into native navigation. */ }
  }
}
