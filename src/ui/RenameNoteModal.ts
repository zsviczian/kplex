/**
 * Native Obsidian dialog for renaming a real note through the Vault API. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { Modal, Notice, Setting, type TFile, normalizePath } from "obsidian";
import type KplexPlugin from "../main";

/** Preserve compound Excalidraw suffixes while exposing only the editable filename stem. */
function fileSuffix(file: TFile): string {
  if (file.name.toLocaleLowerCase().endsWith(".excalidraw.md")) return ".excalidraw.md";
  return file.extension ? `.${file.extension}` : "";
}

/** Remove only the real suffix, preserving the canonical filename and its extension. */
function editableStem(file: TFile, suffix: string): string {
  return suffix && file.name.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())
    ? file.name.slice(0, -suffix.length)
    : file.basename;
}

export class RenameNoteModal extends Modal {
  private opened = false;
  private busy = false;
  private focusTimer: { owner: Window; id: number } | null = null;
  /** Capture the real file and optional originating-surface lifetime without changing existing callers. */
  constructor(private plugin: KplexPlugin, private file: TFile, private invocation: { current?: () => boolean; onClosed?: () => void } = {}) {
    super(plugin.app);
  }

  /** Render the real-note rename form with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.opened = true;
    this.titleEl.setText(this.plugin.translator("rename.title"));
    this.modalEl.addClass("kplex-rename-note-modal");
    const suffix = fileSuffix(this.file);
    let value = editableStem(this.file, suffix);
    let input: HTMLInputElement | null = null;

    /** Revalidate captured file identity and serialize submissions while native I/O is in flight. */
    const rename = async (): Promise<void> => {
      if (!this.opened || this.busy) return;
      if (this.invocation.current?.() === false || this.plugin.app.vault.getFileByPath(this.file.path) !== this.file) {
        new Notice(this.plugin.translator("addRelated.endpointChanged")); return;
      }
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

      this.busy = true;
      try {
        await this.plugin.app.fileManager.renameFile(this.file, newPath);
        this.close();
      } catch (error) {
        new Notice(this.plugin.translator("rename.failed", { error: error instanceof Error ? error.message : String(error) }), 5000);
      } finally { this.busy = false; }
    };

    const nameSetting = new Setting(this.contentEl)
      .setName(this.plugin.translator("common.name"))
      .addText((text) => {
        input = text.inputEl;
        text.setValue(value).setPlaceholder(this.plugin.translator("rename.placeholder")).onChange((next) => { value = next; });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" || event.isComposing || event.getModifierState("AltGraph")) return;
          event.preventDefault();
          if (!event.repeat) void rename();
        });
        const owner = text.inputEl.ownerDocument.defaultView ?? window;
        this.focusTimer = { owner, id: owner.setTimeout(/** Focus only while this originating modal is still current. */ () => {
          this.focusTimer = null;
          if (!this.opened || this.invocation.current?.() === false) return;
          text.inputEl.focus(); text.inputEl.select();
        }, 0) };
      });
    nameSetting.settingEl.addClass("kplex-rename-note-name-setting");

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(this.plugin.translator("common.rename")).setCta().onClick(() => void rename()))
      .addButton((button) => button.setButtonText(this.plugin.translator("common.cancel")).onClick(() => this.close()));
  }

  /** Release native focus work and the manager's exact rename session once on close/unmount. */
  onClose(): void {
    if (!this.opened) return;
    this.opened = false;
    if (this.focusTimer) this.focusTimer.owner.clearTimeout(this.focusTimer.id);
    this.focusTimer = null;
    this.invocation.onClosed?.();
    this.contentEl.empty();
  }
}
