/**
 * Native Obsidian dialog for renaming a real note through the Vault API. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { Modal, Notice, Setting, type TFile, normalizePath } from "obsidian";
import type ExcaliBrainPlugin from "../main";

function fileSuffix(file: TFile): string {
  if (file.name.toLocaleLowerCase().endsWith(".excalidraw.md")) return ".excalidraw.md";
  return file.extension ? `.${file.extension}` : "";
}

function editableStem(file: TFile, suffix: string): string {
  return suffix && file.name.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())
    ? file.name.slice(0, -suffix.length)
    : file.basename;
}

export class RenameNoteModal extends Modal {
  constructor(private plugin: ExcaliBrainPlugin, private file: TFile) {
    super(plugin.app);
  }

  /** Render the real-note rename form with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.plugin.translator("rename.title"));
    this.modalEl.addClass("kplex-rename-note-modal");
    const suffix = fileSuffix(this.file);
    let value = editableStem(this.file, suffix);
    let input: HTMLInputElement | null = null;

    const rename = async () => {
      let stem = value.trim();
      if (suffix && stem.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())) {
        stem = stem.slice(0, -suffix.length).trim();
      }
      if (!stem) {
        new Notice(this.plugin.translator("note.validation.enter"), 1800);
        input?.focus();
        return;
      }
      if (/[\\/]/.test(stem)) {
        new Notice(this.plugin.translator("rename.folderSeparators"), 2600);
        input?.focus();
        return;
      }

      const folder = this.file.parent?.path && this.file.parent.path !== "/" ? this.file.parent.path : "";
      const newPath = normalizePath(folder ? `${folder}/${stem}${suffix}` : `${stem}${suffix}`);
      if (newPath === this.file.path) {
        this.close();
        return;
      }
      if (this.plugin.app.vault.getAbstractFileByPath(newPath)) {
        new Notice(this.plugin.translator("file.existsAt", { path: newPath }), 3000);
        input?.focus();
        return;
      }

      try {
        await this.plugin.app.fileManager.renameFile(this.file, newPath);
        this.close();
      } catch (error) {
        new Notice(this.plugin.translator("rename.failed", { error: error instanceof Error ? error.message : String(error) }), 5000);
      }
    };

    const nameSetting = new Setting(this.contentEl)
      .setName(this.plugin.translator("common.name"))
      .addText((text) => {
        input = text.inputEl;
        text.setValue(value).setPlaceholder(this.plugin.translator("rename.placeholder")).onChange((next) => { value = next; });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          void rename();
        });
        window.setTimeout(() => {
          text.inputEl.focus();
          text.inputEl.select();
        }, 0);
      });
    nameSetting.settingEl.addClass("kplex-rename-note-name-setting");

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(this.plugin.translator("common.rename")).setCta().onClick(() => void rename()))
      .addButton((button) => button.setButtonText(this.plugin.translator("common.cancel")).onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
