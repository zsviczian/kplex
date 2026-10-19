/** Searchable native named-palette manager; only bounded metadata rows render and all writes use the supplied queue. */
import {renderColorStrips} from "./ColorSwatchList";
import {Notice, type App} from "obsidian";
import {StyleEditorModal, type StyleCommitResult} from "./StyleEditorModal";
import {ColorPairModal} from "./ColorPairModal";
import {ColorSourceModal} from "./ColorSourceModal";
import {type ColorPreviewOptions} from "./ColorPreview";
import {collectionWindow} from "./components/collectionWindow";
import {deleteNamedColor, namedColorUsage, saveNamedColor} from "../core/plex/colorEditing";
import type {SemanticColorPair} from "../core/plex/colorPreferences";
import type {StyleSettingsDraft} from "../settings";

export type ColorPaletteModalOptions = Omit<ColorPreviewOptions, "target"> & Readonly<{
  read: () => StyleSettingsDraft; readOnly: () => boolean; canDelete: () => boolean;
  write: (edit: (draft: StyleSettingsDraft) => void) => Promise<StyleCommitResult>;
  subscribe: (changed: () => void) => () => void;
  subscribeCss?: (changed: () => void) => () => void;
  onClosed?: () => void;
}>;

/** One native palette lifetime owns children, metadata subscription and current search window. */
export class ColorPaletteModal extends StyleEditorModal {
  private readonly children = new Set<StyleEditorModal>();
  private list: HTMLElement | null = null;
  private footer: HTMLElement | null = null;
  private summary: HTMLElement | null = null;
  private add: HTMLButtonElement | null = null;
  private release: (() => void) | null = null;
  private query = "";
  private visibleLimit = 12;
  private opened = false;
  private renderedRevision = 0;

  /** Supply current data and the existing writer, never a plugin instance or alternate settings store. */
  constructor(app: App, private readonly options: ColorPaletteModalOptions) { super(app); }

  /** Mount a searchable manager without expanding every configured pair in the settings page. */
  onOpen(): void {
    this.opened = true; this.beginEditor(this.options.sourceScope, this.options.bindEditor); this.modalEl.addClass("kplex-palette-modal");
    const t = this.options.translate; this.titleEl.setText(t("colors.namedColors"));
    this.summary = this.contentEl.createDiv({cls: "setting-item-description"});
    const controls = this.contentEl.createDiv({cls: "kplex-palette-controls"});
    const search = controls.createEl("input", {attr: {type: "search", placeholder: t("colors.searchColors"), "aria-label": t("colors.searchColors")}});
    search.addEventListener("input", () => { if (!this.canEdit()) return; this.query = search.value; this.visibleLimit = 12; this.renderRows(); });
    this.add = controls.createEl("button", {text: t("colors.add"), attr: {type: "button"}});
    this.add.addEventListener("click", () => { if (this.canEdit() && !this.options.readOnly()) this.editPair(null); });
    this.list = this.contentEl.createDiv({cls: "kplex-palette-list"}); this.footer = this.contentEl.createDiv();
    this.release = this.options.subscribe(() => { if (this.canEdit()) this.renderRows(); }); this.renderRows();
  }

  /** Retire every child before removing manager controls or old-window context. */
  onClose(): void {
    super.onClose(); if (!this.opened) return; this.opened = false;
    this.release?.(); this.release = null; for (const child of this.children) child.retire(); this.children.clear();
    this.list = null; this.footer = null; this.summary = null; this.add = null; this.contentEl.empty(); this.options.onClosed?.();
  }

