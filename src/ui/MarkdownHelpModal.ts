/** Reusable native read-only Markdown help surface. The invoking canvas owns the dialog;
 * native modal/Component lifetimes fence async rendering, close, window migration and Edit.
 * Opening never saves settings, acquires a source or changes navigation/editor attention. */
import {iconButton, FormSetting as Setting} from "../adapters/obsidian/KplexModal";

import {type App} from "obsidian";
import {StyleEditorModal} from "./StyleEditorModal";
import {NativeMarkdownHelp} from "./NativeMarkdownHelp";

export class MarkdownHelpModal extends StyleEditorModal {
  private renderer: NativeMarkdownHelp | null = null;
  /** Source/name and Edit belong to one captured target, not the active leaf at click time. */
  constructor(app: App, private readonly name: string, private readonly markdown: string, private readonly current: () => boolean,
    private readonly edit: (() => void) | null, private readonly closed: () => void) {super(app);}
  /** Render native headings/lists/code/links; standalone guidance already supplies its full title. */
  onOpen(): void {
    this.beginEditor();this.modalEl.addClass("kplex-markdown-help-modal");
    this.titleEl.setText(this.edit ? this.translate("view.helpFor", {name: this.name}) : this.name);
    const {body, actions} = this.scrollableContent();
    const row = new Setting(actions);
    row.addButton(/** Native close/Escape shares the same immediate render retirement. */ button => iconButton(button, this.translate("styles.operation.close"), "x").onClick(/** Explicit dismissal has no settings effect. */ () => this.close()));
    if (this.edit) row.addButton(/** Editable preset Help offers the existing captured editor; format guidance is read-only. */ button => button.setButtonText(this.translate("view.editHelp")).setDisabled(!this.current())
      .onClick(/** Retire this renderer before transferring to the existing captured settings editor. */ () => {if (this.canEdit() && this.current() && this.edit) {this.close();this.edit();}}));
    if (!this.markdown.trim()) {body.createDiv({cls: "setting-item-description", text: this.translate("view.emptyHelp")});return;}
    this.renderer = new NativeMarkdownHelp(this.app, body);
    void this.renderer.render(this.markdown, /** Late rendering cannot borrow a changed preset/canvas. */ () => this.canEdit() && this.current())
      .then(/** A changed target receives local feedback without a generic settings notice. */ rendered => {
        if (!rendered && this.canEdit()) {body.empty();body.createDiv({text: this.translate("view.unavailable")});}
      })
      .catch(/** Render failure is local, actionable and never triggers a source/configuration fallback. */ error => {
        console.error("K-Plex Markdown help was not rendered", error);if (this.canEdit()) {body.empty();body.createDiv({text: this.translate("view.invalidHelp")});}
      });
  }
  /** Unload the native renderer before clearing the modal and releasing the invoking surface. */
  onClose(): void {super.onClose();this.renderer?.dispose();this.renderer = null;this.contentEl.empty();this.closed();}
}
