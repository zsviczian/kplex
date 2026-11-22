/** Native common-property configuration reuses the type-property draft editor and serialized
 * settings capability. Opening and Cancel never write settings or document properties. */
import type {App} from "obsidian";
import {formActions, iconButton} from "../adapters/obsidian/KplexModal";
import type {NodeProperty} from "../core/plex/nodeProperties";
import {NodeDetailsFields, type NodeDetailsOptions} from "./NodeDetailsFields";
import {StyleEditorModal} from "./StyleEditorModal";

export class CommonNodePropertiesModal extends StyleEditorModal {
  private details?: NodeDetailsFields;

  /** The caller captures one settings opening; the callback alone owns compare-and-swap persistence. */
  constructor(app: App, private readonly options: NodeDetailsOptions,
    private readonly save: (rows: readonly NodeProperty[], current: () => boolean) => Promise<boolean>, private readonly closed: () => void) {super(app);}

  /** The shared native shell owns focus/scroll/mobile sizing and excludes repeated submission. */
  onOpen(): void {
    this.beginEditor();this.titleEl.setText(this.translate("nodeProperties.commonTitle"));
    this.details = new NodeDetailsFields(this.contentEl, this.translate, {...this.options, common: true}, /** Common rows do not borrow a note type. */ () => "", /** Retired or submitting forms cannot change drafts. */ () => this.canEdit());
    formActions(this.contentEl).addButton(/** Share the native icon footer and exclude double submission. */ button => iconButton(button, this.translate("common.save"), "check").setCta().onClick(/** The complete draft crosses one atomic queued settings operation. */ () => {
      this.runOperation(/** Capture validity within this exact connected editor lifetime. */ async current => {
        const rows = this.details!.read();
        if (!await this.save(rows, current)) throw new Error(this.translate("nodeProperties.changed"));
        return {refreshPending: false};
      });
    }));
    const first = this.details.element.querySelector<HTMLElement>("input, button");if (first) this.focusAfterAttachment(first);
  }

  /** Retire suggestions and asynchronous draft ownership before the native document disappears. */
  onClose(): void {this.details?.dispose();this.details = undefined;super.onClose();this.contentEl.empty();this.closed();}
}
