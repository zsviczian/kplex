/**
 * Focused native confirmation for removing one property-to-target declaration. The parent details
 * session owns authorization and mutation; this shell only reports an explicit confirm or cancel,
 * once, and discloses repeated-reference removal without promising whole-file formatting or undo.
 */
import { Modal, Setting, type App } from "obsidian";
import type { Translator } from "../lang";

export class RemoveRelationshipSourceModal extends Modal {
  private decided = false;

  /** Capture display coordinates and one decision callback without acquiring vault mutation capabilities. */
  constructor(app: App, private readonly translate: Translator,
    private readonly source: { note: string; field: string; target: string },
    private readonly onDecision: (confirmed: boolean) => void) { super(app); }

  /** Show a native destructive confirmation naming the exact note, property and target. */
  onOpen(): void {
    this.titleEl.setText(this.translate("explain.removeRelationship"));
    this.modalEl.addClass("kplex-remove-relationship-source-modal");
    this.contentEl.createEl("p", { text: this.translate("explain.removeConfirm", this.source) });
    this.contentEl.createEl("p", { text: this.translate("explain.removeScope") });
    new Setting(this.contentEl)
      .addButton(/** Native close and explicit Cancel both leave the source untouched. */ button => button
        .setButtonText(this.translate("common.cancel")).onClick(/** Cancelling has no mutation capability. */ () => this.close()))
      .addButton(/** Only explicit approval can resume the parent's fresh authorization path. */ button => {
        button.buttonEl.dataset.kplexConfirmRemove = "true";
        button.setButtonText(this.translate("explain.removeRelationship")).setDestructive()
          .onClick(/** Coalesce repeated activation and settle approval only once. */ () => {
            if (this.decided) return;
            this.decided = true;
            this.close();
            this.onDecision(true);
          });
      });
  }

  /** Native Escape, outside dismissal and parent disposal settle cancellation exactly once. */
  onClose(): void {
    this.contentEl.empty();
    if (this.decided) return;
    this.decided = true;
    this.onDecision(false);
  }
}
