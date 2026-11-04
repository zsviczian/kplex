/** Native destination selection for any real file/folder. Final mutation delegates to the shared
 * physical move owner, which uses FileManager.renameFile so Obsidian maintains links. */
import {FormSetting as Setting, KplexModal as Modal, formActions, formField, labelIconButton} from "../adapters/obsidian/KplexModal";

import {Notice, type App, type ButtonComponent, type TAbstractFile, type TFolder} from "obsidian";
import {createElement} from "react";
import {createRoot, type Root} from "react-dom/client";
import type {Translator} from "../lang";
import {prepareNativeMove, commitPhysicalMove} from "../adapters/obsidian/physicalNodeMove";

import {FolderPathInput} from "./FolderPathInput";

export class MoveNodeModal extends Modal {
  private opened = false;
  private busy = false;
  private destination: TFolder | null = null;
  private destinationPath = "";
  private releaseWindow: (() => void) | null = null;
  private renderPicker: (() => void) | null = null;
  private root: Root | null = null;
  private button: ButtonComponent | null = null;
  private feedback: HTMLElement | null = null;
  private releaseMigration: (() => void) | null = null;
  private readonly sourcePath: string;

  /** Consent retains the exact source path and originating native canvas. */
  constructor(app: App, private readonly source: TAbstractFile, private readonly t: Translator,
    private readonly current: () => boolean, private readonly retired: () => void, private readonly owner: HTMLElement) {super(app); this.sourcePath = source.path;}

  /** A collision, ancestry change, rename or replacement invalidates the displayed move. */
  private async submit(): Promise<void> {
    if (!this.opened || this.busy || !this.current()) return;
    if (this.source.path !== this.sourcePath || !this.destination || this.destination.path !== this.destinationPath) {this.feedback?.setText(this.t("moveNode.changed")); return;}
    const prepared = prepareNativeMove(this.app, this.source, this.destination);
    if (!prepared.ok) {this.feedback?.setText(this.t(`moveNode.${prepared.reason}`)); return;}
    this.busy = true; this.button?.setDisabled(true); this.renderPicker?.();
    try {
      const result = await commitPhysicalMove(this.app, prepared.plan);
      if (!this.opened || !this.current()) return;
      if (result.ok) {if (result.warning) new Notice(this.t("moveNode.movedWarning")); this.close();} else this.feedback?.setText(this.t(`moveNode.${result.reason}`));
    } catch (error) {if (this.opened && this.current()) this.feedback?.setText(error instanceof Error ? error.message : this.t("folderActions.failed"));}
    finally {this.busy = false; if (this.opened) {this.button?.setDisabled(false); this.renderPicker?.();}}
  }

  /** One picker and one explicit Move avoid exposing relocation in creation gestures. */
  onOpen(): void {
    this.opened = true; this.setTitle(this.t("moveNode.title", {name: this.source.name}));
    this.contentEl.createEl("p", {text: this.sourcePath, cls: "setting-item-description"});
    const folders = this.app.vault.getAllFolders(true);
    let path = this.source.parent?.path ?? "/"; this.destination = this.source.parent; this.destinationPath = path;
    const row = formField(new Setting(this.contentEl).setName(this.t("folderPicker.label")));
    this.root = createRoot(row.controlEl.createDiv());
    /** Controlled typing keeps native folder identity separate from path text. */
    const render = (): void => this.root?.render(createElement(FolderPathInput, {value: path, folders: folders.map(/** Offer existing destinations only. */ f => f.path), translate: this.t, disabled: this.busy,
      onChange: /** Selecting after a replacement captures its new identity explicitly. */ value => {if (this.busy) return; path = value; this.destinationPath = value; this.destination = folders.find(f => f.path === value) ?? null; render();}}));
    this.renderPicker = render; render(); this.feedback = this.contentEl.createDiv({attr: {role: "status"}});
    formActions(this.contentEl)
      .addButton(/** Cancel preserves all files and links. */ b => {labelIconButton(b.buttonEl, this.t("common.cancel"), "x"); b.onClick(/** Retire the draft only. */ () => this.close());})
      .addButton(/** Move commits through the canonical native adapter. */ b => {this.button = b; labelIconButton(b.buttonEl, this.t("moveNode.move"), "folder-input"); b.setCta().onClick(/** Serialize native mutation acceptance. */ () => {void this.submit();});});
    const owner = this.contentEl.ownerDocument.defaultView, close = /** Native realm teardown retires the destination draft. */ (): void => this.close();
    owner?.addEventListener("pagehide", close, {once: true}); this.releaseWindow = /** Release only this move dialog's subscription. */ () => owner?.removeEventListener("pagehide", close);
    this.releaseMigration = this.owner.onWindowMigrated?.(/** Migration revokes unaccepted path consent. */ () => this.close()) ?? null;
  }

  /** The plugin retires this exact shell on unload; a committed move is never replayed. */
  onClose(): void {this.opened = false; this.releaseWindow?.(); this.releaseWindow = null; this.releaseMigration?.(); this.releaseMigration = null; this.root?.unmount(); this.root = null; this.renderPicker = null; this.contentEl.empty(); this.retired();}
}
