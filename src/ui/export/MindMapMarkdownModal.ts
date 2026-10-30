/**
 * Captured Mind Map export dialog. The pure formatter owns exact Markdown bytes;
 * ClipboardSession owns gesture-safe copy, the native adapter owns system save/share
 * handoff, and the existing native editor shell retires dialogs on window migration.
 * No source note, canvas state, index or settings writer is exposed to this shell.
 */
import {Setting, type App, type ButtonComponent} from "obsidian";
import {StyleEditorModal, appendIcon} from "../StyleEditorModal";
import {ClipboardSession} from "../../application/ClipboardSession";
import {exportMindMapMarkdown, type MindMapMarkdownResult, type MindMapMarkdownSnapshot} from "../../core/plex/export/mindMapMarkdown";
import {markdownExportFilename, exportMarkdownFile, canExportMarkdownFile} from "../../adapters/obsidian/markdownExportFile";

export type MindMapMarkdownModalOptions = Readonly<{
  snapshot: MindMapMarkdownSnapshot; selected?: string; sourceScope: HTMLElement;
  current: () => boolean; closed: () => void;
}>;

/** Render one detached presentation with explicit whole-map/subtree scope, preview and native save/share. */
export class MindMapMarkdownModal extends StyleEditorModal {
  private result: MindMapMarkdownResult | null = null;
  private clipboard: ClipboardSession | null = null;
  private preview: HTMLTextAreaElement | null = null;
  private status: HTMLElement | null = null;
  private warningList: HTMLElement | null = null;
  private copyButton: ButtonComponent | null = null;
  private saveButton: ButtonComponent | null = null;
  private filename = "";
  private saving = false;

  /** Capture only immutable export data and its exact canvas lifetime. */
  constructor(app: App, private readonly options: MindMapMarkdownModalOptions) {super(app);}

