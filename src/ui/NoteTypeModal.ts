/**
 * Native Obsidian dialog for editing the note-type property. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { Modal, Setting, type TFile } from "obsidian";
import type KplexPlugin from "../main";

export class NoteTypeModal extends Modal {
  constructor(private plugin: KplexPlugin, private file: TFile, private currentValue: string | null) { super(plugin.app); }

  /** Render the note-type property editor with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.plugin.translator("noteType.title"));
    let value = this.currentValue ?? "";
    const known = new Set<string>();
    for (const page of this.plugin.index.allPages()) if (page.noteType) known.add(page.noteType);
    Object.keys(this.plugin.settings.noteTypeStyles).forEach((item) => known.add(item));
    const listId = `kplex-note-types-${Math.random().toString(36).slice(2)}`;
    new Setting(this.contentEl).setName(this.plugin.settings.noteTypeField).addText((text) => {
      text.setValue(value).setPlaceholder(this.plugin.translator("noteType.placeholder")).onChange((next) => { value = next.trim(); });
      text.inputEl.setAttr("list", listId);
    });
    const datalist = this.contentEl.createEl("datalist", { attr: { id: listId } });
    [...known].sort().forEach((item) => datalist.createEl("option", { attr: { value: item } }));
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(this.plugin.translator("common.save")).setCta().onClick(() => void this.save(value)))
      .addButton((button) => button.setButtonText(this.plugin.translator("common.clear")).onClick(() => void this.save("")))
      .addButton((button) => button.setButtonText(this.plugin.translator("common.cancel")).onClick(() => this.close()));
  }

  private async save(value: string): Promise<void> {
    const key = this.plugin.settings.noteTypeField;
    await this.plugin.app.fileManager.processFrontMatter(this.file, (fm: Record<string, unknown>) => {
      if (value) fm[key] = value;
      else delete fm[key];
    });
    await this.plugin.rebuildIndex(false, true, "note-type");
    this.close();
  }

  onClose(): void { this.contentEl.empty(); }
}