  /** One configuration-only usage pass supplies all bounded visible rows, including semantic/compass/lens uses. */
  private renderRows(): void {
    if (!this.list || !this.footer || !this.summary || !this.add) return;
    const t = this.options.translate, preferences = this.options.preferences(), readOnly = this.options.readOnly();
    const canDelete = this.options.canDelete();
    const uses = namedColorUsage(this.options.read()), query = this.query.trim().toLocaleLowerCase();
    const pairs = preferences.palette.filter(pair => pair.name.toLocaleLowerCase().includes(query));
    const window = collectionWindow(pairs, this.visibleLimit, 12);
    this.summary.setText(readOnly ? t("colors.readOnly") : t("colors.pairCount", {count: preferences.palette.length}));
    this.add.disabled = readOnly || preferences.palette.length >= 5000; this.list.empty(); this.footer.empty();
    if (!pairs.length) this.list.createDiv({text: t("colors.noColors"), cls: "setting-item-description"});
    for (const pair of window.visible) {
      const row = this.list.createDiv({cls: "kplex-palette-row", attr: {"data-kplex-color-id": pair.id}});
      const name = row.createEl("button", {text: pair.name, cls: "kplex-palette-name", attr: {type: "button"}}); name.disabled = readOnly;
      name.addEventListener("click", () => { if (this.canEdit() && !this.options.readOnly()) this.editPair(pair); });
      renderColorStrips(row.createDiv(), t, {light: [{label: pair.name, color: pair.light}], dark: [{label: pair.name, color: pair.dark}]});
      row.createSpan({text: t("colors.uses", {count: uses.get(pair.id) ?? 0}), cls: "setting-item-description"});
      const duplicate = row.createEl("button", {text: t("colors.duplicate"), attr: {type: "button"}}); duplicate.disabled = readOnly || preferences.palette.length >= 5000;
      duplicate.addEventListener("click", () => { if (this.canEdit() && !this.options.readOnly()) this.editPair(null, pair); });
      const remove = row.createEl("button", {text: t("common.delete"), attr: {type: "button"}}); remove.disabled = readOnly || !canDelete;
      remove.addEventListener("click", () => { if (this.canEdit() && !this.options.readOnly() && this.options.canDelete()) this.deletePair(pair); });
    }
    this.renderedRevision++;
    if (window.remaining) {
      const more = this.footer.createEl("button", {text: t("colors.showMore", {count: window.nextCount}), attr: {type: "button"}});
      more.addEventListener("click", () => { if (!this.canEdit()) return; this.visibleLimit += window.nextCount; this.renderRows(); });
    }
  }

  /** New stable IDs never derive from labels or color values; copy/rename preserves reference identity. */
  private newId(): string {
    const view = this.modalEl.ownerDocument.defaultView; if (!view) throw new Error("Color manager has no owning window");
    return "color-" + Array.from(view.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  /** Editing merges changed fields at the queue boundary; duplicate creates an independent new identity. */
  private editPair(initial: SemanticColorPair | null, duplicate?: SemanticColorPair): void {
    const t = this.options.translate;
    const seed = initial ?? {id: this.newId(), name: duplicate ? t("colors.copyName", {name: duplicate.name}) : "",
      light: duplicate?.light ?? "#6688aa", dark: duplicate?.dark ?? "#6688aa"};
    const opening = initial ? {...initial} : null;
    const dialog = new ColorPairModal(this.app, {...this.options, initial: {...seed}, isNew: !opening, title: t(initial ? "colors.editPair" : "colors.add"),
      onSave: edited => this.writeAndRefresh(draft => saveNamedColor(draft, opening, edited)),
      onClosed: () => this.children.delete(dialog),
    });
    this.children.add(dialog); dialog.open();
  }

  /** Publication already refreshes subscribed rows; a later UI error remains a saved outcome. */
  private async writeAndRefresh(edit: (draft: StyleSettingsDraft) => void): Promise<StyleCommitResult> {
    const rendered = this.renderedRevision, result = await this.options.write(edit);
    try {if (this.canEdit() && this.renderedRevision === rendered) this.renderRows(); return result;}
    catch (error) {console.error("K-Plex saved palette refresh failed", error); return {refreshPending: true};}
  }

  /** In-use deletion requires an explicit replacement; the latest queue recount/rewrite is atomic. */
  private deletePair(pair: SemanticColorPair): void {
    const t = this.options.translate, uses = namedColorUsage(this.options.read()).get(pair.id) ?? 0;
    const dialog = new ColorSourceModal(this.app, {...this.options, title: t("colors.deletePair"), target: {kind: "node", field: "backgroundColor"},
      initial: uses ? {kind: "palette", id: pair.id} : undefined,
      confirmation: {description: t("colors.deleteUses", {name: pair.name, count: uses}), actionLabel: t("common.delete")},
      acceptSource: source => !(source && typeof source !== "string" && source.kind === "palette" && source.id === pair.id),
      onSave: replacement => this.writeAndRefresh(draft => {
        if (!this.options.canDelete()) throw new Error("Unsupported color sources prevent safe deletion");
        if (!uses && replacement === undefined && (namedColorUsage(draft).get(pair.id) ?? 0) > 0) {
          if (this.canEdit()) new Notice(t("colors.deleteNowUsed"));
          throw new Error("Color acquired new uses; explicit replacement required");
        }
        deleteNamedColor(draft, pair.id, replacement);
      }),
      onClosed: () => this.children.delete(dialog),
    });
    this.children.add(dialog); dialog.open();
  }
}
