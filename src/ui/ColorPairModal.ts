/** Native detached named-pair editor; both literal controls and previews share the existing color owners. */
import {recommendColorCounterpart} from "../core/plex/colorCounterpart";
import {Setting, type App, type ButtonComponent} from "obsidian";
import {StyleEditorModal, type StyleCommitResult} from "./StyleEditorModal";
import {ColorLiteralEditor, type LiteralColorLabels} from "./ColorLiteralEditor";
import {ColorPreview, type ColorPreviewOptions} from "./ColorPreview";
import type {SemanticColorPair} from "../core/plex/colorPreferences";

export type ColorPairModalOptions = Omit<ColorPreviewOptions, "target"> & Readonly<{
  isNew?: boolean;
  title: string; initial: SemanticColorPair;
  subscribeCss?: (changed: () => void) => () => void;
  subscribeColors?: (changed: () => void) => () => void;
  onSave: (edited: SemanticColorPair, current: () => boolean) => Promise<StyleCommitResult>;
  onClosed?: () => void;
}>;

/** Local variants never overwrite each other or become durable before explicit Save. */
export class ColorPairModal extends StyleEditorModal {
  private readonly draft: SemanticColorPair;
  private readonly literals: ColorLiteralEditor[] = [];
  private preview: ColorPreview | null = null;
  private save: ButtonComponent | null = null;
  private releaseCss: (() => void) | null = null;
  private opened = false;
  private releaseColors: (() => void) | null = null;

  /** Stable ID and exact opening literals are copied, independently of palette rename or other writers. */
  constructor(app: App, private readonly options: ColorPairModalOptions) { super(app); this.draft = {...options.initial}; }

  /** Mount two explicit RGB/alpha controls and one paired real-use preview, with no initialization writes. */
  onOpen(): void {
    this.opened = true; this.beginEditor(this.options.sourceScope, this.options.bindEditor); this.modalEl.addClass("kplex-color-modal"); this.titleEl.setText(this.options.title);
    const t = this.options.translate;
    new Setting(this.contentEl).setName(t("colors.name")).addText(text => {
      text.setValue(this.draft.name); text.inputEl.maxLength = 100; text.inputEl.setAttribute("aria-label", t("colors.name"));
      text.onChange(value => { if (!this.canEdit()) return; this.draft.name = value; this.refreshSave(); });
    });
    const labels: LiteralColorLabels = {rgb: t("colors.rgb"), value: t("colors.value"), opacity: t("colors.opacity"),
      reset: t("colors.resetVariant"), invalid: t("colors.invalidLiteral"), legacy: t("colors.legacyLiteral")};
    for (const mode of ["light", "dark"] as const) this.literals.push(new ColorLiteralEditor(this.contentEl, {
      label: t(`colors.${mode}`), initial: this.options.initial[mode], labels,
      onChange: value => { if (!this.canEdit()) return; this.draft[mode] = value; this.preview?.update({kind: "palette", id: this.draft.id}); this.refreshSave(); },
    }));
    new Setting(this.contentEl).setName(t("colors.recommend")).setDesc(t("colors.recommendHelp"))
      .addButton(button => button.setButtonText(t("colors.suggestDark")).onClick(() => this.recommend("light")))
      .addButton(button => button.setButtonText(t("colors.suggestLight")).onClick(() => this.recommend("dark")));
    this.contentEl.createEl("h3", {text: t("colors.usagePreview")});
    this.contentEl.createDiv({text: t("colors.pairPreviewHelp"), cls: "setting-item-description"});
    this.preview = new ColorPreview(this.contentEl, {...this.options, target: {kind: "node", field: "backgroundColor"}, pairDraft: () => this.draft}, {kind: "palette", id: this.draft.id});
    new Setting(this.contentEl).setName(t("colors.resetPair")).setDesc(t("colors.resetPairHelp"))
      .addButton(button => button.setButtonText(t("colors.resetPair")).onClick(() => { if (this.canEdit()) for (const literal of this.literals) literal.reset(); }));
    new Setting(this.contentEl).addButton(button => button.setButtonText(t("common.cancel")).onClick(() => this.close()))
      .addButton(button => { this.save = button; button.setButtonText(t("common.save")).setCta().onClick(() => this.submit()); });
    this.releaseCss = this.options.subscribeCss?.(() => this.preview?.invalidate()) ?? null;
    this.releaseColors = this.options.subscribeColors?.(() => this.preview?.refreshSources()) ?? null;
    this.refreshSave();
  }

  /** An explicit direction replaces only the opposite local draft; reset and Cancel remain available. */
  private recommend(from: "light" | "dark"): void {
    if (!this.canEdit()) return;
    const index = from === "light" ? 0 : 1, source = this.literals[index];
    if (!source?.isValid()) return;
    const recommended = recommendColorCounterpart(source.getValue());
    if (recommended !== null) this.literals[1 - index]?.setValue(recommended);
  }

  /** A failed durable write retains both complete/partial drafts for repair or retry. */
  protected onOperationRejected(): void { for (const literal of this.literals) literal.setDisabled(false); this.refreshSave(); }

  /** Retire every converter, isolated snapshot and native callback exactly once. */
  onClose(): void {
    super.onClose(); if (!this.opened) return; this.opened = false;
    this.releaseColors?.(); this.releaseColors = null;
    this.releaseCss?.(); this.releaseCss = null; this.preview?.dispose(); this.preview = null;
    for (const literal of this.literals) literal.dispose(); this.literals.length = 0; this.save = null;
    this.contentEl.empty(); this.options.onClosed?.();
  }

  /** Validation never rewrites the user's active field or moves its caret. */
  private refreshSave(): void { this.save?.setDisabled(!this.canEdit() || !this.draft.name.trim() || this.draft.name.length > 100 || this.literals.some(literal => !literal.isValid())); }

  /** Freeze one captured pair; the queue callback merges changed fields against the current pair. */
  private submit(): void {
    if (!this.canEdit() || !this.draft.name.trim() || this.draft.name.length > 100 || this.literals.some(literal => !literal.isValid())) return;
    const captured = {...this.draft, name: this.draft.name.trim()};
    if (!this.options.isNew && ["name", "light", "dark"].every(field => Reflect.get(captured, field) === Reflect.get(this.options.initial, field))) {this.close(); return;}
    for (const literal of this.literals) literal.setDisabled(true);
    this.runOperation(current => this.options.onSave(captured, current));
  }
}
