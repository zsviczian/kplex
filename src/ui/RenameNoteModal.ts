/**
 * Native Obsidian dialog for renaming a physical file or folder. This shell owns localized controls, validation feedback and close cleanup.
 */
import {formActions, iconButton, FormSetting as Setting, KplexModal as Modal} from "../adapters/obsidian/KplexModal";


import {Notice, type TFile, type TFolder, normalizePath} from "obsidian";
import type KplexPlugin from "../main";
import {captureFolderRename, isFolderRenameCurrent, renameDisplayField, renameFolder, renameNoteWithDisplayName, validFolderRenameName} from "../adapters/obsidian/renameNote";

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
  /** Capture the native target and optional originating-surface lifetime. */
  constructor(private plugin: KplexPlugin, private target: TFile | TFolder, private invocation: { current?: () => boolean; onClosed?: () => void } = {}) {
    super(plugin.app);
  }

  /** Render the shared rename form with note-only display property controls. */
  onOpen(): void {
    this.opened = true;
    const file = "children" in this.target ? null : this.target;
    const folder = "children" in this.target ? captureFolderRename(this.plugin.app, this.target) : null;
    const t = this.plugin.translator;
    this.titleEl.setText(t(file ? "rename.title" : "rename.folderTitle"));
    this.modalEl.addClass("kplex-rename-note-modal");
    const suffix = file ? fileSuffix(file) : "";
    let value = file ? editableStem(file, suffix) : this.target.name;
    let input: HTMLInputElement | null = null;
    const displayField = file ? renameDisplayField(this.plugin.app, file, this.plugin.settings.nameFields) : null;
    let updateDisplayName = displayField !== null;
    const unavailableKey = file ? "addRelated.endpointChanged" : "rename.folderChanged";
    const unavailable = () => new Error(t(unavailableKey));

    /** Revalidate native identity and serialize submissions while native I/O is in flight. */
    const rename = async (): Promise<void> => {
      if (!this.opened || this.busy) return;
      const app = this.plugin.app;
      const current = file ? app.vault.getFileByPath(file.path) === file : folder && isFolderRenameCurrent(app, folder);
      if (this.invocation.current?.() === false || !current) {
        new Notice(t(unavailableKey)); return;
      }
      let stem = value.trim();
      if (suffix && stem.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())) {
        stem = stem.slice(0, -suffix.length).trim();
      }
      if (!file && !validFolderRenameName(stem)) {
        new Notice(t("rename.invalidFolderName"), 2600);
        input?.focus();
        return;
      }
      if (!stem) {
        new Notice(t("note.validation.enter"), 1800);
        input?.focus();
        return;
      }
      if (/[\\/]/.test(stem)) {
        new Notice(t("rename.folderSeparators"), 2600);
        input?.focus();
        return;
      }

      const parentPath = folder?.parentPath ?? file?.parent?.path;
      const newPath = normalizePath(parentPath && parentPath !== "/" ? `${parentPath}/${stem}${suffix}` : `${stem}${suffix}`);
      if (newPath !== this.target.path && app.vault.getAbstractFileByPath(newPath)) {
        new Notice(file ? t("file.existsAt", { path: newPath }) : t("moveNode.conflict"), 3000);
        input?.focus();
        return;
      }

      this.busy = true;
      try {
        if (file) await renameNoteWithDisplayName(app, file, newPath, stem, updateDisplayName ? displayField : null, unavailable);
        else if (folder) await renameFolder(app, folder, newPath, unavailable);
        this.close();
      } catch (error) {
        new Notice(t(file ? "rename.failed" : "rename.folderFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
      } finally { this.busy = false; }
    };

    const nameSetting = new Setting(this.contentEl)
      .setName(this.plugin.translator("common.name"))
      .addText((text) => {
        input = text.inputEl;
        text.setValue(value).setPlaceholder(t(file ? "rename.placeholder" : "rename.folderPlaceholder")).onChange((next) => { value = next; });
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

    if (displayField) new Setting(this.contentEl)
      .setName(this.plugin.translator("rename.updateDisplayName", {property: displayField}))
      .setDesc(this.plugin.translator("rename.updateDisplayNameHelp"))
      .addToggle(/** Each invocation owns its opt-out; opening the form writes no settings or metadata. */ toggle =>
        toggle.setValue(updateDisplayName).onChange(value => {updateDisplayName = value;}));

    formActions(this.contentEl)
      .addButton((button) => iconButton(button,this.plugin.translator("common.rename"),"pencil").setCta().onClick(() => void rename()))
      .addButton((button) => iconButton(button, this.plugin.translator("common.cancel"), "x").onClick(() => this.close()));
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
