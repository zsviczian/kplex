/** Detached parent-style color fields; every native child reuses the single source editor. */
import {ColorSwatchList, type ColorSwatchItem} from "./ColorSwatchList";
import {nodeColorFallback, NATIVE_LINK_STROKE, NATIVE_LINK_TEXT, NATIVE_CANVAS_FILL} from "../index/style";
import {COMPASS_COLOR_VARIABLES, COMPASS_SEMANTIC_SLOTS, SEMANTIC_COLOR_DEFAULTS, type CompassDirection} from "../core/plex/colorPreferences";
import type {App} from "obsidian";
import {ColorSourceModal} from "./ColorSourceModal";
import type {ColorPreviewOptions, ColorPreviewTarget} from "./ColorPreview";
import {colorIdentityText, type ColorValue} from "../core/contracts/colorValue";

export type StyleColorContext = Omit<ColorPreviewOptions, "target"> & Readonly<{
  subscribeCss?: (changed: () => void) => () => void;
  subscribeColors?: (changed: () => void) => () => void;
}>;

/** Both Settings and editors resolve direction token → semantic slot → native hue through the same paired swatch. */
export function compassSwatchItem(label: string, direction: CompassDirection, value: ColorValue | undefined): ColorSwatchItem {
  const slot = COMPASS_SEMANTIC_SLOTS[direction];
  return {label, value: value ?? {kind: "theme", variable: COMPASS_COLOR_VARIABLES[direction]},
    inherit: {kind: "theme", variable: `--kplex-semantic-${slot}`}, fallback: `var(${SEMANTIC_COLOR_DEFAULTS[slot]}, var(--text-normal))`};
}

/** Parent owns the draft and lifetime; selecting a source never writes settings by itself. */
export class StyleColorControls {
  private readonly dialogs = new Set<ColorSourceModal>();
  private alive = true;
  private readonly swatches: ColorSwatchList;
  private readonly refreshers = new Set<() => void>();
  private releaseColors: (() => void) | null = null;

  /** Capture narrow preview/data ports without acquiring a plugin, graph or settings writer. */
  constructor(private readonly app: App, private readonly context: StyleColorContext, private readonly canEdit: () => boolean) {
    this.swatches = new ColorSwatchList(context.sourceScope, context);
    this.releaseColors = context.subscribeColors?.(() => {if (this.alive) for (const refresh of this.refreshers) refresh();}) ?? null;
  }

  /** Render one source-identity action, using current lower-layer paint for Default. */
  add(container: HTMLElement, label: string, target: ColorPreviewTarget,
    read: () => ColorValue | undefined, write: (value: ColorValue | undefined) => void,
    inherit: () => ColorValue | undefined): void {
    const row = container.createDiv({cls: "kplex-style-row"});
    row.createSpan({text: label});
    const fallback = target.kind === "node" ? nodeColorFallback(target.field, this.context.fallbacks) : target.kind === "link" ? target.field === "textColor" ? NATIVE_LINK_TEXT : NATIVE_LINK_STROKE : NATIVE_CANVAS_FILL;
    this.swatches.add(row.createDiv(), /** Directional defaults retain their semantic fallback instead of sampling the canvas as all four fills. */ () => target.kind === "compass" ? [compassSwatchItem(label, target.direction ?? "north", read())] : [{label, value: read(), inherit: inherit(), fallback}]);
    const button = row.createEl("button", {attr: {type: "button", "aria-label": label}});
    const refresh = (): void => {const value = read(); button.setText(colorIdentityText(value, this.context.preferences().palette) || this.context.translate(value === undefined ? "colors.inherit" : "colors.unsupportedSource"));};
    this.refreshers.add(refresh); refresh();
    button.addEventListener("click", () => {
      if (!this.alive || !this.canEdit()) return;
      const dialog = new ColorSourceModal(this.app, {...this.context, target, inherit,
        title: label, initial: read(), help: this.context.translate("colors.parentHelp"), actionLabel: this.context.translate("colors.useColor"),
        onSave: async source => {
          if (!this.alive || !this.canEdit()) throw new Error("Parent style editor retired");
          write(source); refresh(); this.swatches.update(); return {refreshPending: false};
        },
        onClosed: () => this.dialogs.delete(dialog),
      });
      this.dialogs.add(dialog); dialog.open();
    });
  }

  /** Retire children before parent Save/close/migration; late callbacks cannot mutate a captured draft. */
  dispose(): void { if (!this.alive) return; this.alive = false; this.swatches.dispose(); this.releaseColors?.(); this.releaseColors = null; this.refreshers.clear(); for (const dialog of this.dialogs) dialog.retire(); this.dialogs.clear(); }
}
