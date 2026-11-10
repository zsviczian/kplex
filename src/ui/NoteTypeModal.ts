/** Explicit tag-backed selector draft. Native forms own focus/mobile scrolling; the shared
 * tag writer owns one atomic selector/membership change and incremental metadata observation. */
import {type TFile, type TextComponent, type ButtonComponent, type ToggleComponent} from "obsidian";
import {formActions, iconButton, FormSetting as Setting} from "../adapters/obsidian/KplexModal";
import {noteTypeSelection, noteTypeAsTag, NoteTypeChangedError} from "../adapters/obsidian/tagNoteType";
import {hasYamlTagMembership} from "../adapters/obsidian/tagMembership";
import {SavedRelationshipPendingError} from "../adapters/obsidian/relationshipMetadataWrite";
import {parseBodyMetadataCooperative} from "../index/fieldParser";
import {normalizeFieldName} from "../core/contracts/fieldName";
import {StyleEditorModal} from "./StyleEditorModal";
import {TagNameSuggest} from "./TagNameSuggest";
import type KplexPlugin from "../main";

export class NoteTypeModal extends StyleEditorModal {
  private readonly field: string;
  private readonly path: string;
  private readonly opening;
  private readonly stamp;
  private readonly oldTag: string | null;
  private readonly oldInYaml: boolean;
  private value: string;
  private removeOld = false;
  private input?: TextComponent;
  private saveButton?: ButtonComponent;
  private removal?: Setting;
  private removalToggle?: ToggleComponent;
  private clearReady = false;
  private inspectionLive = false;
  private suggestion?: TagNameSuggest;
  private validation?: HTMLElement;

  /** Capture the native incarnation and selector; later choices cannot retarget another note or field. */
  constructor(private readonly plugin: KplexPlugin, private readonly file: TFile, currentValue: string | null, private onClosed?: () => void) {
    super(plugin.app);this.field = plugin.settings.noteTypeField;this.path = file.path;
    const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    this.opening = noteTypeSelection(fm ?? {}, this.field);this.stamp = {mtime: file.stat.mtime, size: file.stat.size};
    this.oldTag = noteTypeAsTag(this.opening.value);this.oldInYaml = !!fm && !!this.oldTag && hasYamlTagMembership(fm, this.oldTag);
    this.value = this.opening.value ?? currentValue ?? "";
  }

  /** Mount a detached draft and inspect inline fallback only for this explicitly opened physical note. */
  onOpen(): void {
    this.beginEditor();this.inspectionLive = true;const t = this.plugin.translator;this.titleEl.setText(t("noteType.title"));
    const names = new Set<string>();for (const page of this.plugin.index.allPages()) for (const tag of [...page.tags, ...(page.noteType ? [page.noteType] : [])]) if (noteTypeAsTag(tag)) names.add(tag.replace(/^#/, ""));
    new Setting(this.contentEl).setName(t("noteType.tag")).addText(input => {
      this.input = input;input.setValue(this.value).setPlaceholder(t("noteType.placeholder")).onChange(value => {this.value = value;this.removeOld = false;this.refresh();});
      this.suggestion = new TagNameSuggest(this.app, input.inputEl, [...names].sort());
    });
    this.contentEl.createEl("p", {text: t("noteType.tagHelp"), cls: "setting-item-description"});
    this.validation = this.contentEl.createEl("p", {cls: "setting-item-description", attr: {role: "status", "aria-live": "polite"}});
    this.removal = new Setting(this.contentEl).setName(t("noteType.removeOld", {tag: `#${this.oldTag ?? ""}`})).setDesc(t("noteType.keepBodyTags"))
      .addToggle(toggle => {this.removalToggle = toggle;toggle.onChange(value => {this.removeOld = value;});});
    const inspection = this.contentEl.createEl("p", {text: t("noteType.inspectInline"), cls: "setting-item-description", attr: {role: "status"}});
    formActions(this.contentEl)
      .addButton(button => iconButton(button, t("common.clear"), "eraser").onClick(() => {if (this.canEdit()) {this.value = "";this.input?.setValue("");this.removeOld = false;this.refresh();}}))
      .addButton(button => iconButton(button, t("common.cancel"), "x").onClick(() => this.close()))
      .addButton(button => {this.saveButton = iconButton(button, t("common.save"), "save").setCta().onClick(() => this.submit());});
    this.refresh();if (this.input) this.focusAfterAttachment(this.input.inputEl);
    void this.inspectInline().then(values => {
      if (!this.inspectionLive) return;this.clearReady = values !== null;
      inspection.setText(values === null ? t("noteType.inlineUnknown") : values.length ? t("noteType.inlineFallback", {value: values.join(", ")}) : "");if (this.canEdit()) this.refresh();
    });
  }

  /** Bounded canonical parsing detects actual inline selectors, excluding fenced examples; never rewrites body text. */
  private async inspectInline(): Promise<string[] | null> {
    if (this.file.stat.size > 2 * 1024 * 1024) return null;
    try {
      const text = await this.app.vault.cachedRead(this.file);
      if (!this.inspectionLive || text.length > 2 * 1024 * 1024 || this.file.stat.mtime !== this.stamp.mtime || this.file.stat.size !== this.stamp.size) return null;
      const body = await parseBodyMetadataCooperative(text, () => this.inspectionLive);
      if (this.file.path !== this.path || this.file.stat.mtime !== this.stamp.mtime || this.file.stat.size !== this.stamp.size || this.app.vault.getFileByPath(this.path) !== this.file) return null;
      return (body.inlineFields[normalizeFieldName(this.field)] ?? []).map(String);
    } catch {return null;}
  }

  /** Invalid nonempty tags stay visible for correction; Clear cannot hide an uninspected inline fallback. */
  private refresh(): void {
    const tag = noteTypeAsTag(this.value), clearing = !this.value.trim();
    this.removal?.settingEl.toggle(this.oldInYaml && (clearing || tag?.toLocaleLowerCase() !== this.oldTag?.toLocaleLowerCase()));
    this.removalToggle?.setValue(this.removeOld);
    this.saveButton?.setDisabled(!this.opening.supported || (clearing ? !this.clearReady : !tag));
    this.input?.inputEl.setAttribute("aria-invalid", String(!clearing && !tag));
    this.validation?.setText(!this.opening.supported ? this.plugin.translator("tagAssignment.invalid") : !clearing && !tag ? this.plugin.translator("noteType.invalidTag") : "");
  }

  /** Accept once through the same native queue as drops; a saved/pending observation is never retried as unsaved. */
  private submit(): void {
    if (!this.canEdit() || this.saveButton?.buttonEl.disabled) return;
    this.runOperation(async current => {
      try {await this.plugin.editNoteType(this.file, this.field, this.opening, this.value.trim() ? this.value : null, this.removeOld, current, this.stamp);return {refreshPending: false};}
      catch (error) {if (error instanceof SavedRelationshipPendingError) return {refreshPending: true};if (error instanceof NoteTypeChangedError) throw new Error(this.plugin.translator("noteType.changed"));throw error;}
    });
  }

  /** An inline inspection finishing during a rejected save still enables the correct recoverable Clear draft. */
  protected onOperationRejected(): void {this.refresh();}

  /** Retire native suggestions and release the originating action session once, including plugin unload. */
  onClose(): void {this.inspectionLive = false;super.onClose();this.suggestion?.close();this.contentEl.empty();const closed = this.onClosed;this.onClosed = undefined;closed?.();}
}
