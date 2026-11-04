/** Explicit native property preview/confirmation. Shared modal submission owns focus, pending
 * exclusion and truthful disk outcomes. It never writes bodies or chooses another canvas. */
import {formActions, iconButton, FormSetting as Setting} from "../adapters/obsidian/KplexModal";

import {type App} from "obsidian";
import {StyleEditorModal, type StyleCommitResult} from "./StyleEditorModal";
import type {PropertyFieldValue} from "../core/plex/views/propertyAssignment";
import type {Translator} from "../lang";

export type CanvasPropertyAssignmentModalOptions = Readonly<{
  sourceScope: HTMLElement; translate: Translator; note: string; field: string; category: string; undo?: boolean; unrelated?: boolean;
  before: PropertyFieldValue; after: PropertyFieldValue;
  commit: (current: () => boolean) => Promise<StyleCommitResult>;
  connect?: () => void; closed: () => void;
}>;

export class CanvasPropertyAssignmentModal extends StyleEditorModal {
  private failure: HTMLElement | null = null;
  /** Receive one captured native file/field plan from the shared action owner. */
  constructor(app: App, private readonly options: CanvasPropertyAssignmentModalOptions) {super(app);}
  /** Display literal current/proposed field values; none of these labels grants mutation authority. */
  onOpen(): void {
    const t = this.options.translate;this.beginEditor(this.options.sourceScope);
    const {body, actions} = this.scrollableContent();
    this.titleEl.setText(t(this.options.undo ? "assignment.undo" : "assignment.title"));
    body.createEl("p", {text: t("assignment.preview", {note: this.options.note, field: this.options.field, category: this.options.category})});
    const display = (value: PropertyFieldValue): string => value.present ? JSON.stringify(value.value) : t("assignment.absent");
    new Setting(body).setName(t("assignment.before")).setDesc(display(this.options.before));
    new Setting(body).setName(t("assignment.after")).setDesc(display(this.options.after));
    body.createEl("p", {text: t("assignment.sharedField")});
    this.failure = actions.createDiv({cls: "setting-item-description", attr: {role: "status", "aria-live": "polite"}});
    if (this.options.unrelated) body.createEl("p", {text: t("assignment.unrelated")});
    if (this.options.connect) formActions(actions).addButton(button => button.setButtonText(t("assignment.connectOnly")).onClick(() => {
      if (!this.canEdit()) return;this.close();this.options.connect?.();
    }));
    formActions(actions).addButton(button => iconButton(button, t("common.cancel"), "x").onClick(() => this.close()))
      .addButton(button => button.setButtonText(t(this.options.undo ? "assignment.undo" : "assignment.apply")).setCta()
        .onClick(() => {if (this.canEdit()) this.runOperation(this.options.commit);}));
  }
  /** Preserve the exact preview and explain the existing native-save/concurrency safeguards. */
  protected onOperationRejected(): void {this.failure?.setText(this.options.translate("assignment.retry"));}
  /** All dismissal paths release the exact action-owned modal reference. */
  onClose(): void {super.onClose();this.failure = null;this.contentEl.empty();this.options.closed();}
}
