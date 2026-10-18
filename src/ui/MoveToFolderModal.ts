/** Native confirmation for one captured physical move. FileManager owns link updates and rename events. */
import { Modal, Notice, Setting, type App, type ButtonComponent } from "obsidian";
import type { Translator } from "../lang";
import { revalidatePhysicalMove, type PhysicalMovePlan } from "../adapters/obsidian/physicalNodeMove";

export class MoveToFolderModal extends Modal {
  private opened = false;
  private pending = false;
  private buttons: ButtonComponent[] = [];
  private feedback: HTMLElement | null = null;

  /** Capture identities before the confirmation takes focus; closing never reverses an accepted move. */
  constructor(app: App, private readonly plan: PhysicalMovePlan, private readonly translate: Translator,
    private readonly current: () => boolean, private readonly retired: () => void) { super(app); }

  /** Render the actual source/destination and keep the destructive operation behind explicit consent. */
  onOpen(): void {
    this.opened = true;
    this.setTitle(this.translate("moveNode.title", { name: this.plan.source.name }));
    this.contentEl.createEl("p", { text: this.translate("moveNode.description", { source: this.plan.sourcePath, destination: this.plan.destination }) });
    this.feedback = this.contentEl.createEl("p", { cls: "mod-warning", attr: { "role": "alert" } });
    new Setting(this.contentEl)
      .addButton(/** Cancel has no vault effects. */ button => { this.buttons.push(button); button.setButtonText(this.translate("common.cancel")).onClick(/** Close only this confirmation. */ () => this.close()); })
      .addButton(/** A native CTA owns the single submit operation. */ button => { this.buttons.push(button); button.setButtonText(this.translate("moveNode.move")).setCta().onClick(/** Observe asynchronous native failure inside this shell. */ () => { void this.submit(); }); });
  }

  /** Recheck exact incarnations, names and collisions immediately before the native operation. */
  private async submit(): Promise<void> {
    if (!this.opened || this.pending || !this.current()) return;
    const prepared = revalidatePhysicalMove(this.app, this.plan);
    if (!prepared.ok) { if (this.feedback) this.feedback.textContent = this.translate(`moveNode.${prepared.reason}`); return; }
    this.pending = true;
    for (const button of this.buttons) button.setDisabled(true);
    try {
      await this.app.fileManager.renameFile(this.plan.source, this.plan.destination);
      this.close();
    } catch (error) {
      // A host may finish the rename before reporting a subsequent link-update failure. Never retry it.
      const moved = this.plan.source.path === this.plan.destination && this.app.vault.getAbstractFileByPath(this.plan.destination) === this.plan.source;
      if (moved) {
        if (this.current()) new Notice(this.translate("moveNode.movedWarning"));
        this.close();
      } else if (this.opened && this.current()) {
        if (this.feedback) this.feedback.textContent = this.translate("moveNode.failed", { error: error instanceof Error ? error.message : String(error) });
        this.pending = false;
        for (const button of this.buttons) button.setDisabled(false);
      }
    }
  }

  /** Retire UI completions even when a native operation accepted before close is still running. */
  onClose(): void { this.opened = false; this.contentEl.empty(); this.buttons = []; this.feedback = null; this.retired(); }
}