  /** Native controls reuse the existing responsive modal body/footer and localized copy. */
  onOpen(): void {
    this.beginEditor(this.options.sourceScope);
    this.setTitle(this.translate("export.markdown.title"));
    this.modalEl.addClass("kplex-mindmap-markdown-export");
    const {body, actions} = this.scrollableContent();
    body.createEl("p", {text: this.translate("export.markdown.help")});
    const selected = this.options.selected;
    if (selected && selected !== this.options.snapshot.root) new Setting(body).setName(this.translate("export.markdown.scope"))
      .addDropdown(/** Scope changes only project the frozen snapshot; they never expand a branch. */ dropdown => dropdown
        .addOption(this.options.snapshot.root, this.translate("export.markdown.whole"))
        .addOption(selected, this.translate("export.markdown.branch"))
        .onChange(/** A different scope retires the previous immutable clipboard attempt. */ id => this.refresh(id)));
    this.warningList = body.createDiv({cls: "setting-item-description", attr: {role: "status"}});
    this.preview = body.createEl("textarea", {cls: "kplex-package-source", attr: {rows: "10", spellcheck: "false", "aria-label": this.translate("export.markdown.preview")}});
    this.preview.readOnly = true;
    this.status = body.createDiv({attr: {role: "status", "aria-live": "polite"}});
    new Setting(body).setName(this.translate("export.markdown.destination")).setDesc(this.translate("export.markdown.destinationHelp"))
      .addText(/** The system save/share UI selects the destination; this field supplies its suggested filename. */ text => {
        const rootLabel = this.options.snapshot.nodes.find(/** The captured root supplies only a suggested filename. */ node => node.id === this.options.snapshot.root)?.label ?? this.translate("view.mindmap");
        const stem = rootLabel.replace(/[\\/:*?"<>|#[\]\r\n]/g, " ").trim().slice(0, 100) || this.translate("view.mindmap");
        this.filename = `${stem} - ${this.translate("export.markdown.filename")}.md`;
        text.inputEl.maxLength = 200;
        text.setValue(this.filename).onChange(/** Editing a filename performs no native operation. */ value => {this.filename = value;this.clearStatus();});
      });
    new Setting(actions)
      .addButton(/** Copy starts synchronously in the native button handler. */ button => {this.copyButton = button;button.setButtonText(this.translate("export.markdown.copy")).onClick(/** Retain owning-document clipboard activation. */ () => this.copy());appendIcon(button.buttonEl, "copy");})
      .addButton(/** Save uses the same exact bytes shown in the read-only preview. */ button => {this.saveButton = button;button.setButtonText(this.translate("export.markdown.save")).setCta().onClick(/** Explicit output persistence never navigates the canvas. */ () => {void this.save();});appendIcon(button.buttonEl, "save");})
      .addButton(/** Dismissal releases the snapshot's clipboard completion owner. */ button => button.setButtonText(this.translate("common.cancel")).onClick(/** Existing migration/close cleanup remains the only retirement path. */ () => this.close()));
    this.refresh(this.options.snapshot.root);
  }

  /** Reformat only the captured hierarchy and disclose all compatibility/coverage qualifications. */
  private refresh(root: string): void {
    this.clipboard?.dispose();this.clipboard = null;this.clearStatus();this.warningList?.empty();
    try {
      this.result = exportMindMapMarkdown(this.options.snapshot, root);
      if (this.preview) this.preview.value = this.result.markdown;
      for (const key of ["unresolved", "adjusted", "references", "omitted", "partial", "collapsed"] as const) {
        if (this.result.warnings[key]) this.warningList?.createEl("p", {text: this.translate(`export.markdown.warning.${key}`)});
      }
      this.copyButton?.setDisabled(false);this.saveButton?.setDisabled(!canExportMarkdownFile(this.app));
      if (!canExportMarkdownFile(this.app)) this.status?.setText(this.translate("export.markdown.saveFailed"));
    } catch {
      this.result = null;this.status?.setText(this.translate("export.markdown.unavailable"));
      this.copyButton?.setDisabled(true);this.saveButton?.setDisabled(true);
    }
  }

  /** A changed filename or scope retires previous feedback. */
  private clearStatus(): void {
    this.status?.empty();
  }

  /** Retired or changed canvases keep their old preview but cannot publish it as a new current export. */
  private current(): boolean {return this.canEdit() && this.options.current() && this.modalEl.isConnected;}

  /** Use the modal's actual owning window and truthful asynchronous clipboard feedback. */
  private copy(): void {
    if (!this.current() || !this.result || this.saving) {this.status?.setText(this.translate("export.markdown.stale"));return;}
    this.clipboard?.dispose();
    const owner = this.modalEl.ownerDocument.defaultView;
    this.clipboard = new ClipboardSession(this.result.markdown, owner?.navigator.clipboard?.writeText ? /** Native clipboard ownership follows this modal's window. */ text => owner.navigator.clipboard.writeText(text) : null);
    this.clipboard.listen(/** Closing retires this listener before a late clipboard promise settles. */ state => {
      this.copyButton?.setDisabled(state === "copying");
      if (state === "copied" || state === "failed") this.status?.setText(this.translate(state === "copied" ? "export.markdown.copied" : "export.markdown.copyFailed"));
    });
    this.clipboard.copy();
  }

  /** Hand the exact preview bytes to Obsidian's native system save/share flow once per click. */
  private async save(): Promise<void> {
    if (!this.current() || !this.result || this.saving) {this.status?.setText(this.translate("export.markdown.stale"));return;}
    const filename = markdownExportFilename(this.filename);
    if (!filename) {this.status?.setText(this.translate("export.markdown.invalidPath"));return;}
    this.saving = true;
    const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button"));
    const disabled = controls.map(/** Restore pre-existing clipboard/validation state after handoff. */ control => control.disabled);
    for (const control of controls) control.disabled = true;
    try {
      await exportMarkdownFile(this.app, filename, this.result.markdown, /** A retired capture cannot begin another native handoff. */ () => this.current());
      if (this.current()) this.status?.setText(this.translate("export.markdown.saveHandedOff"));
    } catch {if (this.current()) this.status?.setText(this.translate("export.markdown.saveFailed"));}
    finally {
      this.saving = false;
      if (this.canEdit()) controls.forEach(/** A retired form never revives detached controls. */ (control, index) => {control.disabled = disabled[index];});
    }
  }

  /** Native dismissal, unmount and owning-window migration release every temporary callback. */
  onClose(): void {
    super.onClose();this.clipboard?.dispose();this.clipboard = null;this.result = null;
    this.contentEl.empty();this.options.closed();
  }
}
