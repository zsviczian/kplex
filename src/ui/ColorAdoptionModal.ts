/**
 * One native source-reset confirmation for standard adoption and scoped theme color resets.
 * Callers supply detached affected/preview projections and the established durable writer. This
 * shell never samples colors into settings or clears geometry, rules, palettes or note content.
 */
import {Setting, type App, type ButtonComponent} from "obsidian";
import {StyleEditorModal, type StyleCommitResult} from "./StyleEditorModal";
import {ColorPreview, type ColorPreviewTarget} from "./ColorPreview";
import type {StyleColorContext} from "./StyleColorControls";
import {withoutStyleColorOverrides} from "../core/plex/colorEditing";
import {NODE_COLOR_FIELDS, LINK_COLOR_FIELDS, type ColorValue} from "../core/contracts/colorValue";
import type {ColorResetScope} from "../core/plex/appearanceThemes";
import {collectionWindow} from "./components/collectionWindow";

/** Extend the existing confirmation, retaining its narrow base-only constructor for the shortcut. */
export type ScopedColorAdoption = Readonly<{
  initial: ColorResetScope;
  baseShortcut?: boolean;
  preview: (scope: ColorResetScope) => Readonly<{slots: readonly string[]; context: StyleColorContext; target: ColorPreviewTarget; value: ColorValue | undefined}>;
  save: (scope: ColorResetScope, current: () => boolean) => Promise<StyleCommitResult>;
}>;

/** A local scope/preview must be explicitly confirmed; failed writes keep that same draft visible. */
export class ColorAdoptionModal extends StyleEditorModal {
  private preview: ColorPreview | null = null;
  private release: (() => void) | null = null;
  private scopeChoice: ColorResetScope;
  private affected: readonly string[] = [];
  private display: HTMLElement | null = null;
  private confirm: ButtonComponent | null = null;

  /** Reuse the exact old shortcut and queue contract; theme reset opts into the three bounded scopes. */
  constructor(app: App, private readonly context: StyleColorContext, private readonly slots: readonly string[],
    private readonly save: (current: () => boolean) => Promise<StyleCommitResult>, private readonly closed: () => void, private readonly scoped?: ScopedColorAdoption) {
    super(app); this.scopeChoice = scoped?.initial ?? "base";
  }

  /** Keep native confirmation actions visible while the affected list and shared previews scroll. */
  onOpen(): void {
    this.beginEditor(this.context.sourceScope, this.context.bindEditor); this.modalEl.addClass("kplex-color-modal");
    const t = this.context.translate; this.titleEl.setText(t(this.scoped && !this.scoped.baseShortcut ? "themes.reset" : "colors.adopt"));
    const {body, actions} = this.scrollableContent();
    body.createDiv({text: t(this.scoped && !this.scoped.baseShortcut ? "themes.resetHelp" : "colors.adoptHelp"), cls: "setting-item-description"});
    const help = {base: "themes.resetBaseHelp", semantic: "themes.resetSemanticHelp", all: "themes.resetAllHelp"} as const;
    if (this.scoped && !this.scoped.baseShortcut) {const choice = new Setting(body).setName(t("themes.resetScope")).setDesc(t(help[this.scopeChoice])); choice.addDropdown(/** Scope selection changes only the detached preview and reviewed inventory. */ dropdown => {
      dropdown.addOptions({base: t("themes.resetBase"), semantic: t("themes.resetSemantic"), all: t("themes.resetAll")}).setValue(this.scopeChoice)
        .onChange(/** Pending and stale confirmations cannot retarget their already captured operation. */ value => {if (this.canEdit() && (value === "base" || value === "semantic" || value === "all")) {this.scopeChoice = value; choice.setDesc(t(help[value])); this.paint();}});
      dropdown.selectEl.setAttribute("aria-label", t("themes.resetScope"));
    });}
    this.display = body.createDiv();
    new Setting(actions).addButton(button => button.setButtonText(t("common.cancel")).onClick(() => this.close()))
      .addButton(/** The single durable confirmation owner applies only the reviewed scope. */ button => {
        this.confirm = button; button.setButtonText(t(this.scoped && !this.scoped.baseShortcut ? "themes.reset" : "colors.adoptConfirm")).setDestructive().onClick(() => {
          if (!this.canEdit() || !this.affected.length) return;
          const scope = this.scopeChoice, scoped = this.scoped; this.runOperation(scoped ? current => scoped.save(scope, current) : this.save);
        });
      });
    this.paint(); this.release = this.context.subscribeCss?.(/** CSS changes refresh the existing preview, never durable colors. */ () => this.preview?.invalidate()) ?? null;
  }

  /** Reuse ColorPreview and window the human-readable affected scope rather than building a second picker. */
  private paint(): void {
    if (!this.display || !this.canEdit()) return;
    this.preview?.dispose(); this.preview = null; this.display.empty(); const t = this.context.translate;
    const source = this.scoped?.preview(this.scopeChoice) ?? {slots: this.slots, target: {kind: "canvas" as const}, value: undefined,
      context: {...this.context, nodeStyle: () => withoutStyleColorOverrides(this.context.nodeStyle(), NODE_COLOR_FIELDS),
        linkStyle: () => withoutStyleColorOverrides(this.context.linkStyle(), LINK_COLOR_FIELDS), background: () => undefined}};
    this.affected = source.slots;
    if (!this.affected.length) this.display.createDiv({text: t(this.scoped ? "themes.noCustomColors" : "colors.alreadyNative"), cls: "setting-item-description"});
    if (this.scopeChoice !== "semantic") this.display.createDiv({text: t("themes.baseWarning"), cls: "setting-item-description"});
    const details = this.display.createEl("details"); details.createEl("summary", {text: t("colors.affected", {count: this.affected.length})});
    const list = details.createEl("ul"); let limit = 20;
    /** Only explicit Show more expands the same reviewed inventory, without reading any vault data. */
    const render = (): void => {
      list.empty(); const windowed = collectionWindow(this.affected, limit, 20);
      for (const slot of windowed.visible) list.createEl("li", {text: slot});
      if (windowed.remaining) list.createEl("li").createEl("button", {text: t("collection.showMore", {count: windowed.nextCount}), attr: {type: "button"}})
        .addEventListener("click", /** Retired or pending confirmations cannot mutate local disclosure state. */ () => {if (this.canEdit()) {limit += 20; render();}});
    };
    render(); this.display.createEl("h3", {text: t(this.scoped ? "themes.afterReset" : "colors.afterAdoption")});
    this.preview = new ColorPreview(this.display, {...source.context, target: source.target}, source.value); this.confirm?.setDisabled(!this.affected.length);
  }

  /** Retire isolated sampling and subscriptions before native control removal. */
  onClose(): void {super.onClose(); this.release?.(); this.release = null; this.preview?.dispose(); this.preview = null; this.display = null; this.contentEl.empty(); this.closed();}
}
