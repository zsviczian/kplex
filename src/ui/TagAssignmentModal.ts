/** One native assignment/convert form shared by scene, saved-list and external tag drops. */
import { Modal, Setting, type App, type ButtonComponent } from "obsidian";
import type { Translator } from "../lang";
import { NoteTypeChangedError, type NoteTypeSelection, type TagAssignment, type NoteTypeConflictChoice } from "../adapters/obsidian/tagNoteType";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";

export class TagAssignmentModal extends Modal {
  private opened = false;
  private pending = false;
  private assignment: TagAssignment;
  private conflict: NoteTypeConflictChoice | undefined;
  private selectedType: NoteTypeSelection;

  /** Values are drafts until one explicit submit; source ownership is rechecked by the shared queue. */
  constructor(app: App, private readonly options: Readonly<{
    tag: string; name: string; field: string; selection: NoteTypeSelection;
    initial?: TagAssignment; convert?: boolean; translate: Translator; current: () => boolean;
    save: (assignment: TagAssignment, selection: NoteTypeSelection, conflict: NoteTypeConflictChoice | undefined, current: () => boolean) => Promise<void>;
    retired: () => void;
  }>) { super(app); this.assignment = options.initial ?? "tag"; this.selectedType = options.selection; }

  onOpen(): void { this.opened = true; this.modalEl.addClass("kplex-tag-assignment-modal"); this.render(); }

  /** A changed current type is displayed before the user can approve a new replacement decision. */
  private render(message?: string): void {
    const {translate: t, tag, name} = this.options;
    this.contentEl.empty(); this.setTitle(t("tagAssignment.title", {tag: `#${tag}`, name}));
    if (!this.options.convert) new Setting(this.contentEl).setName(t("tagAssignment.as"))
      .addDropdown(dropdown => {dropdown.selectEl.setAttribute("aria-label", t("tagAssignment.as")); dropdown.addOptions({tag: t("tagAssignment.tag"), "note-type": t("tagAssignment.noteType")}).setValue(this.assignment)
        .onChange(value => {if (!this.pending) {this.assignment = value === "note-type" ? "note-type" : "tag"; this.conflict = undefined; this.render();}});});
    const conflict = this.assignment === "note-type" && this.selectedType.value !== null && this.selectedType.value.toLocaleLowerCase() !== tag.toLocaleLowerCase();
    this.contentEl.createEl("p", {text: this.assignment === "note-type" ? t("tagAssignment.typeHelp", {field: this.options.field}) : t("tagAssignment.tagHelp")});
    let saveButton: ButtonComponent | undefined;
    if (conflict) new Setting(this.contentEl).setName(t("tagAssignment.current", {name: this.selectedType.value!}))
      .addDropdown(dropdown => {dropdown.selectEl.setAttribute("aria-label", t("tagAssignment.choose")); dropdown.addOptions({choose: t("tagAssignment.choose"), replace: t("tagAssignment.replace"), keep: t("tagAssignment.keep")})
        .setValue(this.conflict ?? "choose").onChange(value => {this.conflict = value === "replace" || value === "keep" ? value : undefined; saveButton?.setDisabled(!this.conflict);});});
    if (message) this.contentEl.createEl("p", {cls: "mod-warning", text: message, attr: {role: "alert"}});
    const unavailable = this.assignment === "note-type" && !this.selectedType.supported;
    if (unavailable) this.contentEl.createEl("p", {cls: "mod-warning", text: t("tagAssignment.invalid")});
    new Setting(this.contentEl)
      .addButton(button => button.setButtonText(t("common.cancel")).onClick(() => {if (!this.pending) this.close();}))
      .addButton(button => {saveButton = button; button.setButtonText(t(this.options.convert ? "tagAssignment.change" : "tagAssignment.add")).setCta()
        .setDisabled(unavailable || conflict && !this.conflict).onClick(() => {void this.submit();});});
  }

  private async submit(): Promise<void> {
    if (!this.opened || this.pending || !this.options.current()) return;
    this.pending = true;
    const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input,select,button"));
    controls.forEach(control => {control.disabled = true;});
    const current = (): boolean => this.opened && this.options.current();
    try { await this.options.save(this.assignment, this.selectedType, this.conflict, current); if (this.opened) this.close(); }
    catch (error) {
      if (!current()) return;
      if (error instanceof SavedRelationshipPendingError) {this.close(); return;}
      if (error instanceof NoteTypeChangedError) {this.selectedType = error.selection; this.conflict = undefined;}
      this.pending = false;
      this.render(error instanceof NoteTypeChangedError ? this.options.translate("tagAssignment.changed") : error instanceof Error ? error.message : String(error));
    }
  }

  /** Closing fences unsubmitted work; an accepted FileManager write retains its native lifetime. */
  onClose(): void {this.opened = false; this.contentEl.empty(); this.options.retired();}
}
